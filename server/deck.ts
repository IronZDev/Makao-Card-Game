import { Card, Suit, Rank } from "../src/types.ts";
import { v4 as uuidv4 } from "uuid";

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(jokerCount: number = 3): Card[] {
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
