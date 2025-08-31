// Shared network types for client/server communication
export type PlayerID = string;
export type RoomID = string;

export type QueueMode = "quick" | "code" | "bot";

export interface MatchSettings { 
  bestOf?: 1 | 3; 
  roundTimeSec?: number; 
}

export interface CastPayload {
  roomId: RoomID; 
  spellId: string; 
  accuracy: number; 
  loudness: number; 
  power: number; 
  ts: number;
}

export interface RoomSnapshot {
  id: RoomID;
  state: "lobby" | "countdown" | "playing" | "finished";
  players: { 
    id: PlayerID; 
    nick?: string; 
    hp: number; 
    mana: number; 
    ready: boolean; 
    micReady: boolean 
  }[];
  vsBot: boolean;
  winner?: PlayerID;
  serverNow: number; // ms
  countdownEndsAt?: number; // ms server time
  roundEndsAt?: number;     // ms server time
}

export interface ClientToServer {
  "queue:join": (d: {
    mode: QueueMode; 
    roomCode?: string; 
    nick?: string; 
    settings?: MatchSettings
  }, ack: (ok: boolean, msg?: string, roomId?: RoomID) => void) => void;
  "room:ready": (d: { roomId: RoomID; ready: boolean; micReady: boolean }) => void;
  "cast": (d: CastPayload) => void;
  "rtc:signal": (d: { roomId: RoomID; to?: PlayerID; data: any }) => void;
  "room:leave": (d: { roomId: RoomID }) => void;
  "heartbeat": (d: { roomId: RoomID, t: number }) => void;
}

export interface ServerToClient {
  "queue:waiting": (d: { eta?: number }) => void;
  "room:snapshot": (d: RoomSnapshot) => void;
  "match:start": (d: { roomId: RoomID; countdownEndsAt: number }) => void;
  "match:playing": (d: { roomId: RoomID; roundEndsAt: number }) => void;
  "match:finished": (d: { roomId: RoomID; winner?: PlayerID }) => void;
  "cast": (d: CastPayload & { from: PlayerID }) => void;
  "rtc:signal": (d: { roomId: RoomID; from: PlayerID; data: any }) => void;
  "error": (d: { code: string; message: string }) => void;
  "opponent:left": (d: { roomId: RoomID }) => void;
}

// Client cooldown guards
let lastCast = 0;
export const canCast = () => performance.now() - lastCast >= 1000;
export const markCast = () => { lastCast = performance.now(); };

// Server-synced timer utility
export const makeServerTimer = (endsAt: number, getOffset: () => number) =>
  () => Math.max(0, endsAt - (Date.now() + getOffset()));