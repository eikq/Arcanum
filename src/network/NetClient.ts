import { io, Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient, CastPayload, RoomSnapshot, PlayerID, RoomID, QueueMode } from '../shared/net';

// FIX: Updated to use shared types and new state machine
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface NetClientEvents {
  'connection_changed': (state: ConnectionState) => void;
  'room_updated': (snapshot: RoomSnapshot) => void;
  'cast_received': (cast: CastPayload & { from: PlayerID }) => void;
  'error': (error: { code: string; message: string }) => void;
  'opponent_left': (data: { roomId: RoomID }) => void;
}

export class NetClient {
  private socket: Socket<ServerToClient, ClientToServer> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private lastCastTime = 0;
  private castCooldown = 1000; // 1 second minimum between casts
  private lastCastData = new Map<string, number>(); // spellId -> timestamp for deduplication
  private serverOffsetMs = 0; // FIX: Server time synchronization
  private heartbeatInterval: NodeJS.Timeout | null = null;
  public currentRoom: RoomID | null = null;
  private listeners: Map<keyof NetClientEvents, Function[]> = new Map();

  constructor(private serverUrl?: string) {
    if (!serverUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      
      // For development, try localhost first, then webcontainer patterns
      if (hostname === 'localhost') {
        this.serverUrl = `${protocol}//localhost:5175`;
      } else if (hostname.includes('5175') || hostname.includes('--5175--')) {
        this.serverUrl = `${protocol}//${hostname}`;
      } else {
        // Try to construct webcontainer URL
        const baseHost = hostname.split('--')[0];
        this.serverUrl = `${protocol}//${baseHost}--5175--${hostname.split('--').slice(1).join('--')}`;
      }
    } else {
      this.serverUrl = serverUrl;
    }
    
    console.log('NetClient server URL:', this.serverUrl);
  }

  // FIX: Explicit connection management with state tracking
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected') {
        console.log('Already connected to server');
        resolve();
        return;
      }

      console.log('Attempting to connect to server:', this.serverUrl);
      this.connectionState = 'connecting';
      this.emit('connection_changed', this.connectionState);

      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket'],
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to game server successfully');
          this.connectionState = 'connected';
          this.emit('connection_changed', this.connectionState);
          this.startHeartbeat();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Failed to connect to game server:', error);
          console.log('Attempted URL:', this.serverUrl);
          this.connectionState = 'disconnected';
          this.emit('connection_changed', this.connectionState);
          // Don't reject - let socket.io handle reconnection attempts
          console.log('🔄 Will attempt reconnection automatically...');
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Disconnected from game server');
          this.connectionState = 'disconnected';
          this.emit('connection_changed', this.connectionState);
          this.stopHeartbeat();
        });

        this.socket.on('reconnect', () => {
          console.log('🔄 Reconnected to game server');
          this.connectionState = 'connected';
          this.emit('connection_changed', this.connectionState);
          this.startHeartbeat();
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('❌ Reconnection failed:', error);
          this.connectionState = 'disconnected';
          this.emit('connection_changed', this.connectionState);
        });

        // FIX: Handle new server events
        this.socket.on('room:snapshot', (snapshot) => {
          this.serverOffsetMs = snapshot.serverNow - Date.now();
          this.emit('room_updated', snapshot);
        });

        this.socket.on('cast', (cast) => {
          this.emit('cast_received', cast);
        });

        this.socket.on('error', (error) => {
          this.emit('error', error);
        });

        this.socket.on('opponent:left', (data) => {
          this.emit('opponent_left', data);
        });

        // Resolve immediately after setting up listeners
        // Connection success/failure will be handled via events
        setTimeout(() => resolve(), 100);

      } catch (error) {
        this.connectionState = 'disconnected';
        this.emit('connection_changed', this.connectionState);
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'disconnected';
    this.currentRoom = null;
    this.emit('connection_changed', this.connectionState);
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getServerOffset(): number {
    return this.serverOffsetMs;
  }

  // FIX: Updated queue management with ACK responses
  async quickMatch(nick: string = 'Player'): Promise<RoomID> {
    if (!this.socket) throw new Error('Not connected');
    
    console.log('🎮 Requesting quick match for:', nick);
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('queue:join', { mode: 'quick', nick }, (ok, msg, roomId) => {
        console.log('Quick match response:', { ok, msg, roomId });
        if (ok && roomId) {
          this.currentRoom = roomId;
          console.log('✅ Quick match successful, room:', roomId);
          resolve(roomId);
        } else {
          console.log('❌ Quick match failed:', msg);
          reject(new Error(msg || 'Failed to join queue'));
        }
      });
    });
  }

  async createRoom(nick: string = 'Host'): Promise<RoomID> {
    if (!this.socket) throw new Error('Not connected');
    
    return new Promise((resolve, reject) => {
      const roomCode = this.generateRoomCode();
      this.socket!.emit('queue:join', { mode: 'code', roomCode, nick }, (ok, msg, roomId) => {
        if (ok && roomId) {
          this.currentRoom = roomId;
          resolve(roomId);
        } else {
          reject(new Error(msg || 'Failed to create room'));
        }
      });
    });
  }

  async joinRoom(roomCode: string, nick: string = 'Player'): Promise<RoomID> {
    if (!this.socket) throw new Error('Not connected');
    
    console.log('🚪 Joining room:', roomCode, 'as:', nick);
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('queue:join', { mode: 'code', roomCode, nick }, (ok, msg, roomId) => {
        console.log('Join room response:', { ok, msg, roomId });
        if (ok && roomId) {
          this.currentRoom = roomId;
          console.log('✅ Joined room successfully:', roomId);
          resolve(roomId);
        } else {
          console.log('❌ Failed to join room:', msg);
          reject(new Error(msg || 'Room not found or full'));
        }
      });
    });
  }

  async playVsBot(difficulty: 'easy' | 'medium' | 'hard', nick: string = 'Player'): Promise<RoomID> {
    if (!this.socket) throw new Error('Not connected');
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('queue:join', { mode: 'bot', nick }, (ok, msg, roomId) => {
        if (ok && roomId) {
          this.currentRoom = roomId;
          resolve(roomId);
        } else {
          reject(new Error(msg || 'Failed to start bot match'));
        }
      });
    });
  }

  // FIX: Updated game actions with room state validation
  sendCast(payload: CastPayload): boolean {
    if (!this.socket || !this.currentRoom || !this.canCast(payload.spellId, payload.ts)) {
      return false;
    }

    this.socket.emit('cast', payload);
    this.markCast(payload.spellId, payload.ts);
    return true;
  }

  setReady(ready: boolean, micReady: boolean): void {
    if (!this.socket || !this.currentRoom) return;
    this.socket.emit('room:ready', { roomId: this.currentRoom, ready, micReady });
  }

  leaveRoom(): void {
    if (!this.socket || !this.currentRoom) return;
    this.socket.emit('room:leave', { roomId: this.currentRoom });
    this.currentRoom = null;
  }

  // Voice chat signaling
  sendSignal(to: PlayerID, data: any): void {
    if (!this.socket || !this.currentRoom) return;
    this.socket.emit('rtc:signal', { roomId: this.currentRoom, to, data });
  }

  // FIX: Event system for client events
  on<K extends keyof NetClientEvents>(event: K, callback: NetClientEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off<K extends keyof NetClientEvents>(event: K, callback?: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners && callback) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof NetClientEvents>(event: K, ...args: Parameters<NetClientEvents[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(...args));
    }
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

  // FIX: Heartbeat system for connection health
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.currentRoom) {
        this.socket.emit('heartbeat', { roomId: this.currentRoom, t: Date.now() });
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
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