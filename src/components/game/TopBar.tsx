import React from 'react';
import { Clock, History, LogOut } from 'lucide-react';

interface TopBarProps {
  timeLeft: number;
  onShowHistory: () => void;
  onShowLeaveConfirm: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ timeLeft, onShowHistory, onShowLeaveConfirm }) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
      <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
        <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
        <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400'}`}>
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onShowHistory}
          className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/30 transition-colors"
        >
          <History className="w-4 h-4" />
          <span className="text-sm font-bold hidden md:inline">History</span>
        </button>
        <button
          onClick={onShowLeaveConfirm}
          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-full border border-red-500/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold hidden md:inline">Leave Room</span>
        </button>
      </div>
    </div>
  );
};
