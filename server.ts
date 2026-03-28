import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { Card, GameState, Player, Rank, Suit, ClientMessage, ServerMessage, GameRules, GameEvent } from "./src/types.ts";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck(jokerCount: number = 3): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS.filter(r => r !== 'Joker')) {
      deck.push({ id: uuidv4(), suit, rank });
    }
  }
  for (let i = 0; i < jokerCount; i++) {
    deck.push({ id: uuidv4(), suit: 'spades', rank: 'Joker' });
  }
  return deck.sort(() => Math.random() - 0.5);
}

const DEFAULT_RULES: GameRules = {
  drawCardsOn2: 2,
  drawCardsOn3: 3,
  drawCardsOnKingSpades: 5,
  drawCardsOnKingHearts: 5,
  skipTurnsOn4: true,
  requestSuitOnAce: true,
  requestRankOnJack: true,
  jokerCount: 3,
  queenOfSpadesCancelsBattleCards: true,
  queenOfHeartsCancelsBattleCards: false,
};

const games = new Map<string, GameState>();
const playerSockets = new Map<string, WebSocket>();

function broadcast(roomId: string, message: ServerMessage) {
  const game = games.get(roomId);
  if (!game) return;
  game.players.forEach(p => {
    const socket = playerSockets.get(p.id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });

  if (game.status === 'playing') {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.isBot) {
      setTimeout(() => executeBotTurn(game, currentPlayer.id), 1500 + Math.random() * 1000);
    }
    
    // Bots also check for "Stop Makao" with a delay to give humans a chance
    setTimeout(() => {
      // Only check if game is still playing
      const currentGame = games.get(roomId);
      if (currentGame && currentGame.status === 'playing') {
        currentGame.players.forEach(p => {
          if (p.isBot) {
            checkBotStopMakao(currentGame, p);
          }
        });
      }
    }, 4000);
  }
}

function addEvent(game: GameState, type: GameEvent['type'], playerId?: string, cards?: Card[], details?: string) {
  const player = playerId ? game.players.find(p => p.id === playerId) : undefined;
  game.history.push({
    id: uuidv4(),
    timestamp: Date.now(),
    playerId,
    playerName: player?.name,
    type,
    cards,
    details
  });
  // Keep history size manageable
  if (game.history.length > 100) {
    game.history.shift();
  }
}

function checkBotStopMakao(game: GameState, bot: Player) {
  const chance = bot.difficulty === 'hard' ? 0.9 : (bot.difficulty === 'medium' ? 0.4 : 0.1);
  game.players.forEach(p => {
    if (p.id !== bot.id && p.hand.length === 1 && !p.isMakao && (!p.makaoTime || Date.now() - p.makaoTime > 10000)) {
      if (Math.random() < chance) {
        // Penalty for not saying Makao
        for (let i = 0; i < 5; i++) {
          if (game.deck.length === 0 && game.discardPile.length > 1) {
            const top = game.discardPile.pop()!;
            game.deck = game.discardPile.sort(() => Math.random() - 0.5);
            game.discardPile = [top];
          }
          if (game.deck.length > 0) {
            p.hand.push(game.deck.pop()!);
          }
        }
        broadcast(game.roomId, { type: 'UPDATE', state: game });
      }
    }
  });
}

