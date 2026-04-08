import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Spade, Settings, ChevronRight, AlertCircle } from 'lucide-react';
import { GameRules } from '../../types';
import { DEFAULT_RULES } from '../../constants';
import { PreJoinSettingsModal } from '../modals/PreJoinSettingsModal';

interface Props {
  onJoin: (roomId: string, name: string, rules: GameRules) => void;
  error: string | null;
}

export const JoinScreen = ({ onJoin, error }: Props) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [showPreJoinSettings, setShowPreJoinSettings] = useState(false);
  const [preJoinRules, setPreJoinRules] = useState<GameRules>(DEFAULT_RULES);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 relative overflow-hidden">
            <Spade className="w-12 h-12 text-white relative z-10" />
            <div className="absolute top-0 right-0 w-8 h-8 bg-red-500 rotate-45 translate-x-4 -translate-y-4"></div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-baseline gap-2">
            Makao
            <span className="text-sm text-slate-400 font-mono font-normal not-italic">v1.1.0</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">Multiplayer Card Game</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Your Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 ml-1">Room ID</label>
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <button 
            onClick={() => setShowPreJoinSettings(true)}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" /> Game Settings
          </button>

          <button 
            onClick={() => onJoin(roomId, name, preJoinRules)}
            disabled={!name || !roomId}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
          >
            Join Game <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <AnimatePresence>
          {showPreJoinSettings && (
            <PreJoinSettingsModal
              rules={preJoinRules}
              setRules={setPreJoinRules}
              onClose={() => setShowPreJoinSettings(false)}
            />
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
