import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { setupWebSocket } from "./server/websocket.ts";
import { startGameLoop } from "./server/loop.ts";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

setupWebSocket(wss);
startGameLoop();

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