function executeBotTurn(game: GameState, botId: string) {
  const bot = game.players[game.currentPlayerIndex];
  if (!bot || !bot.isBot || bot.id !== botId || game.status !== 'playing') return;

  const topCard = game.discardPile[game.discardPile.length - 1];
  const validCards = bot.hand.filter(c => isValidMove(game, c, topCard));

  if (validCards.length > 0) {
    // Decision logic based on difficulty
    let cardToPlay: Card;
    if (bot.difficulty === 'easy') {
      cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
    } else {
      // Medium/Hard: prioritize special cards if they help, or save them if they are defensive
      // For now, let's just pick one that isn't a request card if possible, or a request card if needed
      const special = validCards.filter(c => ['2', '3', '4', 'J', 'A', 'K'].includes(c.rank));
      const normal = validCards.filter(c => !['2', '3', '4', 'J', 'A', 'K'].includes(c.rank));
      
      if (normal.length > 0 && Math.random() > 0.3) {
        cardToPlay = normal[Math.floor(Math.random() * normal.length)];
      } else {
        cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
      }
    }

    // Find all cards of the same rank in hand
    let cardsToPlay = bot.hand.filter(c => c.rank === cardToPlay.rank);
    
    if (game.requestedRank === 'K' && cardToPlay.rank === 'K') {
      cardsToPlay = cardsToPlay.filter(c => c.suit !== 'spades' && c.suit !== 'hearts');
    }

    // Ensure the valid card is placed first
    const validCardIndex = cardsToPlay.findIndex(c => c.id === cardToPlay.id);
    if (validCardIndex > 0) {
      const temp = cardsToPlay[0];
      cardsToPlay[0] = cardsToPlay[validCardIndex];
      cardsToPlay[validCardIndex] = temp;
    }

    // Determine Joker represented values for bot
    if (cardsToPlay[0].rank === 'Joker') {
      let repRank: Rank = 'A';
      let repSuit: Suit = 'spades';
      
      if (game.requestedRank) {
        repRank = (!game.requestedRankPlayed && Math.random() > 0.5) ? 'J' : game.requestedRank;
      } else if (game.drawPenalty > 0) {
        repRank = topCard.rank === 'K' ? 'K' : '2';
      } else if (game.skipPenalty > 0) {
        repRank = '4';
      } else {
        repRank = topCard.rank !== 'Joker' ? topCard.rank : (topCard.representedRank || 'A');
        repSuit = topCard.rank !== 'Joker' ? topCard.suit : (topCard.representedSuit || 'spades');
      }
      
      cardsToPlay.forEach(c => {
        c.representedRank = repRank;
        c.representedSuit = repSuit;
      });
    }

    // Remove cards from hand
    bot.hand = bot.hand.filter(c => c.rank !== cardToPlay.rank);
    if (bot.hand.length === 1) {
      bot.makaoTime = Date.now();
    }
    
    // Add to discard pile
    game.discardPile.push(...cardsToPlay);
    
    addEvent(game, 'PLAY_CARDS', bot.id, cardsToPlay);
    
    // Handle requestedRank logic
    if (game.requestedRank) {
      const firstCardRank = cardsToPlay[0].representedRank || cardsToPlay[0].rank;
      if (firstCardRank === game.requestedRank) {
        game.requestedRankPlayed = true;
      } else if (firstCardRank !== 'J' && cardsToPlay[0].rank !== 'Joker') {
        game.requestedRank = null;
        game.requestedRankBy = null;
        game.requestedRankPlayed = false;
        game.requestedRankTurns = 0;
      }
    }

    // Always reset requestedSuit when a card is played
    game.requestedSuit = null;

    let reqSuit: Suit | undefined;
    let reqRank: Rank | undefined;

    if (cardToPlay.rank === 'A') {
      // Pick suit bot has most of
      const counts: Record<string, number> = {};
      bot.hand.forEach(c => counts[c.suit] = (counts[c.suit] || 0) + 1);
      reqSuit = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Suit) || 'hearts';
    } else if (cardToPlay.rank === 'J') {
      // Pick rank bot has, but not Joker, A, Q, 2, 3, 4
      const validRanks = bot.hand.map(c => c.rank).filter(r => !['J', 'A', 'Q', '2', '3', '4', 'Joker'].includes(r));
      reqRank = validRanks[0] || '5';
    }

    cardsToPlay.forEach(card => {
      handleSpecialCard(game, card, bot.id, reqSuit, reqRank);
    });

    if (bot.hand.length === 1) {
      const chance = bot.difficulty === 'hard' ? 1 : (bot.difficulty === 'medium' ? 0.8 : 0.5);
      if (Math.random() < chance) {
        bot.isMakao = true;
      }
    }
    checkGameEnd(game, bot);
  } else {
    // Draw card or skip turn
    if (game.skipPenalty > 0) {
      bot.skipTurns = (bot.skipTurns || 0) + game.skipPenalty - 1;
      addEvent(game, 'PENALTY', bot.id, undefined, `Skipped ${game.skipPenalty} turn${game.skipPenalty > 1 ? 's' : ''}`);
      game.skipPenalty = 0;
      nextPlayer(game);
    } else {
      const wasPenalty = game.drawPenalty > 0;
      let drawnCard: Card | undefined;
      
      if (wasPenalty) {
        // Draw 1 card first to check for defense
        if (game.deck.length === 0 && game.discardPile.length > 1) {
          const top = game.discardPile.pop()!;
          game.deck = game.discardPile.sort(() => Math.random() - 0.5);
          game.discardPile = [top];
        }
        if (game.deck.length > 0) {
          drawnCard = game.deck.pop()!;
          bot.hand.push(drawnCard);
        }
        
        const newTopCard = game.discardPile[game.discardPile.length - 1];
        if (drawnCard && isValidMove(game, drawnCard, newTopCard)) {
          // Bot can defend!
          addEvent(game, 'DRAW_CARDS', bot.id, undefined, `Drew 1 card to defend`);
          
          if (drawnCard.rank === 'Joker') {
            drawnCard.representedRank = newTopCard.rank !== 'Joker' ? newTopCard.rank : (newTopCard.representedRank || 'A');
            drawnCard.representedSuit = newTopCard.rank !== 'Joker' ? newTopCard.suit : (newTopCard.representedSuit || 'spades');
          }
          
          bot.hand = bot.hand.filter(c => c.id !== drawnCard!.id);
          if (bot.hand.length === 1) {
            bot.makaoTime = Date.now();
          }
          game.discardPile.push(drawnCard);
          addEvent(game, 'PLAY_CARDS', bot.id, [drawnCard], 'Played drawn card to defend');
          
          // Handle requestedRank logic
          if (game.requestedRank) {
            const firstCardRank = drawnCard.representedRank || drawnCard.rank;
            if (firstCardRank === game.requestedRank) {
              game.requestedRankPlayed = true;
            } else if (firstCardRank !== 'J' && drawnCard.rank !== 'Joker') {
              game.requestedRank = null;
              game.requestedRankBy = null;
              game.requestedRankPlayed = false;
              game.requestedRankTurns = 0;
            }
          }
          
          game.requestedSuit = null;
          
          let reqSuit: Suit | undefined;
          let reqRank: Rank | undefined;
          if (drawnCard.rank === 'A') {
            const counts = bot.hand.reduce((acc, c) => {
              acc[c.suit] = (acc[c.suit] || 0) + 1;
              return acc;
            }, {} as Record<Suit, number>);
            reqSuit = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Suit) || 'hearts';
          } else if (drawnCard.rank === 'J') {
            const validRanks = bot.hand.map(c => c.rank).filter(r => !['J', 'A', 'Q', '2', '3', '4', 'Joker'].includes(r));
            reqRank = validRanks[0] || '5';
          }
          
          handleSpecialCard(game, drawnCard, bot.id, reqSuit, reqRank);
          
          if (bot.hand.length === 1) {
            const chance = bot.difficulty === 'hard' ? 1 : (bot.difficulty === 'medium' ? 0.8 : 0.5);
            if (Math.random() < chance) {
              bot.isMakao = true;
            }
          }
          checkGameEnd(game, bot);
        } else {
          // Cannot defend, draw the rest
          const remaining = game.drawPenalty - 1;
          for (let i = 0; i < remaining; i++) {
            if (game.deck.length === 0 && game.discardPile.length > 1) {
              const top = game.discardPile.pop()!;
              game.deck = game.discardPile.sort(() => Math.random() - 0.5);
              game.discardPile = [top];
            }
            if (game.deck.length > 0) {
              bot.hand.push(game.deck.pop()!);
            }
          }
          addEvent(game, 'PENALTY', bot.id, undefined, `Took penalty of ${game.drawPenalty} cards`);
          game.drawPenalty = 0;
          bot.isMakao = false;
          nextPlayer(game);
        }
      } else {
        // Normal draw
        if (game.deck.length === 0 && game.discardPile.length > 1) {
          const top = game.discardPile.pop()!;
          game.deck = game.discardPile.sort(() => Math.random() - 0.5);
          game.discardPile = [top];
        }
        if (game.deck.length > 0) {
          drawnCard = game.deck.pop()!;
          bot.hand.push(drawnCard);
        }
        addEvent(game, 'DRAW_CARDS', bot.id, undefined, `Drew 1 card`);
        bot.isMakao = false;
        
        const newTopCard = game.discardPile[game.discardPile.length - 1];
        if (drawnCard && isValidMove(game, drawnCard, newTopCard)) {
          if (drawnCard.rank === 'Joker') {
            drawnCard.representedRank = newTopCard.rank !== 'Joker' ? newTopCard.rank : (newTopCard.representedRank || 'A');
            drawnCard.representedSuit = newTopCard.rank !== 'Joker' ? newTopCard.suit : (newTopCard.representedSuit || 'spades');
          }
          
          // Bot plays the drawn card immediately
          bot.hand = bot.hand.filter(c => c.id !== drawnCard!.id);
          if (bot.hand.length === 1) {
            bot.makaoTime = Date.now();
          }
          game.discardPile.push(drawnCard);
          addEvent(game, 'PLAY_CARDS', bot.id, [drawnCard], 'Played drawn card');
          
          // Handle requestedRank logic
          if (game.requestedRank) {
            const firstCardRank = drawnCard.representedRank || drawnCard.rank;
            if (firstCardRank === game.requestedRank) {
              game.requestedRankPlayed = true;
            } else if (firstCardRank !== 'J' && drawnCard.rank !== 'Joker') {
              game.requestedRank = null;
              game.requestedRankBy = null;
              game.requestedRankPlayed = false;
              game.requestedRankTurns = 0;
            }
          }
          
          game.requestedSuit = null;
          
          let reqSuit: Suit | undefined;
          let reqRank: Rank | undefined;
          if (drawnCard.rank === 'A') {
            const counts = bot.hand.reduce((acc, c) => {
              acc[c.suit] = (acc[c.suit] || 0) + 1;
              return acc;
            }, {} as Record<Suit, number>);
            reqSuit = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Suit) || 'hearts';
          } else if (drawnCard.rank === 'J') {
            const validRanks = bot.hand.map(c => c.rank).filter(r => !['J', 'A', 'Q', '2', '3', '4', 'Joker'].includes(r));
            reqRank = validRanks[0] || '5';
          }
          
          handleSpecialCard(game, drawnCard, bot.id, reqSuit, reqRank);
          
          if (bot.hand.length === 1) {
            const chance = bot.difficulty === 'hard' ? 1 : (bot.difficulty === 'medium' ? 0.8 : 0.5);
            if (Math.random() < chance) {
              bot.isMakao = true;
            }
          }
          checkGameEnd(game, bot);
        } else {
          addEvent(game, 'PASS_TURN', bot.id);
          nextPlayer(game);
        }
      }
    }
  }

  broadcast(game.roomId, { type: 'UPDATE', state: game });
}

