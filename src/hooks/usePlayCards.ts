import { useState } from 'react';
import { Rank, Suit, GameState, ClientMessage } from '../types';

export function usePlayCards(
  gameState: GameState | null, 
  playerId: string | null, 
  sendMessage: (msg: ClientMessage) => void
) {
  const [showSuitPicker, setShowSuitPicker] = useState(false);
  const [showRankPicker, setShowRankPicker] = useState(false);
  const [showJokerPicker, setShowJokerPicker] = useState(false);
  const [pendingCardIds, setPendingCardIds] = useState<string[]>([]);
  const [pendingJokerValue, setPendingJokerValue] = useState<{rank: Rank, suit: Suit} | null>(null);

  const proceedWithPlay = (cardIds: string[], effectiveRank: Rank, jokerValue?: {rank: Rank, suit: Suit}) => {
    if (effectiveRank === 'A') {
      setPendingCardIds(cardIds);
      if (jokerValue) setPendingJokerValue(jokerValue);
      setShowSuitPicker(true);
    } else if (effectiveRank === 'J') {
      setPendingCardIds(cardIds);
      if (jokerValue) setPendingJokerValue(jokerValue);
      setShowRankPicker(true);
    } else {
      sendMessage({ 
        type: 'PLAY_CARDS', 
        cardIds, 
        jokerRank: jokerValue?.rank, 
        jokerSuit: jokerValue?.suit 
      });
      setPendingJokerValue(null);
    }
  };

  const handlePlayCards = (cardIds: string[]) => {
    const currentPlayer = gameState?.players.find(p => p.id === playerId);
    if (!currentPlayer || cardIds.length === 0) return;
    
    const cards = cardIds.map(id => currentPlayer.hand.find(c => c.id === id)).filter(Boolean);
    if (cards.length === 0) return;
    
    // Find the rank of the group (ignoring Jokers)
    const nonJoker = cards.find(c => c?.rank !== 'Joker');
    const groupRank = nonJoker ? nonJoker?.rank : 'Joker';

    if (groupRank === 'Joker') {
      setPendingCardIds(cardIds);
      setShowJokerPicker(true);
      return;
    }

    proceedWithPlay(cardIds, groupRank);
  };

  const handleSuitSelect = (suit: Suit) => {
    if (pendingCardIds.length > 0) {
      sendMessage({ 
        type: 'PLAY_CARDS', 
        cardIds: pendingCardIds, 
        requestedSuit: suit,
        jokerRank: pendingJokerValue?.rank,
        jokerSuit: pendingJokerValue?.suit
      });
      setPendingCardIds([]);
      setPendingJokerValue(null);
      setShowSuitPicker(false);
    }
  };

  const handleRankSelect = (rank: Rank) => {
    if (pendingCardIds.length > 0) {
      sendMessage({ 
        type: 'PLAY_CARDS', 
        cardIds: pendingCardIds, 
        requestedRank: rank,
        jokerRank: pendingJokerValue?.rank,
        jokerSuit: pendingJokerValue?.suit
      });
      setPendingCardIds([]);
      setPendingJokerValue(null);
      setShowRankPicker(false);
    }
  };

  const handleJokerSelect = (rank: Rank, suit: Suit) => {
    if (pendingCardIds.length > 0) {
      setShowJokerPicker(false);
      proceedWithPlay(pendingCardIds, rank, { rank, suit });
    }
  };

  return {
    handlePlayCards,
    showSuitPicker,
    showRankPicker,
    showJokerPicker,
    handleSuitSelect,
    handleRankSelect,
    handleJokerSelect,
  };
}
