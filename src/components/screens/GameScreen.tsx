import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { User, Bot, RotateCcw, AlertCircle, Trophy, LogOut, Clock, SkipForward, History } from 'lucide-react';
import { GameState, ClientMessage, Card as CardType } from '../../types';
import { Card } from '../ui/Card';
import { GameHistory } from '../ui/GameHistory';
import { isValidMove } from '../../utils/gameLogic';

interface Props {
  gameState: GameState;
  playerId: string | null;
  sendMessage: (msg: ClientMessage) => void;
  onPlayCards: (cardIds: string[]) => void;
}

export const GameScreen = ({ gameState, playerId, sendMessage, onPlayCards }: Props) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [now, setNow] = useState<number>(Date.now());
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [localHandOrder, setLocalHandOrder] = useState<string[]>([]);
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === playerId && !currentPlayer?.isFinished;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const hasValidMove = currentPlayer?.hand.some(card => isValidMove(card, topCard, gameState));

  useEffect(() => {
    if (currentPlayer) {
      const newHandIds = currentPlayer.hand.map(c => c.id);
      setLocalHandOrder(prev => {
        const updatedOrder = prev.filter(id => newHandIds.includes(id));
        const newCards = newHandIds.filter(id => !prev.includes(id));
        if (updatedOrder.length !== prev.length || newCards.length > 0) {
          return [...updatedOrder, ...newCards];
        }
        return prev;
      });
    }
  }, [currentPlayer?.hand.map(c => c.id).join(',')]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(localHandOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setLocalHandOrder(items);
  };

  useEffect(() => {
    if (!gameState.turnEndTime) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((gameState.turnEndTime! - Date.now()) / 1000));
      setTimeLeft(remaining);
      setNow(Date.now());
    }, 1000);
    
    // Initial calculation
    setTimeLeft(Math.max(0, Math.floor((gameState.turnEndTime - Date.now()) / 1000)));
    setNow(Date.now());

    return () => clearInterval(interval);
  }, [gameState.turnEndTime]);

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn) return;

    if (selectedCardIds.includes(card.id)) {
      // Deselect
      setSelectedCardIds(prev => prev.filter(id => id !== card.id));
      return;
    }

    // If selecting a new card
    if (selectedCardIds.length === 0) {
      if (isValidMove(card, topCard, gameState)) {
        setSelectedCardIds([card.id]);
      }
    } else {
      // Check if it has the same rank as the currently selected cards (or is a Joker)
      const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean) as CardType[];
      const nonJoker = selectedCards.find(c => c.rank !== 'Joker');
      const groupRank = nonJoker ? nonJoker.rank : 'Joker';
      
      if (card.rank === 'Joker' || groupRank === 'Joker' || card.rank === groupRank) {
        setSelectedCardIds(prev => [...prev, card.id]);
      } else {
        // If different rank, but valid on its own, replace selection
        if (isValidMove(card, topCard, gameState)) {
          setSelectedCardIds([card.id]);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
          <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`} />
          <span className={`font-mono font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-emerald-400'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 px-4 py-2 rounded-full border border-indigo-500/30 transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="text-sm font-bold hidden md:inline">History</span>
          </button>
          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 px-4 py-2 rounded-full border border-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold hidden md:inline">Leave Room</span>
          </button>
        </div>
      </div>

      <div className="flex-grow relative flex items-center justify-center p-4">
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Table */}
          <div className="absolute w-[95vw] h-[45vh] md:w-[70vw] md:h-[45vh] bg-emerald-900/50 rounded-[100px] border-8 border-emerald-800/50 shadow-inner mt-24 md:mt-32"></div>

          {/* Other Players */}
          {(() => {
            const myIndex = gameState.players.findIndex(p => p.id === playerId);
            const orderedOtherPlayers = [];
            if (myIndex !== -1) {
              for (let i = 1; i < gameState.players.length; i++) {
                orderedOtherPlayers.push(gameState.players[(myIndex + i) % gameState.players.length]);
              }
            } else {
              orderedOtherPlayers.push(...gameState.players.filter(p => p.id !== playerId));
            }

            return orderedOtherPlayers.map((p, idx) => {
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
                    {Array.from({ length: Math.min(p.hand.length, 5) }).map((_, i) => (
                      <div key={i} className="w-6 h-9 md:w-8 md:h-12 bg-indigo-900 rounded border border-white/20 shadow-sm rotate-12"></div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })})()}

          {/* Center Pile */}
          <div className="relative z-10 flex items-center gap-8 md:gap-16 mt-24 md:mt-32">
            {/* Draw Pile */}
            <div 
              onClick={() => isMyTurn && (gameState.hasDrawnCard ? sendMessage({ type: 'PASS_TURN' }) : sendMessage({ type: 'DRAW_CARD' }))}
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
            <div className="relative">
              <AnimatePresence mode="popLayout">
                {gameState.discardPile.slice(-3).map((card, i) => {
                  // Deterministic rotation based on card id to prevent moving on every render
                  const rotation = (card.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 20) - 10;
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ scale: 0.8, opacity: 0, rotate: rotation }}
                      animate={{ scale: 1, opacity: 1, rotate: rotation }}
                      style={{ position: i === 0 ? 'relative' : 'absolute', top: 0, left: 0 }}
                    >
                      <Card card={card} isPlayable={false} />
                    </motion.div>
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
        </div>
      </div>

      {/* Footer / Player Hand */}
      <footer className="p-4 md:p-8 z-10 relative">
        <div className="max-w-5xl mx-auto">
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
                  onClick={() => sendMessage({ type: 'MAKAO' })}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-4 py-2 rounded-lg uppercase italic shadow-lg shadow-red-600/20"
                >
                  Makao!
                </button>
              )}
              <button 
                onClick={() => {
                  const target = gameState.players.find(p => p.hand.length === 1 && !p.isMakao && p.id !== playerId && (!p.makaoTime || now - p.makaoTime > 10000));
                  if (target) sendMessage({ type: 'STOP_MAKAO', targetPlayerId: target.id });
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-black px-4 py-2 rounded-lg uppercase italic border border-white/10"
              >
                Stop Makao!
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-4 pb-4 px-4 relative">
            {selectedCardIds.length > 0 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
                <button
                  onClick={() => {
                    const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean) as CardType[];
                    if (selectedCards.some(c => isValidMove(c, topCard, gameState))) {
                      onPlayCards(selectedCardIds);
                      setSelectedCardIds([]);
                    }
                  }}
                  disabled={!selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean).some(c => isValidMove(c as CardType, topCard, gameState))}
                  className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black px-6 py-2 rounded-full uppercase italic shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-transform hover:scale-105"
                >
                  Play {selectedCardIds.length} Card{selectedCardIds.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
            
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="hand" direction="horizontal">
                {(provided) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex justify-center -space-x-6 md:-space-x-10 overflow-x-auto scrollbar-hide pt-20 pb-4 px-4"
                  >
                    {localHandOrder.map((cardId, index) => {
                      const card = currentPlayer?.hand.find(c => c.id === cardId);
                      if (!card) return null;

                      const isSelected = selectedCardIds.includes(card.id);
                      const isBattleKing = card.rank === 'K' && (card.suit === 'spades' || card.suit === 'hearts');
                      
                      const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean) as CardType[];
                      const nonJoker = selectedCards.find(c => c.rank !== 'Joker');
                      const groupRank = nonJoker ? nonJoker.rank : 'Joker';
                      const canGroup = card.rank === 'Joker' || groupRank === 'Joker' || card.rank === groupRank;

                      const isPlayable = isMyTurn && (
                        selectedCardIds.length === 0 
                          ? isValidMove(card, topCard, gameState)
                          : (canGroup && !(gameState.requestedRank === 'K' && isBattleKing)) || 
                            isValidMove(card, topCard, gameState)
                      );

                      return (
                        // @ts-ignore - dnd types issue with React 18
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-transform duration-200 ${isSelected ? '-translate-y-8' : ''} ${snapshot.isDragging ? 'z-50' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <Card 
                                card={card} 
                                isPlayable={isPlayable}
                                onClick={() => handleCardClick(card)}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </footer>

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
              className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
              <p className="text-slate-300 mb-6 text-sm">
                Are you sure you want to leave the room? You will lose your current progress in this game.
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

      <GameHistory 
        events={gameState.history || []} 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </div>
  );
};