function nextPlayer(game: GameState) {
  game.hasDrawnCard = false;
  
  let attempts = 0;
  do {
    game.currentPlayerIndex = (game.currentPlayerIndex + game.turnDirection + game.players.length) % game.players.length;
    attempts++;
    if (attempts > game.players.length) break; // Safety check
  } while (game.players[game.currentPlayerIndex].isFinished);
  
  const currentPlayer = game.players[game.currentPlayerIndex];
  
  if (game.requestedRank && game.requestedRankTurns !== undefined) {
    game.requestedRankTurns--;
    if (game.requestedRankTurns <= 0) {
      game.requestedRank = null;
      game.requestedRankBy = null;
      game.requestedRankPlayed = false;
      game.requestedRankTurns = 0;
    }
  }
  
  if (currentPlayer.skipTurns && currentPlayer.skipTurns > 0) {
    currentPlayer.skipTurns--;
    addEvent(game, 'TURN_SKIPPED', currentPlayer.id, undefined, `Turn skipped (${currentPlayer.skipTurns} remaining)`);
    nextPlayer(game);
    return;
  }

  game.turnEndTime = Date.now() + 60000;
}

wss.on("connection", (ws) => {
  let currentPlayerId = uuidv4();
  let currentRoomId: string | null = null;

  ws.on("message", (data) => {
    const message: ClientMessage = JSON.parse(data.toString());

    if (message.type === 'JOIN') {
      currentRoomId = message.roomId || 'default';
      let game = games.get(currentRoomId);

      if (!game) {
        game = {
          roomId: currentRoomId,
          players: [],
          deck: createDeck(message.rules?.jokerCount || DEFAULT_RULES.jokerCount),
          discardPile: [],
          currentPlayerIndex: 0,
          turnDirection: 1,
          status: 'waiting',
          requestedSuit: null,
          requestedRank: null,
          requestedRankBy: null,
          requestedRankPlayed: false,
          drawPenalty: 0,
          skipPenalty: 0,
          winner: null,
          loser: null,
          rules: message.rules ? { ...message.rules } : { ...DEFAULT_RULES },
          history: [],
        };
        games.set(currentRoomId, game);
      }

      // Check if player is reconnecting
      if (message.playerId) {
        const existingPlayer = game.players.find(p => p.id === message.playerId);
        if (existingPlayer) {
          currentPlayerId = existingPlayer.id;
          existingPlayer.isConnected = true;
          playerSockets.set(currentPlayerId, ws);
          ws.send(JSON.stringify({ type: 'INIT', state: game, playerId: currentPlayerId }));
          broadcast(currentRoomId, { type: 'UPDATE', state: game });
          return;
        }
      }

      if (game.status !== 'waiting') {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress' }));
        return;
      }

      if (game.players.length >= 4) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room full' }));
        return;
      }

      const player: Player = {
        id: currentPlayerId,
        name: message.name,
        hand: [],
        isReady: false,
        isMakao: false,
        isConnected: true,
      };

      game.players.push(player);
      playerSockets.set(currentPlayerId, ws);
      
      addEvent(game, 'PLAYER_JOINED', currentPlayerId, undefined, `${message.name} joined the room`);

      ws.send(JSON.stringify({ type: 'INIT', state: game, playerId: currentPlayerId }));
      broadcast(currentRoomId, { type: 'UPDATE', state: game });
    }

    if (!currentRoomId) return;
    const game = games.get(currentRoomId);
    if (!game) return;

    if (message.type === 'LEAVE_ROOM') {
      const playerIndex = game.players.findIndex(p => p.id === currentPlayerId);
      if (playerIndex !== -1) {
        const player = game.players[playerIndex];
        addEvent(game, 'PLAYER_LEFT', currentPlayerId, undefined, `${player.name} left the room`);
        
        if (game.status === 'playing') {
          game.players[playerIndex].isConnected = false;
        } else {
          game.players.splice(playerIndex, 1);
          
          if (game.currentPlayerIndex >= game.players.length) {
            game.currentPlayerIndex = 0;
          } else if (playerIndex < game.currentPlayerIndex) {
            game.currentPlayerIndex--;
          }

          if (game.requestedRankBy === currentPlayerId) {
            game.requestedRank = null;
            game.requestedRankBy = null;
            game.requestedRankPlayed = false;
          }
        }

        if (game.players.length === 0 || game.players.every(p => p.isBot || !p.isConnected)) {
          games.delete(currentRoomId);
        } else {
          broadcast(currentRoomId, { type: 'UPDATE', state: game });
        }
      }
      playerSockets.delete(currentPlayerId);
      currentRoomId = null;
      return;
    }

    if (message.type === 'ADD_BOT' && game.status === 'waiting') {
      if (game.players.length >= 4) return;
      const botId = `bot-${uuidv4()}`;
      const bot: Player = {
        id: botId,
        name: `Bot ${message.difficulty.toUpperCase()} ${game.players.length}`,
        hand: [],
        isReady: true,
        isMakao: false,
        isBot: true,
        difficulty: message.difficulty,
      };
      game.players.push(bot);
      addEvent(game, 'PLAYER_JOINED', botId, undefined, `${bot.name} was added`);
      broadcast(currentRoomId, { type: 'UPDATE', state: game });
    }

    if (message.type === 'REMOVE_PLAYER' && game.status === 'waiting') {
      const playerToRemove = game.players.find(p => p.id === message.playerId);
      if (playerToRemove) {
        addEvent(game, 'PLAYER_LEFT', message.playerId, undefined, `${playerToRemove.name} was removed`);
      }
      game.players = game.players.filter(p => p.id !== message.playerId);
      broadcast(currentRoomId, { type: 'UPDATE', state: game });
    }

    if (message.type === 'READY' && game.status !== 'playing') {
      const player = game.players.find(p => p.id === currentPlayerId);
      if (player) {
        player.isReady = !player.isReady;
        
        const activePlayers = game.players.filter(p => p.isConnected || p.isBot);
        if (activePlayers.length >= 2 && activePlayers.every(p => p.isReady)) {
          game.players = activePlayers;
          startGame(game);
        }
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
      }
    }

    if (message.type === 'PLAY_CARDS' && game.status === 'playing') {
      const player = game.players[game.currentPlayerIndex];
      if (player.id !== currentPlayerId) return;

      const cardIds = message.cardIds;
      if (!cardIds || cardIds.length === 0) return;

      // Find all cards in hand
      const cardsToPlay = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as Card[];
      if (cardsToPlay.length !== cardIds.length) return; // Some cards not found

      // Validate that all non-Joker cards have the same rank
      const nonJokers = cardsToPlay.filter(c => c.rank !== 'Joker');
      if (nonJokers.length > 0) {
        const groupRank = nonJokers[0].rank;
        if (!nonJokers.every(c => c.rank === groupRank)) return;
      }

      if (game.requestedRank === 'K' && cardsToPlay.some(c => c.rank === 'K' && (c.suit === 'spades' || c.suit === 'hearts'))) {
        return; // Cannot play battle Kings when K is requested
      }

      const topCard = game.discardPile[game.discardPile.length - 1];

      // Determine Joker represented values
      let repRank: Rank | undefined;
      let repSuit: Suit | undefined;
      if (nonJokers.length > 0) {
        repRank = nonJokers[0].rank;
        repSuit = nonJokers[0].suit;
      } else if (message.type === 'PLAY_CARDS' && message.jokerRank && message.jokerSuit) {
        repRank = message.jokerRank;
        repSuit = message.jokerSuit;
      } else {
        repRank = topCard.rank !== 'Joker' ? topCard.rank : (topCard.representedRank || 'A');
        repSuit = topCard.rank !== 'Joker' ? topCard.suit : (topCard.representedSuit || 'spades');
      }

      cardsToPlay.forEach(c => {
        if (c.rank === 'Joker') {
          c.representedRank = repRank;
          c.representedSuit = repSuit;
        }
      });

      // Find a card among the selected that is valid to play on the top card
      const validStartingCardIndex = cardsToPlay.findIndex(c => isValidMove(game, c, topCard));
      
      if (validStartingCardIndex !== -1) {
        // Reorder so the valid starting card is first
        if (validStartingCardIndex > 0) {
          const temp = cardsToPlay[0];
          cardsToPlay[0] = cardsToPlay[validStartingCardIndex];
          cardsToPlay[validStartingCardIndex] = temp;
        }

        // Remove cards from hand
        player.hand = player.hand.filter(c => !cardIds.includes(c.id));
        if (player.hand.length === 1) {
          player.makaoTime = Date.now();
        }
        
        // Add cards to discard pile
        game.discardPile.push(...cardsToPlay);
        
        addEvent(game, 'PLAY_CARDS', player.id, cardsToPlay);
        
        // Handle requestedRank logic
        if (game.requestedRank) {
          const firstCardRank = cardsToPlay[0].representedRank || cardsToPlay[0].rank;
          if (firstCardRank === game.requestedRank) {
            game.requestedRankPlayed = true;
          } else if (firstCardRank !== 'J' && cardsToPlay[0].rank !== 'Joker') {
            // This shouldn't happen due to isValidMove, but just in case
            game.requestedRank = null;
            game.requestedRankBy = null;
            game.requestedRankPlayed = false;
            game.requestedRankTurns = 0;
          }
        }

        // Always reset requestedSuit when a card is played
        game.requestedSuit = null;

        // Apply special effects for EACH card played
        cardsToPlay.forEach(card => {
          handleSpecialCard(game, card, player.id, message.requestedSuit, message.requestedRank);
        });

        checkGameEnd(game, player);
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
      }
    }

    if (message.type === 'DRAW_CARD' && game.status === 'playing') {
      if (game.hasDrawnCard) return;
      
      const player = game.players[game.currentPlayerIndex];
      if (player.id !== currentPlayerId) return;

      if (game.skipPenalty > 0) {
        player.skipTurns = (player.skipTurns || 0) + game.skipPenalty - 1;
        addEvent(game, 'PENALTY', player.id, undefined, `Skipped ${game.skipPenalty} turn${game.skipPenalty > 1 ? 's' : ''}`);
        game.skipPenalty = 0;
        nextPlayer(game);
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
        return;
      }

      const wasPenalty = game.drawPenalty > 0;
      let drawnCard: Card | undefined;
      
      if (wasPenalty) {
        // Draw exactly 1 card first to check for defense
        if (game.deck.length === 0 && game.discardPile.length > 1) {
          const top = game.discardPile.pop()!;
          game.deck = game.discardPile.sort(() => Math.random() - 0.5);
          game.discardPile = [top];
        }
        if (game.deck.length > 0) {
          drawnCard = game.deck.pop()!;
          player.hand.push(drawnCard);
        }
        
        const topCard = game.discardPile[game.discardPile.length - 1];
        if (drawnCard && isValidMove(game, drawnCard, topCard)) {
          // Can defend! Give them a chance to play it or pass
          game.hasDrawnCard = true;
          addEvent(game, 'DRAW_CARDS', player.id, undefined, `Drew 1 card to defend`);
        } else {
          // Cannot defend. Draw the remaining penalty cards.
          const remaining = game.drawPenalty - 1;
          for (let i = 0; i < remaining; i++) {
            if (game.deck.length === 0 && game.discardPile.length > 1) {
              const top = game.discardPile.pop()!;
              game.deck = game.discardPile.sort(() => Math.random() - 0.5);
              game.discardPile = [top];
            }
            if (game.deck.length > 0) {
              player.hand.push(game.deck.pop()!);
            }
          }
          addEvent(game, 'PENALTY', player.id, undefined, `Took penalty of ${game.drawPenalty} cards`);
          game.drawPenalty = 0;
          player.isMakao = false;
          nextPlayer(game);
        }
      } else {
        // Normal draw
        if (game.deck.length === 0 && game.discardPile.length > 1) {
          const top = game.discardPile.pop()!;
          game.deck = game.discardPile.sort(() => Math.random() - 0.5);
          game.discardPile = [top];
        }
        if (game.deck.length > 0) {
          drawnCard = game.deck.pop()!;
          player.hand.push(drawnCard);
        }
        addEvent(game, 'DRAW_CARDS', player.id, undefined, `Drew 1 card`);
        
        const topCard = game.discardPile[game.discardPile.length - 1];
        if (drawnCard && isValidMove(game, drawnCard, topCard)) {
          game.hasDrawnCard = true;
        } else {
          player.isMakao = false;
          nextPlayer(game);
        }
      }
      
      broadcast(currentRoomId, { type: 'UPDATE', state: game });
    }

    if (message.type === 'PASS_TURN' && game.status === 'playing') {
      const player = game.players[game.currentPlayerIndex];
      if (player.id === currentPlayerId && game.hasDrawnCard) {
        if (game.drawPenalty > 0) {
          const remaining = game.drawPenalty - 1;
          for (let i = 0; i < remaining; i++) {
            if (game.deck.length === 0 && game.discardPile.length > 1) {
              const top = game.discardPile.pop()!;
              game.deck = game.discardPile.sort(() => Math.random() - 0.5);
              game.discardPile = [top];
            }
            if (game.deck.length > 0) {
              player.hand.push(game.deck.pop()!);
            }
          }
          addEvent(game, 'PENALTY', player.id, undefined, `Took penalty of ${game.drawPenalty} cards`);
          game.drawPenalty = 0;
        } else {
          addEvent(game, 'PASS_TURN', player.id);
        }
        player.isMakao = false;
        nextPlayer(game);
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
      }
    }

    if (message.type === 'MAKAO') {
      const player = game.players.find(p => p.id === currentPlayerId);
      if (player && player.hand.length === 1) {
        player.isMakao = true;
        addEvent(game, 'MAKAO', player.id);
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
      }
    }

    if (message.type === 'STOP_MAKAO') {
      const target = game.players.find(p => p.id === message.targetPlayerId);
      if (target && target.hand.length === 1 && !target.isMakao && (!target.makaoTime || Date.now() - target.makaoTime > 10000)) {
        addEvent(game, 'STOP_MAKAO', currentPlayerId, undefined, `Caught ${target.name} not saying Makao`);
        // Penalty for not saying Makao: draw 5 cards
        for (let i = 0; i < 5; i++) {
          if (game.deck.length === 0 && game.discardPile.length > 1) {
            const top = game.discardPile.pop()!;
            game.deck = game.discardPile.sort(() => Math.random() - 0.5);
            game.discardPile = [top];
          }
          if (game.deck.length > 0) {
            target.hand.push(game.deck.pop()!);
          }
        }
        broadcast(currentRoomId, { type: 'UPDATE', state: game });
      }
    }
  });

  ws.on("close", () => {
    if (currentRoomId) {
      const game = games.get(currentRoomId);
      if (game) {
        const playerIndex = game.players.findIndex(p => p.id === currentPlayerId);
        if (playerIndex !== -1) {
          const player = game.players[playerIndex];
          addEvent(game, 'PLAYER_LEFT', currentPlayerId, undefined, `${player.name} disconnected`);
          
          if (game.status === 'playing') {
            game.players[playerIndex].isConnected = false;
          } else {
            game.players.splice(playerIndex, 1);
            
            if (game.currentPlayerIndex >= game.players.length) {
              game.currentPlayerIndex = 0;
            } else if (playerIndex < game.currentPlayerIndex) {
              game.currentPlayerIndex--;
            }

            if (game.requestedRankBy === currentPlayerId) {
              game.requestedRank = null;
              game.requestedRankBy = null;
              game.requestedRankPlayed = false;
              game.requestedRankTurns = 0;
            }
          }

          if (game.players.length === 0 || game.players.every(p => p.isBot || !p.isConnected)) {
            games.delete(currentRoomId);
          } else {
            broadcast(currentRoomId, { type: 'UPDATE', state: game });
          }
        }
      }
    }
    playerSockets.delete(currentPlayerId);
  });
});

