// Shared event types for client/server communication

export interface CastPayload {
  roomId: string;
  spellId: string;
  accuracy: number; // 0..1
  loudness: number; // 0..1
  power: number;    // 0..1
  ts: number;       // ms epoch
}

export interface ClientToServerEvents {
  "queue:join": (data: { 
    mode: "quick" | "code" | "bot"; 
    roomCode?: string; 
    vsBot?: boolean; 
    nick?: string 
  }, ack?: (ok: boolean, msg?: string) => void) => void;
  "cast": (data: CastPayload) => void;
  "state:update": (data: any) => void;
  "rtc:signal": (data: { 
    roomId: string; 
    to?: string; 
    from?: string; 
    sdp?: any; 
    ice?: any 
  }) => void;
}

export interface ServerToClientEvents {
  "queue:waiting": (data?: { eta?: number }) => void;
  "match:found": (data: { 
    roomId: string; 
    players: { id: string; nick?: string }[]; 
    vsBot?: boolean 
  }) => void;
  "match:start": (data: { roomId: string; countdown: number }) => void;
  "cast": (data: CastPayload) => void;
  "state:update": (data: any) => void;
  "rtc:signal": (data: { 
    roomId: string; 
    to?: string; 
    from?: string; 
    sdp?: any; 
    ice?: any 
  }) => void;
  "opponent:left": (data: { reason?: string }) => void;
}

export interface SRResult {
  transcript: string;
  isFinal: boolean;
  accuracy: number;    // 0..1
  loudness: number;    // 0..1
  phonemes?: string[];
}