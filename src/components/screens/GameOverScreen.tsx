import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, LogOut } from 'lucide-react';
import { GameState, ClientMessage } from '../../types';

interface Props {
  gameState: GameState;
  playerId: string | null;
  sendMessage: (msg: ClientMessage) => void;
}

export const GameOverScreen = ({ gameState, playerId, sendMessage }: Props) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  return (
    <div className="text-center z-20 relative">
      <div className="absolute -top-16 right-0 z-50">
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-full border border-red-500/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">Leave Room</span>
        </button>
      </div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/90 backdrop-blur-2xl p-12 rounded-[40px] border border-white/10 shadow-2xl"
      >
        <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
        <h2 className="text-4xl font-black tracking-tighter uppercase italic mb-2">Game Over!</h2>
        <p className="text-slate-400 text-xl mb-8">
          {gameState.winner === playerId ? "You Won! 🎉" : `${gameState.players.find(p => p.id === gameState.winner)?.name} Won!`}
        </p>

        <div className="flex flex-col gap-2 mb-8 text-left bg-slate-800/50 p-4 rounded-xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Players</h3>
          {gameState.players.map(p => (
            <div key={p.id} className="flex justify-between items-center">
              <span className="text-slate-200">{p.name} {p.id === playerId ? '(You)' : ''}</span>
              <span className={`text-sm font-bold ${p.isReady ? 'text-green-400' : 'text-slate-500'}`}>
                {p.isReady ? 'Ready' : 'Waiting...'}
              </span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={() => sendMessage({ type: 'READY' })}
          className={`font-bold py-4 px-12 rounded-2xl shadow-lg transition-all ${
            gameState.players.find(p => p.id === playerId)?.isReady
              ? 'bg-green-600 hover:bg-green-500 shadow-green-600/20 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 text-white'
          }`}
        >
          {gameState.players.find(p => p.id === playerId)?.isReady ? 'Waiting for others...' : 'Play Again'}
        </button>
      </motion.div>

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-left"
            >
              <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
              <p className="text-slate-300 mb-6 text-sm">
                Are you sure you want to leave the room?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 rounded-lg font-bold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLeaveConfirm(false);
                    sendMessage({ type: 'LEAVE_ROOM' });
                  }}
                  className="px-4 py-2 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Leave Room
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
