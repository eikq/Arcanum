import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, CastPayload } from '../shared/events';

export type QueueMode = 'quick' | 'code' | 'bot';
export type GameMode = 'quick' | 'code' | 'bot' | 'practice';

export interface GameState {
  players: Array<{
    id: string;
    nick: string;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
  }>;
  roomId: string;
  currentTurn?: string;
  isActive: boolean;
}

export interface NetEvents {
  // Queue events
  'queue:join': { mode: QueueMode; roomCode?: string; nick?: string; vsBot?: boolean };
  'queue:waiting': { position: number };
  'match:found': { roomId: string; players: Array<{ id: string; nick: string }>; vsBot?: boolean };
  'match:start': { countdown: number };
  
  // Game events
  'cast': CastPayload;
  'state:update': Partial<GameState>;
  'opponent:left': { playerId: string };
  
  // Voice chat
  'rtc:signal': { to: string; from: string; data: any };
}

export class NetClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private lastCastTime = 0;
  private castCooldown = 1000; // 1 second minimum between casts
  private lastCastData = new Map<string, number>(); // spellId -> timestamp for deduplication

  constructor(private serverUrl = 'ws://localhost:3001') {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket'],
          timeout: 5000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to game server');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.warn('Failed to connect to game server:', error);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from game server');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Queue management
  async quickMatch(nick: string = 'Player'): Promise<void> {
    if (!this.socket) throw new Error('Not connected');
    this.socket.emit('queue:join', { mode: 'quick', nick });
  }

  async createRoom(nick: string = 'Host'): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const roomCode = this.generateRoomCode();
      this.socket.emit('queue:join', { mode: 'code', roomCode, nick });
      
      // Listen for room creation confirmation
      this.socket.once('match:found', (data) => {
        resolve(roomCode);
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Room creation timeout')), 5000);
    });
  }

  async joinRoom(roomCode: string, nick: string = 'Player'): Promise<void> {
    if (!this.socket) throw new Error('Not connected');
    this.socket.emit('queue:join', { mode: 'code', roomCode, nick });
  }

  async playVsBot(difficulty: 'easy' | 'medium' | 'hard', nick: string = 'Player'): Promise<void> {
    if (!this.socket) throw new Error('Not connected');
    this.socket.emit('queue:join', { mode: 'bot', vsBot: true, nick });
  }

  // Game actions
  sendCast(payload: CastPayload): boolean {
    if (!this.socket || !this.canCast(payload.spellId, payload.ts)) {
      return false;
    }

    this.socket.emit('cast', payload);
    this.markCast(payload.spellId, payload.ts);
    return true;
  }

  sendState(state: Partial<GameState>): void {
    if (!this.socket) return;
    this.socket.emit('state:update', state);
  }

  // Voice chat signaling
  sendSignal(roomId: string, to: string, data: any): void {
    if (!this.socket) return;
    this.socket.emit('rtc:signal', { roomId, to, sdp: data.sdp, ice: data.ice });
  }

  // Event listeners
  on<K extends keyof ServerToClientEvents>(event: K, callback: ServerToClientEvents[K]): void {
    if (!this.socket) return;
    this.socket.on(event, callback as any);
  }

  off<K extends keyof ServerToClientEvents>(event: K, callback?: Function): void {
    if (!this.socket) return;
    this.socket.off(event, callback as any);
  }

  // Anti-spam protection
  private canCast(spellId: string, timestamp: number): boolean {
    const now = performance.now();
    
    // Global cooldown check
    if (now - this.lastCastTime < this.castCooldown) {
      return false;
    }

    // Duplicate cast check (same spell within 500ms)
    const lastCast = this.lastCastData.get(spellId) || 0;
    if (timestamp - lastCast < 500) {
      return false;
    }

    return true;
  }

  private markCast(spellId: string, timestamp: number): void {
    this.lastCastTime = performance.now();
    this.lastCastData.set(spellId, timestamp);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const netClient = new NetClient();