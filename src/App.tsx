import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Spade, Settings } from 'lucide-react';

import { useGameSocket } from './hooks/useGameSocket';
import { usePlayCards } from './hooks/usePlayCards';
import { JoinScreen } from './components/screens/JoinScreen';
import { LobbyScreen } from './components/screens/LobbyScreen';
import { GameScreen } from './components/screens/GameScreen';
import { GameOverScreen } from './components/screens/GameOverScreen';
import { SettingsModal } from './components/modals/SettingsModal';
import { SuitPickerModal } from './components/modals/SuitPickerModal';
import { RankPickerModal } from './components/modals/RankPickerModal';
import { JokerPickerModal } from './components/modals/JokerPickerModal';
import { ALL_RANKS } from './types';

export default function App() {
  const { gameState, playerId, isJoined, error, connect, sendMessage } = useGameSocket();
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    handlePlayCards,
    showSuitPicker,
    showRankPicker,
    showJokerPicker,
    handleSuitSelect,
    handleRankSelect,
    handleJokerSelect,
  } = usePlayCards(gameState, playerId, sendMessage);

  if (!isJoined) {
    return <JoinScreen onJoin={connect} error={error} />;
  }

  return (
    <div className="min-h-screen bg-emerald-950 text-white overflow-hidden flex flex-col relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-8 gap-4 p-4">
          {Array.from({ length: 64 }).map((_, i) => (
            <div key={i} className="aspect-square border border-white rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="p-4 md:p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 overflow-hidden relative">
            <Spade className="w-6 h-6" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rotate-45 translate-x-2 -translate-y-2"></div>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter uppercase italic leading-none flex items-baseline gap-2">
              Makao
              <span className="text-[10px] text-slate-400 font-mono font-normal">v1.1.0</span>
            </h2>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Room: {gameState?.roomId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow relative flex items-center justify-center p-4">
        {gameState?.status === 'waiting' && (
          <LobbyScreen gameState={gameState} playerId={playerId} sendMessage={sendMessage} />
        )}

        {gameState?.status === 'playing' && (
          <GameScreen 
            gameState={gameState} 
            playerId={playerId} 
            sendMessage={sendMessage} 
            onPlayCards={handlePlayCards} 
          />
        )}

        {gameState?.status === 'finished' && (
          <GameOverScreen gameState={gameState} playerId={playerId} sendMessage={sendMessage} />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && gameState && (
          <SettingsModal rules={gameState.rules} onClose={() => setShowSettings(false)} />
        )}

        {showSuitPicker && (
          <SuitPickerModal onSelect={handleSuitSelect} />
        )}

        {showRankPicker && (
          <RankPickerModal onSelect={handleRankSelect} />
        )}

        {showJokerPicker && (
          <JokerPickerModal
            disabledRanks={
              gameState?.requestedRank 
                ? ALL_RANKS.filter(r => 
                    r !== gameState.requestedRank && 
                    !(r === 'J' && !gameState.requestedRankPlayed)
                  )
                : []
            }
            onSelect={handleJokerSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

