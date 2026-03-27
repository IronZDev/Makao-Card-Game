import { useState, useCallback } from 'react';
import { GameState, ClientMessage, ServerMessage, GameRules } from '../types';

export const useGameSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback((roomId: string, name: string, rules: GameRules) => {
    if (!name || !roomId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      const storedPlayerId = localStorage.getItem(`makao_player_id_${roomId}`);
      ws.send(JSON.stringify({ type: 'JOIN', roomId, name, rules, playerId: storedPlayerId || undefined }));
    };

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      if (message.type === 'INIT') {
        setGameState(message.state);
        setPlayerId(message.playerId);
        setIsJoined(true);
        localStorage.setItem(`makao_player_id_${roomId}`, message.playerId);
      } else if (message.type === 'UPDATE') {
        setGameState(message.state);
      } else if (message.type === 'ERROR') {
        setError(message.message);
        setTimeout(() => setError(null), 3000);
      }
    };

    ws.onclose = () => {
      setSocket(null);
      setIsJoined(false);
    };

    setSocket(ws);
  }, []);

  const disconnect = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'LEAVE_ROOM' }));
      socket.close();
    }
    setSocket(null);
    setIsJoined(false);
    setGameState(null);
    setPlayerId(null);
  }, [socket]);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (msg.type === 'LEAVE_ROOM') {
      disconnect();
      return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }, [socket, disconnect]);

  return { socket, gameState, playerId, isJoined, error, connect, sendMessage, disconnect };
};
