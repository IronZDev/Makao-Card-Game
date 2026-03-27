export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Joker';

export const ALL_RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const ALL_SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  representedRank?: Rank;
  representedSuit?: Suit;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isReady: boolean;
  isMakao: boolean;
  isBot?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  wins?: number;
  isConnected?: boolean;
  skipTurns?: number;
}

export interface GameRules {
  drawCardsOn2: number;
  drawCardsOn3: number;
  drawCardsOnKingSpades: number;
  drawCardsOnKingHearts: number;
  skipTurnsOn4: boolean;
  requestSuitOnAce: boolean;
  requestRankOnJack: boolean;
  jokerCount: number;
  queenOfSpadesCancelsBattleCards: boolean;
  queenOfHeartsCancelsBattleCards: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  playerId?: string;
  playerName?: string;
  type: 'PLAY_CARDS' | 'DRAW_CARDS' | 'PASS_TURN' | 'MAKAO' | 'STOP_MAKAO' | 'PENALTY' | 'GAME_START' | 'GAME_END' | 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'TURN_SKIPPED';
  cards?: Card[];
  details?: string;
}

export interface GameState {
  roomId: string;
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  turnDirection: 1 | -1;
  status: 'waiting' | 'playing' | 'finished';
  requestedSuit: Suit | null;
  requestedRank: Rank | null;
  requestedRankBy: string | null;
  requestedRankPlayed: boolean;
  requestedRankTurns?: number;
  drawPenalty: number;
  skipPenalty: number;
  hasDrawnCard?: boolean;
  winner: string | null;
  rules: GameRules;
  turnEndTime?: number;
  history: GameEvent[];
}

export type ServerMessage =
  | { type: 'INIT'; state: GameState; playerId: string }
  | { type: 'UPDATE'; state: GameState }
  | { type: 'ERROR'; message: string };

export type ClientMessage =
  | { type: 'JOIN'; roomId: string; name: string; rules?: GameRules; playerId?: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'READY' }
  | { type: 'PLAY_CARDS'; cardIds: string[]; requestedSuit?: Suit; requestedRank?: Rank; jokerRank?: Rank; jokerSuit?: Suit }
  | { type: 'DRAW_CARD' }
  | { type: 'PASS_TURN' }
  | { type: 'MAKAO' }
  | { type: 'STOP_MAKAO'; targetPlayerId: string }
  | { type: 'UPDATE_RULES'; rules: GameRules }
  | { type: 'ADD_BOT'; difficulty: 'easy' | 'medium' | 'hard' }
  | { type: 'REMOVE_PLAYER'; playerId: string };