function startGame(game: GameState) {
  game.status = 'playing';
  game.deck = createDeck(game.rules.jokerCount);
  game.drawPenalty = 0;
  game.skipPenalty = 0;
  game.requestedRank = null;
  game.requestedRankBy = null;
  game.requestedRankPlayed = false;
  game.requestedRankTurns = 0;
  game.requestedSuit = null;
  game.hasDrawnCard = false;
  
  if (game.loser) {
    const loserIndex = game.players.findIndex(p => p.id === game.loser);
    game.currentPlayerIndex = loserIndex !== -1 ? loserIndex : Math.floor(Math.random() * game.players.length);
  } else {
    game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
  }
  
  game.winner = null;
  game.loser = null;
  
  game.players.forEach(p => {
    p.hand = [];
    p.isReady = p.isBot;
    p.isMakao = false;
    p.skipTurns = 0;
    p.isFinished = false;
    p.finishedRank = undefined;
    for (let i = 0; i < 5; i++) {
      p.hand.push(game.deck.pop()!);
    }
  });
  
  let firstCard = game.deck.pop()!;
  // First card shouldn't be special/battle card or Q
  while (
    ['2', '3', '4', 'J', 'Q', 'A', 'Joker'].includes(firstCard.rank) || 
    (firstCard.rank === 'K' && (firstCard.suit === 'spades' || firstCard.suit === 'hearts'))
  ) {
    game.deck.unshift(firstCard);
    firstCard = game.deck.pop()!;
  }
  game.discardPile = [firstCard];
  game.turnEndTime = Date.now() + 60000;
  
  addEvent(game, 'GAME_START', undefined, undefined, 'Game started');
}

