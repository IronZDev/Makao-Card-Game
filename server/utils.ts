import { WebSocket } from "ws";
import { GameState, ServerMessage, GameEvent, Card } from "../src/types.ts";
import { games, playerSockets } from "./store.ts";
import { v4 as uuidv4 } from "uuid";

export function broadcast(roomId: string, message: ServerMessage) {
  const game = games.get(roomId);
  if (!game) return;
  game.players.forEach(p => {
    const socket = playerSockets.get(p.id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
}

export function addEvent(game: GameState, type: GameEvent['type'], playerId?: string, cards?: Card[], details?: string) {
  const player = playerId ? game.players.find(p => p.id === playerId) : undefined;
  game.history.push({
    id: uuidv4(),
    timestamp: Date.now(),
    playerId,
    playerName: player?.name,
    type,
    cards,
    details
  });
  // Keep history size manageable
  if (game.history.length > 100) {
    game.history.shift();
  }
}
