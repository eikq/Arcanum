/* eslint-disable */
// FIX: Updated server with authoritative room state machine
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// FIX: Authoritative room state machine
class Room {
  constructor(id, vsBot = false) {
    this.id = id;
    this.state = "lobby"; // lobby, countdown, playing, finished
    this.players = [];
    this.vsBot = vsBot;
    this.winner = null;
    this.countdownEndsAt = null;
    this.roundEndsAt = null;
    this.settings = { roundTimeSec: 180 };
  }

  addPlayer(socketId, nick) {
    this.players.push({
      id: socketId,
      nick: nick || 'Player',
      hp: 100,
      mana: 100,
      ready: false,
      micReady: false
    });
  }

  setPlayerReady(socketId, ready, micReady) {
    const player = this.players.find(p => p.id === socketId);
    if (player) {
      player.ready = ready;
      player.micReady = micReady;
    }
    return this.allReady();
  }

  allReady() {
    return this.players.length >= (this.vsBot ? 1 : 2) && 
           this.players.every(p => p.ready && p.micReady);
  }

  startCountdown() {
    this.state = "countdown";
    this.countdownEndsAt = Date.now() + 3000;
    return this.countdownEndsAt;
  }

  startPlaying() {
    this.state = "playing";
    this.roundEndsAt = Date.now() + (this.settings.roundTimeSec * 1000);
    return this.roundEndsAt;
  }

  finishMatch(winnerId) {
    this.state = "finished";
    this.winner = winnerId;
    this.countdownEndsAt = null;
    this.roundEndsAt = null;
  }

  getSnapshot() {
    return {
      id: this.id,
      state: this.state,
      players: this.players,
      vsBot: this.vsBot,
      winner: this.winner,
      serverNow: Date.now(),
      countdownEndsAt: this.countdownEndsAt,
      roundEndsAt: this.roundEndsAt
    };
  }
}

const quickQueue = [];
const rooms = new Map();
const lastCastBySock = new Map();
const heartbeats = new Map();

const roomCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

// FIX: Server throttle guard
const allowCast = (socketId) => {
  const now = Date.now();
  const last = lastCastBySock.get(socketId) || 0;
  if (now - last < 800) return false;
  lastCastBySock.set(socketId, now);
  return true;
};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("queue:join", (data, ack) => {
    try {
      const { mode, roomCode: requestedCode, nick } = data;

      if (mode === "quick") {
        if (quickQueue.length && quickQueue[0] !== socket.id) {
          const otherId = quickQueue.shift();
          const roomId = roomCode();
          const room = new Room(roomId, false);
          room.addPlayer(otherId, 'Player');
          room.addPlayer(socket.id, nick);
          rooms.set(roomId, room);
          
          io.to([otherId, socket.id]).emit("room:snapshot", room.getSnapshot());
          ack(true, "Matched!", roomId);
        } else {
          quickQueue.push(socket.id);
          socket.emit("queue:waiting", { eta: 15 });
          ack(true, "In queue", null);
          
          // Fallback to bot after 15s
          setTimeout(() => {
            if (quickQueue.includes(socket.id)) {
              quickQueue.splice(quickQueue.indexOf(socket.id), 1);
              const roomId = roomCode();
              const room = new Room(roomId, true);
              room.addPlayer(socket.id, nick);
              rooms.set(roomId, room);
              socket.emit("room:snapshot", room.getSnapshot());
              ack(true, "Bot match started", roomId);
            }
          }, 15000);
        }
      } else if (mode === "code") {
        const roomId = (requestedCode || roomCode()).toUpperCase();
        let room = rooms.get(roomId);
        
        if (!room) {
          room = new Room(roomId, false);
          room.addPlayer(socket.id, nick);
          rooms.set(roomId, room);
          ack(true, "Room created", roomId);
        } else if (room.players.length < 2) {
          room.addPlayer(socket.id, nick);
          io.to(room.players.map(p => p.id)).emit("room:snapshot", room.getSnapshot());
          ack(true, "Room joined", roomId);
        } else {
          ack(false, "Room full", null);
        }
      } else if (mode === "bot") {
        const roomId = roomCode();
        const room = new Room(roomId, true);
        room.addPlayer(socket.id, nick);
        rooms.set(roomId, room);
        socket.emit("room:snapshot", room.getSnapshot());
        ack(true, "Bot match ready", roomId);
      }
    } catch (e) {
      ack(false, String(e), null);
    }
  });

  socket.on("room:ready", (data) => {
    const { roomId, ready, micReady } = data;
    const room = rooms.get(roomId);
    if (room && room.state === "lobby") {
      const allReady = room.setPlayerReady(socket.id, ready, micReady);
      io.to(room.players.map(p => p.id)).emit("room:snapshot", room.getSnapshot());
      
      if (allReady) {
        const countdownEndsAt = room.startCountdown();
        io.to(room.players.map(p => p.id)).emit("match:start", { roomId, countdownEndsAt });
        
        setTimeout(() => {
          const roundEndsAt = room.startPlaying();
          io.to(room.players.map(p => p.id)).emit("match:playing", { roomId, roundEndsAt });
        }, 3000);
      }
    }
  });

  socket.on("cast", (payload) => {
    const room = rooms.get(payload.roomId);
    if (room && room.state === "playing" && allowCast(socket.id)) {
      socket.broadcast.emit("cast", { ...payload, from: socket.id });
    }
  });

  socket.on("rtc:signal", (data) => {
    socket.broadcast.emit("rtc:signal", { ...data, from: socket.id });
  });

  socket.on("heartbeat", (data) => {
    heartbeats.set(socket.id, { roomId: data.roomId, t: data.t });
  });

  socket.on("room:leave", (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(data.roomId);
      } else {
        io.to(room.players.map(p => p.id)).emit("opponent:left", { roomId: data.roomId });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    quickQueue.splice(quickQueue.indexOf(socket.id), 1);
    
    // Notify room peers
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.some(p => p.id === socket.id)) {
        io.to(room.players.filter(p => p.id !== socket.id).map(p => p.id))
          .emit("opponent:left", { roomId });
        break;
      }
    }
  });
});

// FIX: Heartbeat monitoring every 5s
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 12000; // 12s
  
  for (const [socketId, beat] of heartbeats.entries()) {
    if (now - beat.t > staleThreshold) {
      heartbeats.delete(socketId);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("error", { code: "HEARTBEAT_TIMEOUT", message: "Connection lost" });
        socket.disconnect();
      }
    }
  }
}, 5000);

const PORT = process.env.PORT || 5175;
httpServer.listen(PORT, () => console.log("Magic-Mutter server listening on", PORT));

/*
Run locally:
  npm install express socket.io
  node server.js
Set client SERVER_URL to: http://localhost:5175
*/