function isValidMove(game: GameState, card: Card, topCard: Card): boolean {
  const rank = card.representedRank || card.rank;
  const suit = card.representedSuit || card.suit;
  const topRank = topCard.representedRank || topCard.rank;
  const topSuit = topCard.representedSuit || topCard.suit;

  const isQueenOfSpades = rank === 'Q' && suit === 'spades';
  const isQueenOfHearts = rank === 'Q' && suit === 'hearts';
  const canCancelBattle = (isQueenOfSpades && game.rules.queenOfSpadesCancelsBattleCards) || 
                          (isQueenOfHearts && game.rules.queenOfHeartsCancelsBattleCards);

  if (game.drawPenalty > 0) {
    if (canCancelBattle) return true;
    if (card.rank === 'Joker' && !card.representedRank) return true;
    
    if (topRank === '2' || topRank === '3' || topRank === 'K') {
      if (rank === '2' || rank === '3' || (rank === 'K' && (suit === 'spades' || suit === 'hearts'))) {
        return rank === topRank || suit === topSuit;
      }
      return false;
    }
  }

  if (game.skipPenalty > 0) {
    if (canCancelBattle) return true;
    if (card.rank === 'Joker' && !card.representedRank) return true;
    return rank === '4';
  }

  if (game.requestedRank) {
    if (card.rank === 'Joker' && !card.representedRank) return true;
    if (rank === 'J') {
      return true;
    }
    if (rank === game.requestedRank) {
      if (game.requestedRank === 'K' && (suit === 'spades' || suit === 'hearts')) {
        return false;
      }
      return true;
    }
    return false;
  }

  if (card.rank === 'Joker') return true;

  const effectiveSuit = game.requestedSuit || topSuit;

  // Queen of everything rule (common in Makao)
  if (rank === 'Q' || topRank === 'Q' || topRank === 'Joker') {
    return true;
  }

  return suit === effectiveSuit || rank === topRank;
}

