import { games } from "./store.ts";
import { addEvent } from "./utils.ts";
import { nextPlayer } from "./logic.ts";
import { broadcastUpdate } from "./updater.ts";

export function startGameLoop() {
  setInterval(() => {
    games.forEach((game, roomId) => {
      if (game.status === 'playing') {
        const player = game.players[game.currentPlayerIndex];
        
        const isTimeout = game.turnEndTime && Date.now() > game.turnEndTime;
        const isDisconnected = !player.isBot && !player.isConnected;

        if (isTimeout || isDisconnected) {
          if (game.skipPenalty > 0) {
            player.skipTurns = (player.skipTurns || 0) + game.skipPenalty - 1;
            addEvent(game, 'PENALTY', player.id, undefined, `Skipped ${game.skipPenalty} turn${game.skipPenalty > 1 ? 's' : ''}`);
            game.skipPenalty = 0;
            nextPlayer(game);
          } else {
            const cardsToDraw = Math.max(1, game.drawPenalty);
            const wasPenalty = game.drawPenalty > 0;
            for (let i = 0; i < cardsToDraw; i++) {
              if (game.deck.length === 0 && game.discardPile.length > 1) {
                const top = game.discardPile.pop()!;
                game.deck = game.discardPile.sort(() => Math.random() - 0.5);
                game.discardPile = [top];
              }
              if (game.deck.length > 0) {
                player.hand.push(game.deck.pop()!);
              }
            }
            
            if (wasPenalty) {
              addEvent(game, 'PENALTY', player.id, undefined, `Took penalty of ${cardsToDraw} cards`);
            } else {
              addEvent(game, 'DRAW_CARDS', player.id, undefined, `Drew ${cardsToDraw} card${cardsToDraw > 1 ? 's' : ''}`);
            }
            
            game.drawPenalty = 0;
            player.isMakao = false;
            nextPlayer(game);
          }
          
          broadcastUpdate(roomId);
        }
      }
    });
  }, 1000);
}
