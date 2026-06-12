const http = require("http");
const { Server } = require("socket.io");
const { RoomManager, REVEAL_SECONDS } = require("./rooms");

const PORT = Number(process.env.PORT || process.env.MP_PORT || 3001);
const HOST = process.env.MP_HOST || "0.0.0.0";
const rooms = new RoomManager();

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Fiyat Gurusu multiplayer server\n");
});

const io = new Server(server, {
  cors: { origin: process.env.MP_CORS_ORIGIN || "*" },
});

function broadcastRoom(room) {
  for (const p of room.players.values()) {
    if (!p.socketId) continue;
    const sock = io.sockets.sockets.get(p.socketId);
    if (sock) sock.emit("room_state", rooms.serialize(room, p.socketId));
  }
  if (room.displaySocketId) {
    const ds = io.sockets.sockets.get(room.displaySocketId);
    if (ds) ds.emit("room_state", rooms.serialize(room, room.displaySocketId));
  }
}

function handleRoomEvent(result) {
  if (!result) return;
  if (result.destroyed) {
    io.to(result.code).emit("room_closed", { reason: result.reason || "Oda kapandı" });
    return;
  }
  if (result.room) broadcastRoom(result.room);
}

function scheduleNextRound(room) {
  rooms.clearTimer(room);
  setTimeout(() => {
    const still = rooms.getRoom(room.code);
    if (!still || still.phase !== "ROUND_REVEAL") return;
    const result = rooms.nextRound(still);
    if (result.startRound) {
      rooms.beginRound(still);
      broadcastRoom(still);
      startRoundTimer(still);
    } else {
      broadcastRoom(still);
    }
  }, REVEAL_SECONDS * 1000);
}

function finishRound(room) {
  rooms.clearTimer(room);
  rooms.endRound(room);
  broadcastRoom(room);
  scheduleNextRound(room);
}

function startRoundTimer(room) {
  rooms.clearTimer(room);
  room.timer = setInterval(() => {
    const done = rooms.tick(room);
    broadcastRoom(room);
    if (done) finishRound(room);
  }, 1000);
}

io.on("connection", (socket) => {
  socket.on("create_display_room", (payload, ack) => {
    try {
      const { room } = rooms.createDisplayRoom(socket.id, {
        mode: payload?.mode,
        category: payload?.category,
        rounds: payload?.rounds,
      });
      socket.join(room.code);
      const state = rooms.serialize(room, socket.id);
      ack?.({ ok: true, state });
      broadcastRoom(room);
    } catch (e) {
      ack?.({ ok: false, error: e.message || "Monitör odası oluşturulamadı" });
    }
  });

  socket.on("reconnect_display", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase();
    const result = rooms.reconnectDisplay(code, socket.id);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    socket.join(code);
    ack?.({ ok: true, state: rooms.serialize(result.room, socket.id) });
    broadcastRoom(result.room);
  });

  socket.on("create_room", (payload, ack) => {
    try {
      const name = String(payload?.playerName || "Oyuncu");
      const { room, playerId } = rooms.createRoom(socket.id, name, {
        mode: payload?.mode,
        category: payload?.category,
        rounds: payload?.rounds,
      });
      socket.join(room.code);
      const state = rooms.serialize(room, socket.id);
      ack?.({ ok: true, playerId, state });
      broadcastRoom(room);
    } catch (e) {
      ack?.({ ok: false, error: e.message || "Oda oluşturulamadı" });
    }
  });

  socket.on("join_room", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase();
    const name = String(payload?.playerName || "Oyuncu");
    const result = rooms.joinRoom(code, socket.id, name);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    socket.join(code);
    ack?.({ ok: true, playerId: result.playerId, state: rooms.serialize(result.room, socket.id) });
    broadcastRoom(result.room);
  });

  socket.on("reconnect_room", (payload, ack) => {
    const code = String(payload?.code || "").toUpperCase();
    const playerId = String(payload?.playerId || "");
    const name = String(payload?.playerName || "");
    const result = rooms.reconnectRoom(code, socket.id, playerId, name);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    socket.join(code);
    ack?.({ ok: true, playerId: result.playerId, state: rooms.serialize(result.room, socket.id) });
    broadcastRoom(result.room);
  });

  socket.on("update_config", (payload, ack) => {
    const result = rooms.updateConfig(socket.id, payload || {});
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    ack?.({ ok: true });
    broadcastRoom(result.room);
  });

  socket.on("start_game", (_payload, ack) => {
    const result = rooms.startGame(socket.id);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    rooms.beginRound(result.room);
    ack?.({ ok: true });
    broadcastRoom(result.room);
    startRoundTimer(result.room);
  });

  socket.on("play_again", (_payload, ack) => {
    const result = rooms.playAgain(socket.id);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    ack?.({ ok: true });
    broadcastRoom(result.room);
  });

  socket.on("submit_guess", (payload, ack) => {
    const result = rooms.submitGuess(socket.id, payload?.value);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    ack?.({ ok: true });
    broadcastRoom(result.room);
    if (result.allDone) finishRound(result.room);
  });

  socket.on("submit_pick", (payload, ack) => {
    const result = rooms.submitPick(socket.id, payload?.side);
    if (result.error) {
      ack?.({ ok: false, error: result.error });
      return;
    }
    ack?.({ ok: true });
    broadcastRoom(result.room);
    if (result.allDone) finishRound(result.room);
  });

  socket.on("leave_room", (_payload, ack) => {
    const result = rooms.leave(socket.id);
    socket.leaveAll();
    ack?.({ ok: true });
    handleRoomEvent(result);
  });

  socket.on("leave_display", (_payload, ack) => {
    const result = rooms.leaveDisplay(socket.id);
    socket.leaveAll();
    ack?.({ ok: true });
    handleRoomEvent(result);
  });

  socket.on("disconnect", () => {
    const result = rooms.disconnect(socket.id, handleRoomEvent);
    if (result?.room) broadcastRoom(result.room);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Multiplayer server http://${HOST}:${PORT}`);
});