function checkGameEnd(game: GameState, player: Player) {
  if (player.hand.length === 0) {
    player.isFinished = true;
    player.finishedRank = game.players.filter(p => p.isFinished).length;
    if (player.finishedRank === 1) {
      player.wins = (player.wins || 0) + 1;
      game.winner = player.id;
    }
    addEvent(game, 'FINISH', player.id, undefined, `${player.name} finished in place ${player.finishedRank}!`);
    
    const activePlayers = game.players.filter(p => !p.isFinished);
    if (activePlayers.length <= 1) {
      game.status = 'finished';
      const loser = activePlayers[0];
      if (loser) {
        game.loser = loser.id;
        addEvent(game, 'GAME_END', loser.id, undefined, `${loser.name} lost the game!`);
      } else {
        game.loser = player.id;
        addEvent(game, 'GAME_END', player.id, undefined, `Game over!`);
      }
    } else {
      nextPlayer(game);
    }
  } else {
    nextPlayer(game);
  }
}

function handleSpecialCard(game: GameState, card: Card, playerId: string, requestedSuit?: Suit, requestedRank?: Rank) {
  const rank = card.representedRank || card.rank;
  const suit = card.representedSuit || card.suit;

  if (card.rank === 'Joker' && !card.representedRank) {
    game.drawPenalty = 0;
    game.skipPenalty = 0;
    game.requestedRank = null;
    game.requestedRankBy = null;
    game.requestedRankPlayed = false;
    game.requestedRankTurns = 0;
    game.requestedSuit = null;
    return;
  }
  
  const isQueenOfSpades = rank === 'Q' && suit === 'spades';
  const isQueenOfHearts = rank === 'Q' && suit === 'hearts';
  
  if ((isQueenOfSpades && game.rules.queenOfSpadesCancelsBattleCards) || 
      (isQueenOfHearts && game.rules.queenOfHeartsCancelsBattleCards)) {
    game.drawPenalty = 0;
    game.skipPenalty = 0;
  }

  if (rank === '2') {
    game.drawPenalty += game.rules.drawCardsOn2;
  } else if (rank === '3') {
    game.drawPenalty += game.rules.drawCardsOn3;
  } else if (rank === '4' && game.rules.skipTurnsOn4) {
    game.skipPenalty += 1;
  } else if (rank === 'J') {
    if (requestedRank && !['J', 'A', 'Q', '2', '3', '4', 'Joker'].includes(requestedRank)) {
      game.requestedRank = requestedRank;
      game.requestedRankBy = playerId;
      game.requestedRankPlayed = false;
      game.requestedRankTurns = game.players.length + 1;
      addEvent(game, 'PLAY_CARDS', playerId, undefined, `Requested rank ${requestedRank}`);
    } else {
      game.requestedRank = null;
      game.requestedRankBy = null;
      game.requestedRankPlayed = false;
      game.requestedRankTurns = 0;
    }
  } else if (rank === 'A') {
    game.requestedSuit = requestedSuit || null;
    if (requestedSuit) {
      addEvent(game, 'PLAY_CARDS', playerId, undefined, `Requested suit ${requestedSuit}`);
    }
  } else if (rank === 'K') {
    if (suit === 'spades') {
      game.drawPenalty += game.rules.drawCardsOnKingSpades;
      // King of Spades usually attacks the PREVIOUS player
      game.turnDirection *= -1;
      nextPlayer(game);
      nextPlayer(game);
      game.turnDirection *= -1;
    } else if (suit === 'hearts') {
      game.drawPenalty += game.rules.drawCardsOnKingHearts;
    }
  }
}

