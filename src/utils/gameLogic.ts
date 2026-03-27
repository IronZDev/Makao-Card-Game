import { Card as CardType, GameState } from '../types';

export const isValidMove = (card: CardType, topCard: CardType | undefined, gameState: GameState | null) => {
  if (!topCard || !gameState) return false;
  
  const rank = card.representedRank || card.rank;
  const suit = card.representedSuit || card.suit;
  const topRank = topCard.representedRank || topCard.rank;
  const topSuit = topCard.representedSuit || topCard.suit;

  const isQueenOfSpades = rank === 'Q' && suit === 'spades';
  const isQueenOfHearts = rank === 'Q' && suit === 'hearts';
  const canCancelBattle = (isQueenOfSpades && gameState.rules.queenOfSpadesCancelsBattleCards) || 
                          (isQueenOfHearts && gameState.rules.queenOfHeartsCancelsBattleCards);

  if (gameState.drawPenalty > 0) {
    if (canCancelBattle) return true;
    if (card.rank === 'Joker' && !card.representedRank) return true;
    
    if (topRank === '2' || topRank === '3' || topRank === 'K') {
      if (rank === '2' || rank === '3' || (rank === 'K' && (suit === 'spades' || suit === 'hearts'))) {
        return rank === topRank || suit === topSuit;
      }
      return false;
    }
  }

  if (gameState.skipPenalty > 0) {
    if (canCancelBattle) return true;
    if (card.rank === 'Joker' && !card.representedRank) return true;
    return rank === '4';
  }

  if (gameState.requestedRank) {
    if (card.rank === 'Joker' && !card.representedRank) return true;
    if (rank === 'J') {
      return !gameState.requestedRankPlayed;
    }
    if (rank === gameState.requestedRank) {
      if (gameState.requestedRank === 'K' && (suit === 'spades' || suit === 'hearts')) {
        return false;
      }
      return true;
    }
    return false;
  }

  if (card.rank === 'Joker') return true;

  const effectiveSuit = gameState.requestedSuit || topSuit;

  if (rank === 'Q' || topRank === 'Q' || topRank === 'Joker') return true;

  return suit === effectiveSuit || rank === topRank;
};
