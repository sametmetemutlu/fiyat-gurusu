"use client";

import { useEffect, useState } from "react";

export interface Profile {
  name: string;
  provider: "guest" | "google";
}

const KEY = "fg_profile";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event("fg_profile_change"));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("fg_profile_change"));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    setReady(true);
    window.addEventListener("fg_profile_change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fg_profile_change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { profile, ready };
}
