import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, X, User, Play, Download, SkipForward, AlertCircle, Trophy, Flag } from 'lucide-react';
import { GameEvent, Card as CardType } from '../../types';
import { SuitIcon } from './SuitIcon';

interface Props {
  events: GameEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export const GameHistory = ({ events, isOpen, onClose }: Props) => {
  const getEventIcon = (type: GameEvent['type']) => {
    switch (type) {
      case 'PLAY_CARDS': return <Play className="w-4 h-4 text-emerald-400" />;
      case 'DRAW_CARDS': return <Download className="w-4 h-4 text-blue-400" />;
      case 'PASS_TURN': return <SkipForward className="w-4 h-4 text-slate-400" />;
      case 'MAKAO': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'STOP_MAKAO': return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'PENALTY': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'GAME_START': return <Flag className="w-4 h-4 text-indigo-400" />;
      case 'GAME_END': return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'FINISH': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'PLAYER_JOINED': return <User className="w-4 h-4 text-emerald-400" />;
      case 'PLAYER_LEFT': return <User className="w-4 h-4 text-slate-500" />;
      case 'TURN_SKIPPED': return <SkipForward className="w-4 h-4 text-orange-400" />;
      default: return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderCardMini = (card: CardType) => {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    return (
      <div key={card.id} className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded text-xs font-bold border border-slate-200 shadow-sm mx-0.5">
        <span className={isRed ? 'text-red-500' : 'text-slate-800'}>
          {card.rank === 'Joker' ? 'J' : card.rank}
        </span>
        <SuitIcon suit={card.suit} className={`w-3 h-3 ${isRed ? 'text-red-500' : 'text-slate-800'}`} />
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-white/10 shadow-2xl z-[101] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">Game History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {events.length === 0 ? (
                <div className="text-center text-slate-500 mt-10">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No events yet</p>
                </div>
              ) : (
                [...events].reverse().map((event) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={event.id}
                    className="bg-slate-800/50 border border-white/5 rounded-xl p-3 flex gap-3"
                  >
                    <div className="mt-1 bg-slate-900 p-2 rounded-lg h-fit border border-white/5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-200 truncate">
                          {event.playerName || 'System'}
                        </span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-400">
                        {event.type === 'PLAY_CARDS' && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span>{event.details || 'Played'}</span>
                            {event.cards?.map(renderCardMini)}
                          </div>
                        )}
                        {event.type === 'DRAW_CARDS' && <span>{event.details || 'Drew cards'}</span>}
                        {event.type === 'PASS_TURN' && <span>Passed turn</span>}
                        {event.type === 'MAKAO' && <span className="text-red-400 font-bold italic">Said Makao!</span>}
                        {event.type === 'STOP_MAKAO' && <span className="text-orange-400 font-bold">{event.details}</span>}
                        {event.type === 'PENALTY' && <span className="text-red-400">{event.details}</span>}
                        {event.type === 'GAME_START' && <span className="text-indigo-400">{event.details}</span>}
                        {event.type === 'GAME_END' && <span className="text-yellow-400 font-bold">{event.details}</span>}
                        {event.type === 'FINISH' && <span className="text-yellow-500 font-bold">{event.details}</span>}
                        {event.type === 'PLAYER_JOINED' && <span className="text-emerald-400">{event.details}</span>}
                        {event.type === 'PLAYER_LEFT' && <span className="text-slate-500">{event.details}</span>}
                        {event.type === 'TURN_SKIPPED' && <span className="text-orange-400">{event.details}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
