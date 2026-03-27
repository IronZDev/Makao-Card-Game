import React from 'react';
import { motion } from 'motion/react';
import { Rank } from '../../types';
import { RANKS } from '../../constants';

interface Props {
  onSelect: (rank?: Rank) => void;
}

export const RankPickerModal = ({ onSelect }: Props) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 pb-32"
    >
      <div className="text-center max-w-lg">
        <h3 className="text-2xl font-black uppercase italic mb-8 drop-shadow-lg">Request a Rank</h3>
        <div className="grid grid-cols-4 gap-3">
          {RANKS.filter(r => !['J', 'A', 'Q', '2', '3', '4', 'Joker'].includes(r)).map(rank => (
            <button 
              key={rank}
              onClick={() => onSelect(rank)}
              className="w-16 h-16 bg-white text-slate-900 rounded-xl flex items-center justify-center text-xl font-bold hover:bg-indigo-100 transition-colors shadow-lg"
            >
              {rank}
            </button>
          ))}
          <button 
            onClick={() => onSelect()}
            className="col-span-4 mt-4 bg-slate-800 py-3 rounded-xl font-bold"
          >
            No Request
          </button>
        </div>
      </div>
    </motion.div>
  );
};
