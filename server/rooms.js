const {
  CLASSIC_ROUND_SECONDS,
  HIGHER_LOWER_ROUND_SECONDS,
  REVEAL_SECONDS,
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  sanitizeListing,
  sliderRange,
  deviationPct,
  pickClassicRounds,
  pickHLRounds,
  generateCode,
} = require("./game");

const DISCONNECT_GRACE_MS = 120_000;

/** @typedef {'LOBBY'|'ROUND_PLAYING'|'ROUND_REVEAL'|'GAME_OVER'} Phase */
/** @typedef {'classic'|'higherlower'} Mode */

/**
 * @typedef {object} Player
 * @property {string} id
 * @property {string} socketId
 * @property {string} name
 * @property {number} roundWins
 * @property {boolean} hasSubmitted
 */

/**
 * @typedef {object} Room
 * @property {string} code
 * @property {string} hostId
 * @property {Phase} phase
 * @property {Map<string, Player>} players
 * @property {{ mode: Mode, category: string, rounds: number }} config
 * @property {number} currentRound
 * @property {object[]} roundData
 * @property {Map<string, number|0|1>} submissions
 * @property {number} timeLeft
 * @property {NodeJS.Timeout|null} timer
 * @property {object|null} reveal
 * @property {object[]|null} finalRankings
 */

