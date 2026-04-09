import { GameState, Player, Card, Rank, Suit } from "../src/types.ts";
import { games } from "./store.ts";
import { addEvent } from "./utils.ts";
import { isValidMove, handleSpecialCard, checkGameEnd, nextPlayer } from "./logic.ts";
import { broadcastUpdate } from "./updater.ts";

export function triggerBots(roomId: string) {
  const game = games.get(roomId);
  if (!game || game.status !== 'playing') return;

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer.isBot) {
    setTimeout(() => executeBotTurn(game, currentPlayer.id), 1500 + Math.random() * 1000);
  }
  
  setTimeout(() => {
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

export function checkBotStopMakao(game: GameState, bot: Player) {
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
        broadcastUpdate(game.roomId);
      }
    }
  });
}

export function executeBotTurn(game: GameState, botId: string) {
  const bot = game.players[game.currentPlayerIndex];
  if (!bot || !bot.isBot || bot.id !== botId || game.status !== 'playing') return;

  const topCard = game.discardPile[game.discardPile.length - 1];
  const validCards = bot.hand.filter(c => isValidMove(game, c, topCard));

  if (validCards.length > 0) {
    let cardToPlay: Card;
    if (bot.difficulty === 'easy') {
      cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
    } else {
      const normal = validCards.filter(c => !['2', '3', '4', 'J', 'A', 'K'].includes(c.rank));
      if (normal.length > 0 && Math.random() > 0.3) {
        cardToPlay = normal[Math.floor(Math.random() * normal.length)];
      } else {
        cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
      }
    }

    let cardsToPlay = bot.hand.filter(c => c.rank === cardToPlay.rank);
    
    if (game.requestedRank === 'K' && cardToPlay.rank === 'K') {
      cardsToPlay = cardsToPlay.filter(c => c.suit !== 'spades' && c.suit !== 'hearts');
    }

    const validCardIndex = cardsToPlay.findIndex(c => c.id === cardToPlay.id);
    if (validCardIndex > 0) {
      const temp = cardsToPlay[0];
      cardsToPlay[0] = cardsToPlay[validCardIndex];
      cardsToPlay[validCardIndex] = temp;
    }

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

    bot.hand = bot.hand.filter(c => c.rank !== cardToPlay.rank);
    if (bot.hand.length === 1) {
      bot.makaoTime = Date.now();
    }
    
    game.discardPile.push(...cardsToPlay);
    addEvent(game, 'PLAY_CARDS', bot.id, cardsToPlay);
    
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

    let reqSuit: Suit | undefined;
    let reqRank: Rank | undefined;

    if (cardToPlay.rank === 'A') {
      const counts: Record<string, number> = {};
      bot.hand.forEach(c => counts[c.suit] = (counts[c.suit] || 0) + 1);
      reqSuit = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as Suit) || 'hearts';
    } else if (cardToPlay.rank === 'J') {
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
    if (game.skipPenalty > 0) {
      bot.skipTurns = (bot.skipTurns || 0) + game.skipPenalty - 1;
      addEvent(game, 'PENALTY', bot.id, undefined, `Skipped ${game.skipPenalty} turn${game.skipPenalty > 1 ? 's' : ''}`);
      game.skipPenalty = 0;
      nextPlayer(game);
    } else {
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
          bot.hand.push(drawnCard);
        }
        
        const newTopCard = game.discardPile[game.discardPile.length - 1];
        if (drawnCard && isValidMove(game, drawnCard, newTopCard)) {
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
          
          bot.hand = bot.hand.filter(c => c.id !== drawnCard!.id);
          if (bot.hand.length === 1) {
            bot.makaoTime = Date.now();
          }
          game.discardPile.push(drawnCard);
          addEvent(game, 'PLAY_CARDS', bot.id, [drawnCard], 'Played drawn card');
          
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

  broadcastUpdate(game.roomId);
}
