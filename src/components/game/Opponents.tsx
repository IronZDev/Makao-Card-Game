import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, Trophy } from 'lucide-react';
import { GameState } from '../../types';

interface OpponentsProps {
  gameState: GameState;
  playerId: string | null;
}

export const Opponents: React.FC<OpponentsProps> = ({ gameState, playerId }) => {
  const myIndex = gameState.players.findIndex(p => p.id === playerId);
  const orderedOtherPlayers = [];
  if (myIndex !== -1) {
    for (let i = 1; i < gameState.players.length; i++) {
      orderedOtherPlayers.push(gameState.players[(myIndex + i) % gameState.players.length]);
    }
  } else {
    orderedOtherPlayers.push(...gameState.players.filter(p => p.id !== playerId));
  }

  return (
    <>
      {orderedOtherPlayers.map((p, idx) => {
        const totalOthers = orderedOtherPlayers.length;
        const isActive = gameState.players[gameState.currentPlayerIndex].id === p.id;
        
        let topPos = '0%';
        let leftPos = '50%';
        
        if (totalOthers === 2) {
          if (idx === 0) { topPos = '55%'; leftPos = '5%'; }
          if (idx === 1) { topPos = '55%'; leftPos = '95%'; }
        } else if (totalOthers === 3) {
          if (idx === 0) { topPos = '55%'; leftPos = '5%'; }
          if (idx === 1) { topPos = '0%'; leftPos = '50%'; }
          if (idx === 2) { topPos = '55%'; leftPos = '95%'; }
        }
        
        return (
          <div 
            key={p.id}
            className="absolute transition-all duration-500 z-10"
            style={{
              top: topPos,
              left: leftPos,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-70'}`}>
              <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-slate-800 relative ${isActive ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]' : 'border-white/10'}`}>
                {p.isBot ? <Bot className="w-6 h-6 md:w-8 md:h-8 text-slate-400" /> : <User className="w-6 h-6 md:w-8 md:h-8" />}
                {p.isFinished && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-black px-2 py-1 rounded-full border-2 border-white uppercase italic">
                    {p.finishedRank}{p.finishedRank === 1 ? 'st' : p.finishedRank === 2 ? 'nd' : p.finishedRank === 3 ? 'rd' : 'th'} Place
                  </div>
                )}
                {!p.isFinished && p.isMakao && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-[10px] font-black px-2 py-1 rounded-full border-2 border-white uppercase italic">Makao</div>
                )}
                {p.skipTurns !== undefined && p.skipTurns > 0 && (
                  <div className="absolute -top-2 -left-2 bg-purple-500 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-white uppercase">
                    Skip {p.skipTurns}
                  </div>
                )}
                {p.wins !== undefined && p.wins > 0 && (
                  <div className="absolute -bottom-2 -left-2 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5" /> {p.wins}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm font-bold truncate max-w-[80px]">{p.name}</p>
                <p className="text-[10px] text-emerald-400 font-bold">{p.hand.length} Cards</p>
              </div>
              <div className="flex -space-x-4">
                <AnimatePresence>
                  {Array.from({ length: Math.min(p.hand.length, 5) }).map((_, i) => (
                    <motion.div 
                      key={`${p.id}-card-${i}`}
                      initial={{ scale: 0, x: -20, opacity: 0 }}
                      animate={{ scale: 1, x: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="w-6 h-9 md:w-8 md:h-12 bg-indigo-900 rounded border border-white/20 shadow-sm rotate-12"
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
