import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Suit, Rank, ALL_RANKS, ALL_SUITS } from '../../types';
import { SuitIcon } from '../ui/SuitIcon';

interface Props {
  onSelect: (rank: Rank, suit: Suit) => void;
  disabledRanks?: Rank[];
}

export const JokerPickerModal = ({ onSelect, disabledRanks = [] }: Props) => {
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pb-32">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 p-6 rounded-3xl border border-white/10 shadow-2xl max-w-md w-full mx-4"
      >
        <h2 className="text-2xl font-black text-white mb-6 text-center drop-shadow-md">Joker Represents...</h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">1. Select Rank</h3>
          <div className="grid grid-cols-5 gap-2">
            {ALL_RANKS.map(rank => {
              const isDisabled = disabledRanks.includes(rank);
              return (
                <button
                  key={rank}
                  onClick={() => !isDisabled && setSelectedRank(rank)}
                  disabled={isDisabled}
                  className={`
                    py-2 rounded-xl font-bold text-lg transition-all
                    ${isDisabled ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500' : 
                      selectedRank === rank 
                      ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-110' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                  `}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">2. Select Suit</h3>
          <div className="grid grid-cols-4 gap-3">
            {ALL_SUITS.map(suit => {
              const isRed = suit === 'hearts' || suit === 'diamonds';
              return (
                <button
                  key={suit}
                  onClick={() => setSelectedSuit(suit)}
                  className={`
                    flex items-center justify-center p-4 rounded-2xl transition-all
                    ${selectedSuit === suit 
                      ? 'bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110' 
                      : 'bg-slate-800 hover:bg-slate-700'}
                  `}
                >
                  <div className={`w-8 h-8 ${selectedSuit === suit ? (isRed ? 'text-red-500' : 'text-slate-900') : (isRed ? 'text-red-400' : 'text-slate-300')}`}>
                    <SuitIcon suit={suit} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            if (selectedRank && selectedSuit) {
              onSelect(selectedRank, selectedSuit);
            }
          }}
          disabled={!selectedRank || !selectedSuit}
          className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]"
        >
          Confirm Joker
        </button>
      </motion.div>
    </div>
  );
};
