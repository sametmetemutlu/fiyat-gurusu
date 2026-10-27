"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { useProfile } from "@/lib/profile";
import { GAME_PATH } from "@/lib/paths";
import {
  MP_MODE_LABELS,
  MP_SERVER_URL,
  clearMpSession,
  loadMpSession,
  mpBlockedReason,
  roomInviteUrl,
  saveMpSession,
  type MpMode,
  type MpSession,
  type RoomState,
} from "@/lib/multiplayer";
import type { CategoryFilter } from "@/lib/game";
import MpLobby from "./MpLobby";
import MpClassicRound from "./MpClassicRound";
import MpHigherLowerRound from "./MpHigherLowerRound";
import MpReveal from "./MpReveal";
import MpGameOver from "./MpGameOver";

type View = "home" | "room";

export default function MultiplayerGame() {
  const { profile, ready } = useProfile();
  const [view, setView] = useState<View>("home");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedRoom, setSavedRoom] = useState<MpSession | null>(null);
  const autoChecked = useRef(false);

  const playerName = profile?.name || "Misafir";

  const bindSocket = useCallback((s: Socket) => {
    s.on("room_state", (st: RoomState) => {
      setState(st);
      setView("room");
      setError("");
    });
    s.on("room_closed", (payload: { reason: string }) => {
      setError(payload.reason);
      setState(null);
      setView("home");
      setSavedRoom(null);
      clearMpSession();
    });
    s.on("connect_error", () => {
      setError("Sunucuya bağlanılamadı. Terminalde: npm run dev:mp");
    });
  }, []);

  useEffect(() => {
    const blocked = mpBlockedReason();
    if (blocked) {
      setError(blocked);
      return;
    }
    const s = io(MP_SERVER_URL, { autoConnect: false, transports: ["websocket", "polling"] });
    bindSocket(s);
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [bindSocket]);

  const ensureSocket = () => {
    if (!socket) return null;
    if (!socket.connected) socket.connect();
    return socket;
  };

  const onRoomJoined = (code: string, playerId: string, secret: string, st?: RoomState) => {
    saveMpSession(code, playerId, secret);
    setSavedRoom(null);
    if (st) {
      setState(st);
      setView("room");
    }
    const url = new URL(window.location.href);
    url.searchParams.set("oda", code);
    window.history.replaceState({}, "", url.toString());
  };

  const resumeRoom = (session: MpSession) => {
    const s = ensureSocket();
    if (!s) return;
    setConnecting(true);
    setError("");
    s.emit(
      "reconnect_room",
      { code: session.code, playerId: session.playerId, secret: session.secret, playerName },
      (res: { ok: boolean; error?: string; playerId?: string; secret?: string; state?: RoomState }) => {
        setConnecting(false);
        if (res?.ok && res.state && res.secret) {
          setSavedRoom(null);
          onRoomJoined(session.code, res.playerId || session.playerId, res.secret, res.state);
        } else {
          clearMpSession();
          setSavedRoom(null);
          setError(res?.error || "Eski oda kapanmış. Yeni oda kurabilirsin.");
        }
      }
    );
  };

  const dropSavedRoom = () => {
    clearMpSession();
    setSavedRoom(null);
  };

  useEffect(() => {
    if (!ready || !profile || !socket || autoChecked.current) return;
    autoChecked.current = true;
    const fromUrl = new URLSearchParams(window.location.search)
      .get("oda")
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    if (fromUrl) setJoinCode(fromUrl);
    const session = loadMpSession();
    if (!session) return;
    if (fromUrl && fromUrl === session.code) {
      resumeRoom(session);
      return;
    }
    setSavedRoom(session);
  }, [ready, profile, socket]);

  const createRoom = () => {
    const s = ensureSocket();
    if (!s) return;
    setConnecting(true);
    setError("");
    s.emit("create_room", { playerName }, (res: { ok: boolean; error?: string; playerId?: string; secret?: string; state?: RoomState }) => {
      setConnecting(false);
      if (!res?.ok) setError(res?.error || "Oda oluşturulamadı");
      else if (res.state && res.playerId && res.secret) onRoomJoined(res.state.code, res.playerId, res.secret, res.state);
    });
  };

  const joinRoom = (code?: string) => {
    const s = ensureSocket();
    const c = (code || joinCode).trim().toUpperCase();
    if (!s || c.length < 6) return;
    setConnecting(true);
    setError("");
    s.emit(
      "join_room",
      { code: c, playerName },
      (res: { ok: boolean; error?: string; playerId?: string; secret?: string; state?: RoomState }) => {
        setConnecting(false);
        if (!res?.ok) setError(res?.error || "Katılınamadı");
        else if (res.state && res.playerId && res.secret) onRoomJoined(res.state.code, res.playerId, res.secret, res.state);
      }
    );
  };

  const updateConfig = (patch: { mode?: MpMode; category?: CategoryFilter; rounds?: number }) => {
    socket?.emit("update_config", patch);
  };

  const startGame = () => {
    socket?.emit("start_game", {}, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error || "Başlatılamadı");
    });
  };

  const playAgain = () => {
    socket?.emit("play_again", {}, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setError(res?.error || "Tekrar başlatılamadı");
    });
  };

  const leaveRoom = () => {
    socket?.emit("leave_room", {});
    setState(null);
    setView("home");
    setJoinCode("");
    setSavedRoom(null);
    clearMpSession();
    const url = new URL(window.location.href);
    url.searchParams.delete("oda");
    window.history.replaceState({}, "", url.pathname);
  };

  const copyInvite = async (code: string) => {
    await navigator.clipboard?.writeText(roomInviteUrl(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!ready) return <div className="min-h-[50vh]" />;

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted">Çok oyunculu için önce takma adınla giriş yap.</p>
        <Link href={GAME_PATH} className="fg-btn fg-btn-primary">
          Ana sayfaya dön
        </Link>
      </div>
    );
  }

  if (view === "room" && state) {
    if (state.phase === "LOBBY") {
      return (
        <MpLobby
          state={state}
          error={error}
          copied={copied}
          onUpdateConfig={updateConfig}
          onStart={startGame}
          onLeave={leaveRoom}
          onCopyInvite={() => copyInvite(state.code)}
        />
      );
    }
    if (state.phase === "ROUND_PLAYING") {
      if (state.config.mode === "classic" && state.slider) {
        return (
          <MpClassicRound
            state={state}
            listing={state.listing}
            slider={state.slider}
            socket={socket}
            onError={setError}
            monitorMode={state.monitorMode}
          />
        );
      }
      if (state.config.mode === "higherlower" && (state.pair || state.monitorMode)) {
        return (
          <MpHigherLowerRound
            state={state}
            pair={state.pair}
            socket={socket}
            onError={setError}
            monitorMode={state.monitorMode}
          />
        );
      }
    }
    if (state.phase === "ROUND_REVEAL" && state.reveal) {
      return <MpReveal state={state} reveal={state.reveal} />;
    }
    if (state.phase === "GAME_OVER" && state.finalRankings) {
      return (
        <MpGameOver
          state={state}
          onLeave={leaveRoom}
          onPlayAgain={state.isHost ? playAgain : undefined}
        />
      );
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6 animate-slideup">
      <div className="text-center space-y-2">
        <h2 className="font-display text-3xl font-extrabold">👥 Çok Oyunculu</h2>
        <p className="text-muted text-sm">
          Arkadaşlarınla oda kur, aynı ilanları tahmin et. Max <b className="text-foreground">10 kişi</b>.
        </p>
      </div>

      {savedRoom && (
        <div className="fg-card p-5 space-y-3">
          <p className="text-sm text-muted text-center">
            Önceki odan duruyor: <b className="font-display tracking-widest text-foreground">{savedRoom.code}</b>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => resumeRoom(savedRoom)} disabled={connecting} className="fg-btn fg-btn-ghost">
              Odaya dön
            </button>
            <button onClick={dropSavedRoom} className="fg-btn fg-btn-ghost">
              Bırak
            </button>
          </div>
        </div>
      )}

      <div className="fg-card p-6 space-y-4">
        <p className="text-sm text-muted text-center">
          Merhaba, <b className="text-foreground">{playerName}</b>
        </p>
        <button
          onClick={createRoom}
          disabled={connecting}
          className="fg-btn fg-btn-primary w-full text-lg"
        >
          Oda Oluştur
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <div className="h-px bg-black/10 flex-1" />
          veya koda katıl
          <div className="h-px bg-black/10 flex-1" />
        </div>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && joinRoom()}
          placeholder="6 haneli kod"
          maxLength={6}
          className="w-full bg-black/[0.03] border border-black/10 rounded-2xl px-4 py-3 text-foreground text-center font-display font-bold tracking-[0.2em] uppercase outline-none focus:border-brand focus:bg-white"
        />
        <button
          onClick={() => joinRoom()}
          disabled={connecting || joinCode.length < 6}
          className="fg-btn fg-btn-gold w-full"
        >
          Katıl
        </button>
      </div>

      <div className="text-left fg-card p-4 text-sm text-muted space-y-1">
        <div>🎯 Klasik veya ⚖️ Hangisi Pahalı modu</div>
        <div>⏱️ Tur süresi + 5 sn sıralama ekranı</div>
        <div>🔗 Oda linki paylaş, arkadaşlar direkt katılsın</div>
      </div>

      <Link
        href={`${GAME_PATH}/cok-oyunculu/ekran`}
        className="fg-card p-4 text-center text-sm text-muted hover:text-foreground transition block"
      >
        📺 <b className="text-foreground">Monitör modu</b> — TV veya PC&apos;de oyunu göster
      </Link>

      {error && <p className="text-center text-red-600 text-sm font-semibold">{error}</p>}
      {connecting && <p className="text-center text-muted text-sm">Bağlanıyor…</p>}
    </div>
  );
}
