import React from 'react';
import { motion } from 'motion/react';
import { Settings, XCircle } from 'lucide-react';
import { GameRules } from '../../types';

interface Props {
  rules: GameRules;
  setRules: (rules: GameRules) => void;
  onClose: () => void;
}

export const PreJoinSettingsModal = ({ rules, setRules, onClose }: Props) => {
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
        className="bg-slate-900 w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl text-white"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Initial Game Rules
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">Draw on 2s</p>
              <p className="text-xs text-slate-400">Cards to draw</p>
            </div>
            <input 
              type="number" 
              value={rules.drawCardsOn2}
              onChange={(e) => setRules({ ...rules, drawCardsOn2: parseInt(e.target.value) })}
              className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">Draw on 3s</p>
              <p className="text-xs text-slate-400">Cards to draw</p>
            </div>
            <input 
              type="number" 
              value={rules.drawCardsOn3}
              onChange={(e) => setRules({ ...rules, drawCardsOn3: parseInt(e.target.value) })}
              className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">King of Spades</p>
              <p className="text-xs text-slate-400">Penalty cards</p>
            </div>
            <input 
              type="number" 
              value={rules.drawCardsOnKingSpades}
              onChange={(e) => setRules({ ...rules, drawCardsOnKingSpades: parseInt(e.target.value) })}
              className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">Jokers</p>
              <p className="text-xs text-slate-400">Number in deck</p>
            </div>
            <input 
              type="number" 
              min="0"
              max="4"
              value={rules.jokerCount}
              onChange={(e) => setRules({ ...rules, jokerCount: parseInt(e.target.value) })}
              className="w-16 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">Queen of Spades</p>
              <p className="text-xs text-slate-400">Cancels battle cards</p>
            </div>
            <input 
              type="checkbox" 
              checked={rules.queenOfSpadesCancelsBattleCards}
              onChange={(e) => setRules({ ...rules, queenOfSpadesCancelsBattleCards: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div>
              <p className="font-bold">Queen of Hearts</p>
              <p className="text-xs text-slate-400">Cancels battle cards</p>
            </div>
            <input 
              type="checkbox" 
              checked={rules.queenOfHeartsCancelsBattleCards}
              onChange={(e) => setRules({ ...rules, queenOfHeartsCancelsBattleCards: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="p-6 bg-slate-800/50">
          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 py-3 rounded-xl font-bold"
          >
            Apply Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