setInterval(() => {
  games.forEach((game, roomId) => {
    if (game.status === 'playing') {
      const player = game.players[game.currentPlayerIndex];
      
      const isTimeout = game.turnEndTime && Date.now() > game.turnEndTime;
      const isDisconnected = !player.isBot && !player.isConnected;

      if (isTimeout || isDisconnected) {
        // Auto-draw or skip turn
        if (game.skipPenalty > 0) {
          player.skipTurns = (player.skipTurns || 0) + game.skipPenalty - 1;
          addEvent(game, 'PENALTY', player.id, undefined, `Skipped ${game.skipPenalty} turn${game.skipPenalty > 1 ? 's' : ''}`);
          game.skipPenalty = 0;
          nextPlayer(game);
        } else {
          const cardsToDraw = Math.max(1, game.drawPenalty);
          const wasPenalty = game.drawPenalty > 0;
          for (let i = 0; i < cardsToDraw; i++) {
            if (game.deck.length === 0 && game.discardPile.length > 1) {
              const top = game.discardPile.pop()!;
              game.deck = game.discardPile.sort(() => Math.random() - 0.5);
              game.discardPile = [top];
            }
            if (game.deck.length > 0) {
              player.hand.push(game.deck.pop()!);
            }
          }
          
          if (wasPenalty) {
            addEvent(game, 'PENALTY', player.id, undefined, `Took penalty of ${cardsToDraw} cards`);
          } else {
            addEvent(game, 'DRAW_CARDS', player.id, undefined, `Drew ${cardsToDraw} card${cardsToDraw > 1 ? 's' : ''}`);
          }
          
          game.drawPenalty = 0;
          player.isMakao = false;
          nextPlayer(game);
        }
        
        broadcast(roomId, { type: 'UPDATE', state: game });
      }
    }
  });
}, 1000);

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
