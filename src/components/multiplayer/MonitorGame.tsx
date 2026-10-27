"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  MP_SERVER_URL,
  clearDisplaySession,
  loadDisplaySession,
  mpBlockedReason,
  saveDisplaySession,
  type DisplaySession,
  type MpMode,
  type RoomState,
} from "@/lib/multiplayer";
import type { CategoryFilter } from "@/lib/game";
import { GAME_PATH } from "@/lib/paths";
import MonitorLobby from "./MonitorLobby";
import MonitorClassic from "./MonitorClassic";
import MonitorHigherLower from "./MonitorHigherLower";
import MpReveal from "./MpReveal";
import MpGameOver from "./MpGameOver";

type View = "home" | "room";

export default function MonitorGame() {
  const [view, setView] = useState<View>("home");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [savedRoom, setSavedRoom] = useState<DisplaySession | null>(null);
  const autoChecked = useRef(false);

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
      clearDisplaySession();
    });
    s.on("connect_error", () => {
      setError("Sunucuya bağlanılamadı. MP sunucusu çalışıyor mu?");
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

  const onRoomReady = (code: string, secret: string, st: RoomState) => {
    saveDisplaySession(code, secret);
    setSavedRoom(null);
    setState(st);
    setView("room");
    const url = new URL(window.location.href);
    url.searchParams.set("oda", code);
    window.history.replaceState({}, "", url.toString());
  };

  const resumeRoom = (session: DisplaySession) => {
    const s = ensureSocket();
    if (!s) return;
    setConnecting(true);
    setError("");
    s.emit(
      "reconnect_display",
      { code: session.code, secret: session.secret },
      (res: { ok: boolean; error?: string; secret?: string; state?: RoomState }) => {
        setConnecting(false);
        if (res?.ok && res.state && res.secret) onRoomReady(session.code, res.secret, res.state);
        else {
          clearDisplaySession();
          setSavedRoom(null);
          setError(res?.error || "Eski oda kapanmış. Yeni oda açabilirsin.");
        }
      }
    );
  };

  const dropSavedRoom = () => {
    clearDisplaySession();
    setSavedRoom(null);
  };

  useEffect(() => {
    if (!socket || autoChecked.current) return;
    autoChecked.current = true;
    const fromUrl = new URLSearchParams(window.location.search)
      .get("oda")
      ?.toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const session = loadDisplaySession();
    if (!session) return;
    if (fromUrl && fromUrl === session.code) {
      resumeRoom(session);
      return;
    }
    setSavedRoom(session);
  }, [socket]);

  const createRoom = () => {
    const s = ensureSocket();
    if (!s) return;
    setConnecting(true);
    setError("");
    s.emit("create_display_room", {}, (res: { ok: boolean; error?: string; secret?: string; state?: RoomState }) => {
      setConnecting(false);
      if (!res?.ok) setError(res?.error || "Oda oluşturulamadı");
      else if (res.state && res.secret) onRoomReady(res.state.code, res.secret, res.state);
    });
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
    socket?.emit("leave_display", {});
    setState(null);
    setView("home");
    setSavedRoom(null);
    clearDisplaySession();
    const url = new URL(window.location.href);
    url.searchParams.delete("oda");
    window.history.replaceState({}, "", url.pathname);
  };

  if (view === "room" && state) {
    if (state.phase === "LOBBY") {
      return (
        <MonitorLobby
          state={state}
          error={error}
          onUpdateConfig={updateConfig}
          onStart={startGame}
          onLeave={leaveRoom}
        />
      );
    }
    if (state.phase === "ROUND_PLAYING") {
      if (state.config.mode === "classic" && state.listing) {
        return <MonitorClassic state={state} listing={state.listing} />;
      }
      if (state.config.mode === "higherlower" && state.pair) {
        return <MonitorHigherLower state={state} pair={state.pair} />;
      }
    }
    if (state.phase === "ROUND_REVEAL" && state.reveal) {
      return (
        <div className="min-h-screen bg-[#0f1419] text-white px-6 py-8">
          <MpReveal state={state} reveal={state.reveal} />
        </div>
      );
    }
    if (state.phase === "GAME_OVER" && state.finalRankings) {
      return (
        <div className="min-h-screen bg-[#0f1419] text-white px-6 py-8">
          <MpGameOver state={state} onLeave={leaveRoom} onPlayAgain={playAgain} />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-xl w-full text-center space-y-8 animate-slideup">
        <div className="space-y-3">
          <div className="text-6xl">📺</div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold">Monitör Modu</h1>
          <p className="text-white/60 text-lg">
            TV veya PC&apos;de oyunu göster. Oyuncular telefondan QR ile katılsın, tahminlerini yapsın.
          </p>
        </div>

        {savedRoom && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <p className="text-white/70">
              Önceki monitör odan duruyor: <b className="font-display tracking-widest text-white">{savedRoom.code}</b>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => resumeRoom(savedRoom)}
                disabled={connecting}
                className="py-3 rounded-xl bg-white/10 font-display font-bold"
              >
                Odaya dön
              </button>
              <button onClick={dropSavedRoom} className="py-3 rounded-xl bg-white/10 font-display font-bold">
                Bırak
              </button>
            </div>
          </div>
        )}

        <button
          onClick={createRoom}
          disabled={connecting}
          className="w-full py-5 rounded-2xl bg-brand text-white font-display text-xl font-extrabold hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
        >
          {connecting ? "Bağlanıyor…" : "Oda Aç (Monitör)"}
        </button>

        <Link href={`${GAME_PATH}/cok-oyunculu`} className="block text-white/50 hover:text-white text-sm">
          ← Telefon oyuncu moduna dön
        </Link>

        {error && <p className="text-red-400 font-semibold">{error}</p>}
      </div>
    </div>
  );
}
