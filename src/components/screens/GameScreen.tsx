import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { DropResult } from '@hello-pangea/dnd';
import { GameState, ClientMessage, Card as CardType } from '../../types';
import { GameHistory } from '../ui/GameHistory';
import { isValidMove } from '../../utils/gameLogic';
import { TopBar } from '../game/TopBar';
import { LeaveConfirmModal } from '../game/LeaveConfirmModal';
import { CenterPile } from '../game/CenterPile';
import { Opponents } from '../game/Opponents';
import { PlayerHand } from '../game/PlayerHand';
import { PlayerControls } from '../game/PlayerControls';

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
  const [lastStopMakaoTime, setLastStopMakaoTime] = useState<number>(0);
  const [localHandOrder, setLocalHandOrder] = useState<string[]>([]);
  
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex].id === playerId && !currentPlayer?.isFinished;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const hasValidMove = currentPlayer?.hand.some(card => isValidMove(card, topCard, gameState)) ?? false;

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
    const interval = setInterval(() => {
      setNow(Date.now());
      if (gameState.turnEndTime) {
        const remaining = Math.max(0, Math.floor((gameState.turnEndTime - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);
    
    setNow(Date.now());
    if (gameState.turnEndTime) {
      setTimeLeft(Math.max(0, Math.floor((gameState.turnEndTime - Date.now()) / 1000)));
    }

    return () => clearInterval(interval);
  }, [gameState.turnEndTime]);

  const handleCardClick = (card: CardType) => {
    if (!isMyTurn) return;

    if (selectedCardIds.includes(card.id)) {
      setSelectedCardIds(prev => prev.filter(id => id !== card.id));
      return;
    }

    if (selectedCardIds.length === 0) {
      if (isValidMove(card, topCard, gameState)) {
        setSelectedCardIds([card.id]);
      }
    } else {
      const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean) as CardType[];
      const nonJoker = selectedCards.find(c => c.rank !== 'Joker');
      const groupRank = nonJoker ? nonJoker.rank : 'Joker';
      
      if (card.rank === 'Joker' || groupRank === 'Joker' || card.rank === groupRank) {
        setSelectedCardIds(prev => [...prev, card.id]);
      } else {
        if (isValidMove(card, topCard, gameState)) {
          setSelectedCardIds([card.id]);
        }
      }
    }
  };

  const handlePlayCards = () => {
    const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find(c => c.id === id)).filter(Boolean) as CardType[];
    if (selectedCards.some(c => isValidMove(c, topCard, gameState))) {
      onPlayCards(selectedCardIds);
      setSelectedCardIds([]);
    }
  };

  const handleStopMakao = () => {
    if (now - lastStopMakaoTime < 5000) return;
    setLastStopMakaoTime(Date.now());
    const target = gameState.players.find(p => p.hand.length === 1 && !p.isMakao && p.id !== playerId && (!p.makaoTime || now - p.makaoTime > 10000));
    if (target) sendMessage({ type: 'STOP_MAKAO', targetPlayerId: target.id });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <TopBar 
        timeLeft={timeLeft} 
        onShowHistory={() => setShowHistory(true)} 
        onShowLeaveConfirm={() => setShowLeaveConfirm(true)} 
      />

      <div className="flex-grow relative flex items-center justify-center p-4">
        <div className="w-full h-full relative flex items-center justify-center">
          {/* Table */}
          <div className="absolute w-[95vw] h-[45vh] md:w-[70vw] md:h-[45vh] bg-emerald-900/50 rounded-[100px] border-8 border-emerald-800/50 shadow-inner mt-24 md:mt-32"></div>

          <Opponents gameState={gameState} playerId={playerId} />

          <CenterPile 
            gameState={gameState} 
            isMyTurn={isMyTurn} 
            hasValidMove={hasValidMove} 
            onDrawCard={() => sendMessage({ type: 'DRAW_CARD' })} 
            onPassTurn={() => sendMessage({ type: 'PASS_TURN' })} 
          />
        </div>
      </div>

      <footer className="p-4 md:p-8 z-10 relative">
        <div className="max-w-5xl mx-auto">
          <PlayerControls 
            currentPlayer={currentPlayer} 
            isMyTurn={isMyTurn} 
            now={now} 
            lastStopMakaoTime={lastStopMakaoTime} 
            onMakao={() => sendMessage({ type: 'MAKAO' })} 
            onStopMakao={handleStopMakao} 
          />

          <PlayerHand 
            gameState={gameState} 
            currentPlayer={currentPlayer} 
            isMyTurn={isMyTurn} 
            localHandOrder={localHandOrder} 
            selectedCardIds={selectedCardIds} 
            onDragEnd={onDragEnd} 
            onCardClick={handleCardClick} 
            onPlayCards={handlePlayCards} 
          />
        </div>
      </footer>

      <AnimatePresence>
        {showLeaveConfirm && (
          <LeaveConfirmModal 
            onCancel={() => setShowLeaveConfirm(false)} 
            onConfirm={() => {
              setShowLeaveConfirm(false);
              sendMessage({ type: 'LEAVE_ROOM' });
            }} 
          />
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
