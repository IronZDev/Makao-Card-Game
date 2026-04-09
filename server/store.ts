import { WebSocket } from "ws";
import { GameState } from "../src/types.ts";

export const games = new Map<string, GameState>();
export const playerSockets = new Map<string, WebSocket>();
