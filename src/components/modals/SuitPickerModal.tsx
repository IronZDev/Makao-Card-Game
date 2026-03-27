import React from 'react';
import { motion } from 'motion/react';
import { Suit } from '../../types';
import { SUITS } from '../../constants';
import { SuitIcon } from '../ui/SuitIcon';

interface Props {
  onSelect: (suit: Suit) => void;
}

export const SuitPickerModal = ({ onSelect }: Props) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 pb-32"
    >
      <div className="text-center">
        <h3 className="text-2xl font-black uppercase italic mb-8 drop-shadow-lg">Change Color</h3>
        <div className="grid grid-cols-2 gap-4">
          {SUITS.map(suit => (
            <button 
              key={suit}
              onClick={() => onSelect(suit)}
              className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center text-5xl hover:scale-110 transition-transform shadow-2xl"
            >
              <SuitIcon suit={suit} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
