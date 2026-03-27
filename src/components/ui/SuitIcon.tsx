import React from 'react';
import { Suit } from '../../types';

export const SuitIcon = ({ suit, className = "" }: { suit: Suit, className?: string }) => {
  switch (suit) {
    case 'hearts': return <span className={`text-red-500 ${className}`}>♥</span>;
    case 'diamonds': return <span className={`text-red-500 ${className}`}>♦</span>;
    case 'clubs': return <span className={`text-black ${className}`}>♣</span>;
    case 'spades': return <span className={`text-black ${className}`}>♠</span>;
  }
};
