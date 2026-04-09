import { games } from "./store.ts";
import { broadcast } from "./utils.ts";
import { triggerBots } from "./bot.ts";

export function broadcastUpdate(roomId: string) {
  const game = games.get(roomId);
  if (!game) return;
  broadcast(roomId, { type: 'UPDATE', state: game });
  triggerBots(roomId);
}
