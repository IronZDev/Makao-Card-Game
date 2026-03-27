import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Bot, CheckCircle2, Trash2, Plus, Trophy, LogOut } from 'lucide-react';
import { GameState, Player, ClientMessage } from '../../types';

interface Props {
  gameState: GameState;
  playerId: string | null;
  sendMessage: (msg: ClientMessage) => void;
}

export const LobbyScreen = ({ gameState, playerId, sendMessage }: Props) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const currentPlayer = gameState.players.find(p => p.id === playerId);

  return (
    <div className="text-center max-w-md w-full relative">
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
        className="bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
      >
        <Users className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">Waiting for Players</h3>
        <p className="text-slate-400 mb-6">Need at least 2 players to start. Everyone must be ready.</p>
        
        <div className="space-y-3 mb-8">
          {gameState.players.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.isBot ? 'bg-slate-700' : 'bg-indigo-500'}`}>
                  {p.isBot ? <Bot className="w-4 h-4" /> : p.name[0].toUpperCase()}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{p.name} {p.id === playerId && "(You)"}</span>
                  <div className="flex gap-2 items-center">
                    {p.isBot && <span className="text-[10px] text-slate-500 uppercase font-bold">{p.difficulty}</span>}
                    {p.wins !== undefined && p.wins > 0 && (
                      <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-0.5">
                        <Trophy className="w-3 h-3" /> {p.wins}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.isReady ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20"></div>
                )}
                {p.isBot && (
                  <button 
                    onClick={() => sendMessage({ type: 'REMOVE_PLAYER', playerId: p.id })}
                    className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {gameState.players.length < 4 && (
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 text-left ml-1">Add AI Opponent</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <button 
                    key={diff}
                    onClick={() => sendMessage({ type: 'ADD_BOT', difficulty: diff })}
                    className="flex flex-col items-center gap-1 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors group"
                  >
                    <Plus className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase">{diff}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => sendMessage({ type: 'READY' })}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
            currentPlayer?.isReady 
              ? 'bg-slate-700 text-slate-300' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
          }`}
        >
          {currentPlayer?.isReady ? "Ready!" : "I'm Ready"}
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
