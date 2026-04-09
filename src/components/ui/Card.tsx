import React from 'react';
import { motion } from 'motion/react';
import { Spade } from 'lucide-react';
import { Card as CardType } from '../../types';
import { SuitIcon } from './SuitIcon';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  isHidden?: boolean;
  key?: React.Key;
  style?: React.CSSProperties;
  rotation?: number;
}

export const Card = ({ card, onClick, isPlayable, isSelected, isHidden, style, rotation }: CardProps) => {
  if (isHidden) {
    return (
      <div className="w-16 h-24 md:w-24 md:h-36 bg-indigo-800 rounded-lg border-2 border-white/20 shadow-lg flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-white/30 rounded-full flex items-center justify-center">
          <div className="w-4 h-4 md:w-6 md:h-6 bg-white/20 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (card.rank === 'Joker') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotate: rotation || 0 }}
        animate={{ scale: 1, opacity: 1, rotate: rotation || 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
        onClick={isPlayable ? onClick : undefined}
        style={style}
        className={`
          w-16 h-24 md:w-24 md:h-36 bg-slate-900 rounded-lg border shadow-md flex flex-col p-1 md:p-2 relative select-none overflow-hidden
          ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 shadow-[0_0_20px_rgba(250,204,21,0.6)] cursor-pointer' : isPlayable ? 'ring-4 ring-emerald-400 ring-offset-2 cursor-pointer' : 'cursor-default'}
          text-indigo-400
        `}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
        <div className="text-[10px] md:text-xs font-black uppercase tracking-tighter leading-none">Joker</div>
        <div className="flex-grow flex items-center justify-center">
          <Spade className="w-8 h-8 md:w-12 md:h-12 text-indigo-500/50" />
        </div>
        <div className="text-[10px] md:text-xs font-black uppercase tracking-tighter leading-none self-end rotate-180">Joker</div>
        
        {card.representedRank && card.representedSuit && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] z-10">
            <span className="text-white text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-1">Acts as</span>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full shadow-lg">
              <span className={`text-xs md:text-sm font-black ${card.representedSuit === 'hearts' || card.representedSuit === 'diamonds' ? 'text-red-600' : 'text-slate-900'}`}>
                {card.representedRank}
              </span>
              <div className="w-3 h-3 md:w-4 md:h-4">
                <SuitIcon suit={card.representedSuit} />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, rotate: rotation || 0 }}
      animate={{ scale: 1, opacity: 1, rotate: rotation || 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      whileHover={isPlayable ? { y: -20, scale: 1.05 } : {}}
      onClick={isPlayable ? onClick : undefined}
      style={style}
      className={`
        w-16 h-24 md:w-24 md:h-36 bg-white rounded-lg border shadow-md flex flex-col p-1 md:p-2 relative select-none
        ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 shadow-[0_0_20px_rgba(250,204,21,0.6)] cursor-pointer' : isPlayable ? 'ring-4 ring-emerald-400 ring-offset-2 cursor-pointer' : 'cursor-default'}
        ${isRed ? 'text-red-600' : 'text-slate-900'}
      `}
    >
      <div className="text-xs md:text-lg font-bold leading-none">{card.rank}</div>
      <div className="text-xs md:text-sm leading-none"><SuitIcon suit={card.suit} /></div>
      <div className="flex-grow flex items-center justify-center text-2xl md:text-5xl">
        <SuitIcon suit={card.suit} />
      </div>
      <div className="text-xs md:text-lg font-bold leading-none self-end rotate-180">{card.rank}</div>
      <div className="text-xs md:text-sm leading-none self-end rotate-180"><SuitIcon suit={card.suit} /></div>
    </motion.div>
  );
};