class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, string>} socketId -> roomCode */
    this.socketRoom = new Map();
  }

  /** @returns {Room|null} */
  getRoom(code) {
    return this.rooms.get(code?.toUpperCase()) ?? null;
  }

  getRoomBySocket(socketId) {
    const code = this.socketRoom.get(socketId);
    return code ? this.getRoom(code) : null;
  }

  connectedPlayers(room) {
    return [...room.players.values()].filter((p) => p.socketId);
  }

  createRoom(socketId, playerName, config = {}) {
    const code = generateCode(this.rooms);
    const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    /** @type {Room} */
    const room = {
      code,
      hostId: playerId,
      phase: "LOBBY",
      players: new Map(),
      config: {
        mode: config.mode === "higherlower" ? "higherlower" : "classic",
        category: config.category || "ALL",
        rounds: config.rounds || DEFAULT_ROUNDS,
      },
      currentRound: 0,
      roundData: [],
      submissions: new Map(),
      timeLeft: 0,
      timer: null,
      reveal: null,
      finalRankings: null,
    };
    room.players.set(playerId, this._makePlayer(playerId, socketId, playerName));
    this.rooms.set(code, room);
    this.socketRoom.set(socketId, code);
    return { room, playerId };
  }

  _makePlayer(id, socketId, name) {
    return {
      id,
      socketId,
      name: name.slice(0, 20) || "Oyuncu",
      roundWins: 0,
      hasSubmitted: false,
      disconnectTimer: null,
    };
  }

  _clearDisconnectTimer(player) {
    if (player.disconnectTimer) {
      clearTimeout(player.disconnectTimer);
      player.disconnectTimer = null;
    }
  }

  joinRoom(code, socketId, playerName) {
    const room = this.getRoom(code);
    if (!room) return { error: "Oda bulunamadı" };
    if (room.phase !== "LOBBY") return { error: "Oyun başlamış, katılamazsın" };
    if (this.connectedPlayers(room).length >= MAX_PLAYERS) {
      return { error: "Oda dolu (max 10 kişi)" };
    }

    const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    room.players.set(playerId, this._makePlayer(playerId, socketId, playerName));
    this.socketRoom.set(socketId, code);
    return { room, playerId };
  }

  reconnectRoom(code, socketId, playerId, playerName) {
    const room = this.getRoom(code);
    if (!room) return { error: "Oda bulunamadı" };
    const player = room.players.get(playerId);
    if (!player) return { error: "Oyuncu bulunamadı" };
    if (player.socketId && player.socketId !== socketId) {
      return { error: "Bu oyuncu zaten bağlı" };
    }
    if (room.phase === "LOBBY" && this.connectedPlayers(room).length >= MAX_PLAYERS) {
      return { error: "Oda dolu" };
    }

    this._clearDisconnectTimer(player);
    player.socketId = socketId;
    if (playerName) player.name = playerName.slice(0, 20) || player.name;
    this.socketRoom.set(socketId, code);
    return { room, playerId };
  }

  updateConfig(socketId, patch) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "LOBBY") return { error: "Ayar değiştirilemez" };
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player || player.id !== room.hostId) return { error: "Sadece host ayarlayabilir" };
    if (patch.mode === "classic" || patch.mode === "higherlower") room.config.mode = patch.mode;
    if (["ALL", "CAR", "HOUSE"].includes(patch.category)) room.config.category = patch.category;
    if (patch.rounds >= 3 && patch.rounds <= 10) room.config.rounds = patch.rounds;
    return { room };
  }

  startGame(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "LOBBY") return { error: "Oyun başlatılamaz" };
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player || player.id !== room.hostId) return { error: "Sadece host başlatabilir" };
    if (this.connectedPlayers(room).length < 2) return { error: "En az 2 aktif oyuncu gerekli" };

    if (room.config.mode === "classic") {
      room.roundData = pickClassicRounds(room.config.category, room.config.rounds);
    } else {
      room.roundData = pickHLRounds(room.config.category, room.config.rounds);
    }
    if (!room.roundData.length) return { error: "Yeterli ilan yok" };

    room.currentRound = 0;
    room.finalRankings = null;
    return { room, startRound: true };
  }

  beginRound(room) {
    this.clearTimer(room);
    room.phase = "ROUND_PLAYING";
    room.reveal = null;
    room.submissions = new Map();
    for (const p of room.players.values()) p.hasSubmitted = false;

    const isClassic = room.config.mode === "classic";
    room.timeLeft = isClassic ? CLASSIC_ROUND_SECONDS : HIGHER_LOWER_ROUND_SECONDS;
    return room;
  }

  clearTimer(room) {
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
  }

  tick(room) {
    if (room.phase !== "ROUND_PLAYING") return false;
    room.timeLeft -= 1;
    if (room.timeLeft <= 0) return true;
    return room.submissions.size >= room.players.size;
  }

  submitGuess(socketId, value) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "ROUND_PLAYING" || room.config.mode !== "classic") {
      return { error: "Tahmin gönderilemedi" };
    }
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player || player.hasSubmitted) return { error: "Zaten gönderdin" };
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return { error: "Geçersiz tahmin" };

    room.submissions.set(player.id, num);
    player.hasSubmitted = true;
    return { room, allDone: room.submissions.size >= room.players.size };
  }

  submitPick(socketId, side) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "ROUND_PLAYING" || room.config.mode !== "higherlower") {
      return { error: "Seçim gönderilemedi" };
    }
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player || player.hasSubmitted) return { error: "Zaten seçtin" };
    if (side !== 0 && side !== 1) return { error: "Geçersiz seçim" };

    room.submissions.set(player.id, side);
    player.hasSubmitted = true;
    return { room, allDone: room.submissions.size >= room.players.size };
  }

  endRound(room) {
    this.clearTimer(room);
    room.phase = "ROUND_REVEAL";

    if (room.config.mode === "classic") {
      const listing = room.roundData[room.currentRound];
      const realPrice = listing.realPrice;
      const rows = [...room.players.values()].map((p) => {
        const guess = room.submissions.get(p.id);
        const timedOut = guess === undefined;
        const deviation = timedOut ? 100 : deviationPct(guess, realPrice);
        return { playerId: p.id, name: p.name, guess: timedOut ? null : guess, deviation, timedOut };
      });
      rows.sort((a, b) => a.deviation - b.deviation);
      rows.forEach((r, i) => (r.rank = i + 1));
      const winner = rows[0];
      if (winner && !winner.timedOut) {
        const wp = room.players.get(winner.playerId);
        if (wp) wp.roundWins += 1;
      }
      room.reveal = { type: "classic", realPrice, rankings: rows, roundWinnerId: winner?.timedOut ? null : winner?.playerId };
    } else {
      const [left, right] = room.roundData[room.currentRound];
      const higherSide = left.realPrice >= right.realPrice ? 0 : 1;
      const rows = [...room.players.values()].map((p) => {
        const pick = room.submissions.get(p.id);
        const timedOut = pick === undefined;
        const correct = !timedOut && pick === higherSide;
        return { playerId: p.id, name: p.name, pick: timedOut ? null : pick, correct, timedOut };
      });
      rows.sort((a, b) => {
        if (a.correct !== b.correct) return a.correct ? -1 : 1;
        if (a.timedOut !== b.timedOut) return a.timedOut ? 1 : -1;
        return a.name.localeCompare(b.name, "tr");
      });
      rows.forEach((r, i) => (r.rank = i + 1));
      for (const r of rows) {
        if (r.correct) {
          const wp = room.players.get(r.playerId);
          if (wp) wp.roundWins += 1;
        }
      }
      room.reveal = {
        type: "higherlower",
        prices: [left.realPrice, right.realPrice],
        higherSide,
        rankings: rows,
      };
    }
    return room;
  }

  nextRound(room) {
    room.currentRound += 1;
    if (room.currentRound >= room.roundData.length) {
      return this.endGame(room);
    }
    return { room, startRound: true };
  }

  endGame(room) {
    this.clearTimer(room);
    room.phase = "GAME_OVER";
    const finalRankings = [...room.players.values()]
      .map((p) => ({ playerId: p.id, name: p.name, roundWins: p.roundWins }))
      .sort((a, b) => b.roundWins - a.roundWins || a.name.localeCompare(b.name, "tr"));
    finalRankings.forEach((r, i) => (r.rank = i + 1));
    room.finalRankings = finalRankings;
    room.reveal = null;
    return room;
  }

  playAgain(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "GAME_OVER") return { error: "Tekrar oynanamaz" };
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player || player.id !== room.hostId) return { error: "Sadece host başlatabilir" };
    if (this.connectedPlayers(room).length < 2) return { error: "En az 2 aktif oyuncu gerekli" };

    room.phase = "LOBBY";
    room.currentRound = 0;
    room.roundData = [];
    room.reveal = null;
    room.finalRankings = null;
    room.submissions = new Map();
    room.timeLeft = 0;
    for (const p of room.players.values()) {
      p.roundWins = 0;
      p.hasSubmitted = false;
    }
    return { room };
  }

  disconnect(socketId, onRoomUpdate) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player) return null;

    player.socketId = null;
    this.socketRoom.delete(socketId);

    this._clearDisconnectTimer(player);
    player.disconnectTimer = setTimeout(() => {
      const r = this.getRoom(room.code);
      if (!r) return;
      const still = r.players.get(player.id);
      if (!still || still.socketId) return;

      r.players.delete(player.id);
      if (r.players.size === 0) {
        this.destroyRoom(r);
        onRoomUpdate?.({ destroyed: true, code: r.code, reason: "Oda kapandı" });
        return;
      }

      if (still.id === r.hostId) {
        const next = this.connectedPlayers(r)[0] || r.players.values().next().value;
        if (next) r.hostId = next.id;
      }

      const active = this.connectedPlayers(r).length;
      if (r.phase !== "LOBBY" && active < 2) {
        this.destroyRoom(r);
        onRoomUpdate?.({ destroyed: true, code: r.code, reason: "Yeterli oyuncu kalmadı" });
        return;
      }

      onRoomUpdate?.({ room: r });
    }, DISCONNECT_GRACE_MS);

    if (player.id === room.hostId) {
      const next = this.connectedPlayers(room)[0];
      if (next) room.hostId = next.id;
    }

    return { room, playerId: player.id };
  }

  leave(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    if (!player) return null;

    this._clearDisconnectTimer(player);
    room.players.delete(player.id);
    this.socketRoom.delete(socketId);

    if (room.players.size === 0) {
      this.destroyRoom(room);
      return { destroyed: true, code: room.code };
    }

    if (player.id === room.hostId) {
      const next = this.connectedPlayers(room)[0] || room.players.values().next().value;
      if (next) room.hostId = next.id;
    }

    if (room.phase !== "LOBBY" && this.connectedPlayers(room).length < 2) {
      this.destroyRoom(room);
      return { destroyed: true, code: room.code, reason: "Yeterli oyuncu kalmadı" };
    }

    return { room, playerId: player.id };
  }

  destroyRoom(room) {
    this.clearTimer(room);
    this.rooms.delete(room.code);
    for (const p of room.players.values()) {
      this._clearDisconnectTimer(p);
      if (p.socketId) this.socketRoom.delete(p.socketId);
    }
  }

  serialize(room, viewerSocketId) {
    const viewer = [...room.players.values()].find((p) => p.socketId === viewerSocketId);
    const isPlaying = room.phase === "ROUND_PLAYING";
    const isReveal = room.phase === "ROUND_REVEAL";

    let listing = null;
    let pair = null;
    let slider = null;

    if ((isPlaying || isReveal) && room.roundData[room.currentRound]) {
      if (room.config.mode === "classic") {
        listing = sanitizeListing(room.roundData[room.currentRound]);
        slider = sliderRange(room.roundData[room.currentRound]);
      } else {
        const [a, b] = room.roundData[room.currentRound];
        pair = [sanitizeListing(a), sanitizeListing(b)];
      }
    }

    return {
      code: room.code,
      phase: room.phase,
      isHost: viewer?.id === room.hostId,
      config: room.config,
      currentRound: room.currentRound + 1,
      totalRounds: room.roundData.length || room.config.rounds,
      timeLeft: room.timeLeft,
      submittedCount: [...room.players.values()].filter((p) => p.hasSubmitted).length,
      playerCount: this.connectedPlayers(room).length,
      totalSlots: room.players.size,
      revealSeconds: isReveal ? REVEAL_SECONDS : 0,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        roundWins: p.roundWins,
        hasSubmitted: p.hasSubmitted,
        isHost: p.id === room.hostId,
        isYou: p.socketId === viewerSocketId,
        offline: !p.socketId,
      })),
      listing,
      pair,
      slider,
      reveal: room.reveal,
      finalRankings: room.finalRankings,
    };
  }
}

module.exports = { RoomManager, REVEAL_SECONDS };
