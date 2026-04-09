import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { ClientMessage, Player, GameRules, Card, Rank, Suit } from "../src/types.ts";
import { games, playerSockets } from "./store.ts";
import { addEvent } from "./utils.ts";
import { broadcastUpdate } from "./updater.ts";
import { createDeck } from "./deck.ts";
import { startGame, isValidMove, handleSpecialCard, checkGameEnd, nextPlayer } from "./logic.ts";

export const DEFAULT_RULES: GameRules = {
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

export function setupWebSocket(wss: WebSocketServer) {
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

        if (message.playerId) {
          const existingPlayer = game.players.find(p => p.id === message.playerId);
          if (existingPlayer) {
            currentPlayerId = existingPlayer.id;
            existingPlayer.isConnected = true;
            playerSockets.set(currentPlayerId, ws);
            ws.send(JSON.stringify({ type: 'INIT', state: game, playerId: currentPlayerId }));
            broadcastUpdate(currentRoomId);
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
        broadcastUpdate(currentRoomId);
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
            broadcastUpdate(currentRoomId);
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
        broadcastUpdate(currentRoomId);
      }

      if (message.type === 'REMOVE_PLAYER' && game.status === 'waiting') {
        const playerToRemove = game.players.find(p => p.id === message.playerId);
        if (playerToRemove) {
          addEvent(game, 'PLAYER_LEFT', message.playerId, undefined, `${playerToRemove.name} was removed`);
        }
        game.players = game.players.filter(p => p.id !== message.playerId);
        broadcastUpdate(currentRoomId);
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
          broadcastUpdate(currentRoomId);
        }
      }

      if (message.type === 'PLAY_CARDS' && game.status === 'playing') {
        const player = game.players[game.currentPlayerIndex];
        if (player.id !== currentPlayerId) return;

        const cardIds = message.cardIds;
        if (!cardIds || cardIds.length === 0) return;

        const cardsToPlay = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as Card[];
        if (cardsToPlay.length !== cardIds.length) return;

        const nonJokers = cardsToPlay.filter(c => c.rank !== 'Joker');
        if (nonJokers.length > 0) {
          const groupRank = nonJokers[0].rank;
          if (!nonJokers.every(c => c.rank === groupRank)) return;
        }

        if (game.requestedRank === 'K' && cardsToPlay.some(c => c.rank === 'K' && (c.suit === 'spades' || c.suit === 'hearts'))) {
          return;
        }

        const topCard = game.discardPile[game.discardPile.length - 1];

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

        const validStartingCardIndex = cardsToPlay.findIndex(c => isValidMove(game, c, topCard));
        
        if (validStartingCardIndex !== -1) {
          if (validStartingCardIndex > 0) {
            const temp = cardsToPlay[0];
            cardsToPlay[0] = cardsToPlay[validStartingCardIndex];
            cardsToPlay[validStartingCardIndex] = temp;
          }

          player.hand = player.hand.filter(c => !cardIds.includes(c.id));
          if (player.hand.length === 1) {
            player.makaoTime = Date.now();
          }
          
          game.discardPile.push(...cardsToPlay);
          
          addEvent(game, 'PLAY_CARDS', player.id, cardsToPlay);
          
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

          game.requestedSuit = null;

          cardsToPlay.forEach(card => {
            handleSpecialCard(game, card, player.id, message.requestedSuit, message.requestedRank);
          });

          checkGameEnd(game, player);
          broadcastUpdate(currentRoomId);
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
          broadcastUpdate(currentRoomId);
          return;
        }

        const wasPenalty = game.drawPenalty > 0;
        let drawnCard: Card | undefined;
        
        if (wasPenalty) {
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
            game.hasDrawnCard = true;
            addEvent(game, 'DRAW_CARDS', player.id, undefined, `Drew 1 card to defend`);
          } else {
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
        
        broadcastUpdate(currentRoomId);
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
          broadcastUpdate(currentRoomId);
        }
      }

      if (message.type === 'MAKAO') {
        const player = game.players.find(p => p.id === currentPlayerId);
        if (player && player.hand.length === 1) {
          player.isMakao = true;
          addEvent(game, 'MAKAO', player.id);
          broadcastUpdate(currentRoomId);
        }
      }

      if (message.type === 'STOP_MAKAO') {
        const target = game.players.find(p => p.id === message.targetPlayerId);
        if (target && target.hand.length === 1 && !target.isMakao && (!target.makaoTime || Date.now() - target.makaoTime > 10000)) {
          addEvent(game, 'STOP_MAKAO', currentPlayerId, undefined, `Caught ${target.name} not saying Makao`);
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
          broadcastUpdate(currentRoomId);
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
              broadcastUpdate(currentRoomId);
            }
          }
        }
      }
      playerSockets.delete(currentPlayerId);
    });
  });
}
