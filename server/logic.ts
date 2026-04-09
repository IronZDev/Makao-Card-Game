import { GameState, Card, Player, Suit, Rank } from "../src/types.ts";
import { addEvent } from "./utils.ts";
import { createDeck } from "./deck.ts";

export function nextPlayer(game: GameState) {
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

export function startGame(game: GameState) {
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

export function isValidMove(game: GameState, card: Card, topCard: Card): boolean {
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

export function checkGameEnd(game: GameState, player: Player) {
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

export function handleSpecialCard(game: GameState, card: Card, playerId: string, requestedSuit?: Suit, requestedRank?: Rank) {
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
