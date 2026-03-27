import React from 'react';
import { motion } from 'motion/react';
import { Settings, XCircle } from 'lucide-react';
import { GameRules } from '../../types';

interface Props {
  rules: GameRules;
  onClose: () => void;
}

export const SettingsModal = ({ rules, onClose }: Props) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Game Rules
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">Draw on 2s</p>
                <p className="text-xs text-slate-400">Cards to draw when a 2 is played</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.drawCardsOn2}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">Draw on 3s</p>
                <p className="text-xs text-slate-400">Cards to draw when a 3 is played</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.drawCardsOn3}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">King of Spades</p>
                <p className="text-xs text-slate-400">Penalty for previous player</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.drawCardsOnKingSpades}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">Jokers</p>
                <p className="text-xs text-slate-400">Number of Jokers in deck</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.jokerCount}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">Queen of Spades</p>
                <p className="text-xs text-slate-400">Cancels battle cards</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.queenOfSpadesCancelsBattleCards ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
              <div>
                <p className="font-bold">Queen of Hearts</p>
                <p className="text-xs text-slate-400">Cancels battle cards</p>
              </div>
              <div className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center font-bold">
                {rules.queenOfHeartsCancelsBattleCards ? 'Yes' : 'No'}
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">Rules are locked during game</p>
          </div>
        </div>
        <div className="p-6 bg-slate-800/50">
          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 py-3 rounded-xl font-bold"
          >
            Save & Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
