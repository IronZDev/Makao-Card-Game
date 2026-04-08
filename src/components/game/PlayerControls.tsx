import React from 'react';
import { User, Trophy } from 'lucide-react';

interface PlayerControlsProps {
  currentPlayer: any;
  isMyTurn: boolean;
  now: number;
  lastStopMakaoTime: number;
  onMakao: () => void;
  onStopMakao: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentPlayer,
  isMyTurn,
  now,
  lastStopMakaoTime,
  onMakao,
  onStopMakao,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative ${isMyTurn ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/20 bg-white/5'}`}>
          <User className="w-5 h-5" />
          {currentPlayer?.wins !== undefined && currentPlayer.wins > 0 && (
            <div className="absolute -bottom-2 -left-2 bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white flex items-center gap-0.5">
              <Trophy className="w-2.5 h-2.5" /> {currentPlayer.wins}
            </div>
          )}
          {currentPlayer?.skipTurns !== undefined && currentPlayer.skipTurns > 0 && (
            <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white flex items-center gap-0.5">
              Skip {currentPlayer.skipTurns}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{currentPlayer?.name} (You)</p>
          <p className={`text-[10px] font-black uppercase tracking-widest ${currentPlayer?.isFinished ? 'text-yellow-500' : isMyTurn ? 'text-emerald-400' : 'text-slate-500'}`}>
            {currentPlayer?.isFinished ? `${currentPlayer.finishedRank}${currentPlayer.finishedRank === 1 ? 'st' : currentPlayer.finishedRank === 2 ? 'nd' : currentPlayer.finishedRank === 3 ? 'rd' : 'th'} Place` : isMyTurn ? "Your Turn" : "Waiting..."}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {currentPlayer && currentPlayer.hand.length === 1 && !currentPlayer.isMakao && (
          <button 
            onClick={onMakao}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2 rounded-lg uppercase italic shadow-lg shadow-red-600/20"
          >
            Makao!
          </button>
        )}
        <button 
          onClick={onStopMakao}
          disabled={now - lastStopMakaoTime < 5000}
          className="disabled:opacity-50 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 text-white text-xs font-black px-4 py-2 rounded-lg uppercase italic border border-white/10 transition-colors"
        >
          {now - lastStopMakaoTime < 5000 ? `Wait ${Math.ceil((5000 - (now - lastStopMakaoTime)) / 1000)}s` : 'Stop Makao!'}
        </button>
      </div>
    </div>
  );
};
