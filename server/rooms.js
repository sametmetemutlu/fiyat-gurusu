const {
  CLASSIC_ROUND_SECONDS,
  HIGHER_LOWER_ROUND_SECONDS,
  REVEAL_SECONDS,
  DEFAULT_ROUNDS,
  MAX_PLAYERS,
  CLASSIC_MP_LISTING_OPTIONS,
  HL_MP_ROUND_OPTIONS,
  HL_CORRECT_POINTS,
  sanitizeListing,
  sliderRange,
  classicRoundPoints,
  isValidRoundCount,
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
 * @property {number} totalScore
 * @property {number} topTierCount
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
 * @property {string|null} displaySocketId
 * @property {NodeJS.Timeout|null} displayDisconnectTimer
 */

const DISPLAY_HOST_ID = "__display__";

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

  isMonitorRoom(room) {
    return room.hostId === DISPLAY_HOST_ID;
  }

  _isHost(socketId, room) {
    if (room.displaySocketId === socketId) return true;
    const player = [...room.players.values()].find((p) => p.socketId === socketId);
    return !!player && player.id === room.hostId;
  }

  _baseRoom(code, config = {}) {
    return {
      code,
      hostId: DISPLAY_HOST_ID,
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
      displaySocketId: null,
      displayDisconnectTimer: null,
    };
  }

  createDisplayRoom(socketId, config = {}) {
    const code = generateCode(this.rooms);
    const room = this._baseRoom(code, config);
    room.displaySocketId = socketId;
    this.rooms.set(code, room);
    this.socketRoom.set(socketId, code);
    return { room };
  }

  reconnectDisplay(code, socketId) {
    const room = this.getRoom(code);
    if (!room) return { error: "Oda bulunamadı" };
    if (!this.isMonitorRoom(room)) return { error: "Bu oda monitör modunda değil" };
    if (room.displaySocketId && room.displaySocketId !== socketId) {
      return { error: "Monitör zaten bağlı" };
    }
    this._clearDisplayDisconnectTimer(room);
    room.displaySocketId = socketId;
    room.hostId = DISPLAY_HOST_ID;
    this.socketRoom.set(socketId, code);
    return { room };
  }

  _clearDisplayDisconnectTimer(room) {
    if (room.displayDisconnectTimer) {
      clearTimeout(room.displayDisconnectTimer);
      room.displayDisconnectTimer = null;
    }
  }

  createRoom(socketId, playerName, config = {}) {
    const code = generateCode(this.rooms);
    const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    /** @type {Room} */
    const room = this._baseRoom(code, config);
    room.hostId = playerId;
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
      totalScore: 0,
      topTierCount: 0,
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
    if (!this._isHost(socketId, room)) return { error: "Sadece host ayarlayabilir" };
    if (patch.mode === "classic" || patch.mode === "higherlower") {
      room.config.mode = patch.mode;
      const opts = room.config.mode === "classic" ? CLASSIC_MP_LISTING_OPTIONS : HL_MP_ROUND_OPTIONS;
      if (!opts.includes(room.config.rounds)) room.config.rounds = DEFAULT_ROUNDS;
    }
    if (["ALL", "CAR", "HOUSE"].includes(patch.category)) room.config.category = patch.category;
    if (patch.rounds != null && isValidRoundCount(room.config.mode, patch.rounds)) {
      room.config.rounds = patch.rounds;
    }
    return { room };
  }

  startGame(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "LOBBY") return { error: "Oyun başlatılamaz" };
    if (!this._isHost(socketId, room)) return { error: "Sadece host başlatabilir" };
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
        const { points, tier, deviation } = timedOut
          ? { points: 0, tier: { code: "—", label: "Süre doldu ⏱" }, deviation: 100 }
          : classicRoundPoints(guess, realPrice);
        const wp = room.players.get(p.id);
        if (wp) {
          wp.totalScore += points;
          if (tier.code === "S" || tier.code === "A") wp.topTierCount += 1;
        }
        return {
          playerId: p.id,
          name: p.name,
          guess: timedOut ? null : guess,
          deviation,
          points,
          tierCode: tier.code,
          tierLabel: tier.label,
          timedOut,
        };
      });
      rows.sort((a, b) => b.points - a.points || a.deviation - b.deviation);
      rows.forEach((r, i) => (r.rank = i + 1));
      const winner = rows[0];
      room.reveal = {
        type: "classic",
        realPrice,
        rankings: rows,
        roundWinnerId: winner?.points > 0 ? winner.playerId : null,
      };
    } else {
      const [left, right] = room.roundData[room.currentRound];
      const higherSide = left.realPrice >= right.realPrice ? 0 : 1;
      const rows = [...room.players.values()].map((p) => {
        const pick = room.submissions.get(p.id);
        const timedOut = pick === undefined;
        const correct = !timedOut && pick === higherSide;
        const points = correct ? HL_CORRECT_POINTS : 0;
        const wp = room.players.get(p.id);
        if (wp && points > 0) wp.totalScore += points;
        return { playerId: p.id, name: p.name, pick: timedOut ? null : pick, correct, points, timedOut };
      });
      rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "tr"));
      rows.forEach((r, i) => (r.rank = i + 1));
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
      .map((p) => ({
        playerId: p.id,
        name: p.name,
        totalScore: p.totalScore,
        topTierCount: p.topTierCount,
      }))
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore ||
          b.topTierCount - a.topTierCount ||
          a.name.localeCompare(b.name, "tr")
      );
    finalRankings.forEach((r, i) => (r.rank = i + 1));
    room.finalRankings = finalRankings;
    room.reveal = null;
    return room;
  }

  playAgain(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.phase !== "GAME_OVER") return { error: "Tekrar oynanamaz" };
    if (!this._isHost(socketId, room)) return { error: "Sadece host başlatabilir" };
    if (this.connectedPlayers(room).length < 2) return { error: "En az 2 aktif oyuncu gerekli" };

    room.phase = "LOBBY";
    room.currentRound = 0;
    room.roundData = [];
    room.reveal = null;
    room.finalRankings = null;
    room.submissions = new Map();
    room.timeLeft = 0;
    for (const p of room.players.values()) {
      p.totalScore = 0;
      p.topTierCount = 0;
      p.hasSubmitted = false;
    }
    return { room };
  }

  disconnectDisplay(socketId, onRoomUpdate) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.displaySocketId !== socketId) return null;

    room.displaySocketId = null;
    this.socketRoom.delete(socketId);
    this._clearDisplayDisconnectTimer(room);

    room.displayDisconnectTimer = setTimeout(() => {
      const r = this.getRoom(room.code);
      if (!r || r.displaySocketId) return;
      if (r.phase === "LOBBY" && r.hostId === DISPLAY_HOST_ID) {
        const next = this.connectedPlayers(r)[0];
        if (next) r.hostId = next.id;
      }
      onRoomUpdate?.({ room: r });
    }, DISCONNECT_GRACE_MS);

    return { room };
  }

  leaveDisplay(socketId) {
    const room = this.getRoomBySocket(socketId);
    if (!room || room.displaySocketId !== socketId) return null;
    this._clearDisplayDisconnectTimer(room);
    room.displaySocketId = null;
    this.socketRoom.delete(socketId);
    if (room.phase === "LOBBY" && room.hostId === DISPLAY_HOST_ID) {
      const next = this.connectedPlayers(room)[0];
      if (next) room.hostId = next.id;
    }
    if (room.players.size === 0 && !room.displaySocketId) {
      this.destroyRoom(room);
      return { destroyed: true, code: room.code };
    }
    return { room };
  }

  disconnect(socketId, onRoomUpdate) {
    const room = this.getRoomBySocket(socketId);
    if (!room) return null;
    if (room.displaySocketId === socketId) {
      return this.disconnectDisplay(socketId, onRoomUpdate);
    }
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
    this._clearDisplayDisconnectTimer(room);
    if (room.displaySocketId) this.socketRoom.delete(room.displaySocketId);
    this.rooms.delete(room.code);
    for (const p of room.players.values()) {
      this._clearDisconnectTimer(p);
      if (p.socketId) this.socketRoom.delete(p.socketId);
    }
  }

  serialize(room, viewerSocketId) {
    const isDisplay = room.displaySocketId === viewerSocketId;
    const viewer = [...room.players.values()].find((p) => p.socketId === viewerSocketId);
    const monitorMode = this.isMonitorRoom(room) && !isDisplay;
    const isPlaying = room.phase === "ROUND_PLAYING";
    const isReveal = room.phase === "ROUND_REVEAL";

    let listing = null;
    let pair = null;
    let slider = null;

    if ((isPlaying || isReveal) && room.roundData[room.currentRound]) {
      if (room.config.mode === "classic") {
        const raw = room.roundData[room.currentRound];
        if (!monitorMode) listing = sanitizeListing(raw);
        slider = sliderRange(raw);
      } else if (!monitorMode) {
        const [a, b] = room.roundData[room.currentRound];
        pair = [sanitizeListing(a), sanitizeListing(b)];
      }
    }

    if (isDisplay && (isPlaying || isReveal) && room.roundData[room.currentRound]) {
      if (room.config.mode === "classic") {
        listing = sanitizeListing(room.roundData[room.currentRound]);
      } else {
        const [a, b] = room.roundData[room.currentRound];
        pair = [sanitizeListing(a), sanitizeListing(b)];
      }
    }

    return {
      code: room.code,
      phase: room.phase,
      role: isDisplay ? "display" : "player",
      monitorMode,
      isHost: this._isHost(viewerSocketId, room),
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
        totalScore: p.totalScore,
        hasSubmitted: p.hasSubmitted,
        isHost: p.id === room.hostId && room.hostId !== DISPLAY_HOST_ID,
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
