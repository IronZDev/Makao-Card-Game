import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GameState, Card as CardType } from '../../types';
import { Card } from '../ui/Card';
import { isValidMove } from '../../utils/gameLogic';

interface PlayerHandProps {
  gameState: GameState;
  currentPlayer: any;
  isMyTurn: boolean;
  localHandOrder: string[];
  selectedCardIds: string[];
  onDragEnd: (result: DropResult) => void;
  onCardClick: (card: CardType) => void;
  onPlayCards: () => void;
}

export const PlayerHand: React.FC<PlayerHandProps> = ({
  gameState,
  currentPlayer,
  isMyTurn,
  localHandOrder,
  selectedCardIds,
  onDragEnd,
  onCardClick,
  onPlayCards,
}) => {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <div className="flex justify-center pt-4 pb-4 px-4 relative">
      <AnimatePresence>
        {selectedCardIds.length > 0 && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50"
          >
            <button
              onClick={onPlayCards}
              disabled={!selectedCardIds.map(id => currentPlayer?.hand.find((c: CardType) => c.id === id)).filter(Boolean).some((c: CardType) => isValidMove(c, topCard, gameState))}
              className="disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-black px-6 py-2 rounded-full uppercase italic shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-transform hover:scale-105"
            >
              Play {selectedCardIds.length} Card{selectedCardIds.length > 1 ? 's' : ''}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="hand" direction="horizontal">
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex justify-center -space-x-6 md:-space-x-10 overflow-x-auto scrollbar-hide pt-20 pb-4 px-4"
            >
              {localHandOrder.map((cardId, index) => {
                const card = currentPlayer?.hand.find((c: CardType) => c.id === cardId);
                if (!card) return null;

                const isSelected = selectedCardIds.includes(card.id);
                const isBattleKing = card.rank === 'K' && (card.suit === 'spades' || card.suit === 'hearts');
                
                const selectedCards = selectedCardIds.map(id => currentPlayer?.hand.find((c: CardType) => c.id === id)).filter(Boolean) as CardType[];
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
                          isSelected={isSelected}
                          onClick={() => onCardClick(card)}
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
  );
};
