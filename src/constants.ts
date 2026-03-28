import { GameRules, Suit, Rank } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'Joker'];

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
