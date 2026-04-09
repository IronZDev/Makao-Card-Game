import React from 'react';
import { AnimatePresence } from 'motion/react';
import { RotateCcw, AlertCircle, SkipForward } from 'lucide-react';
import { GameState } from '../../types';
import { Card } from '../ui/Card';

interface CenterPileProps {
  gameState: GameState;
  isMyTurn: boolean;
  hasValidMove: boolean;
  onDrawCard: () => void;
  onPassTurn: () => void;
}

export const CenterPile: React.FC<CenterPileProps> = ({
  gameState,
  isMyTurn,
  hasValidMove,
  onDrawCard,
  onPassTurn,
}) => {
  return (
    <div className="relative z-10 flex items-center gap-8 md:gap-16 mt-24 md:mt-32">
      {/* Draw Pile */}
      <div 
        onClick={() => isMyTurn && (gameState.hasDrawnCard ? onPassTurn() : onDrawCard())}
        className={`group relative cursor-pointer ${!isMyTurn ? 'opacity-50 grayscale' : ''}`}
      >
        <div className={`w-20 h-28 md:w-28 md:h-40 bg-indigo-900 rounded-xl border-2 shadow-xl flex items-center justify-center transition-transform group-hover:-translate-y-2 ${isMyTurn && (!hasValidMove || gameState.hasDrawnCard) ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pulse' : 'border-white/20'}`}>
          {gameState.hasDrawnCard ? (
            <SkipForward className={`w-8 h-8 ${isMyTurn ? 'text-emerald-400' : 'text-white/30'}`} />
          ) : (
            <RotateCcw className={`w-8 h-8 ${isMyTurn && !hasValidMove ? 'text-emerald-400' : 'text-white/30'}`} />
          )}
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 whitespace-nowrap">
          {gameState.hasDrawnCard ? (gameState.drawPenalty > 1 ? `Take ${gameState.drawPenalty - 1} Penalty` : 'Pass Turn') : gameState.skipPenalty > 0 ? `Skip ${gameState.skipPenalty} Turn${gameState.skipPenalty > 1 ? 's' : ''}` : gameState.drawPenalty > 0 ? `Draw ${gameState.drawPenalty}` : 'Draw Card'}
        </div>
      </div>

      {/* Discard Pile */}
      <div className="relative w-16 h-24 md:w-24 md:h-36">
        <AnimatePresence>
          {gameState.discardPile.slice(-3).map((card, i) => {
            // Deterministic rotation based on card id to prevent moving on every render
            const rotation = (card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 20) - 10;
            return (
              <Card 
                key={card.id} 
                card={card} 
                isPlayable={false} 
                rotation={rotation}
                style={{ position: 'absolute', top: 0, left: 0 }}
              />
            );
          })}
        </AnimatePresence>
        
        {/* Requests Indicators */}
        {(gameState.requestedSuit || gameState.requestedRank) && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 flex flex-col items-center gap-1 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {gameState.requestedSuit ? `Color Changed: ${gameState.requestedSuit.toUpperCase()}` : `Request: ${gameState.requestedRank}`}
              </span>
            </div>
            {gameState.requestedRank && (
              <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">
                {gameState.requestedRankPlayed ? "(Locked)" : "(Can be changed with J)"}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
