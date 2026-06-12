"use client";

import { useEffect, useRef, useState } from "react";

export function useRoundTimer(
  totalSeconds: number,
  active: boolean,
  resetKey: string,
  onExpire: () => void
) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active) return;
    setRemaining(totalSeconds);
  }, [active, totalSeconds, resetKey]);

  useEffect(() => {
    if (!active) return;

    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick);
          onExpireRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [active, totalSeconds, resetKey]);

  return {
    remaining,
    progress: totalSeconds > 0 ? remaining / totalSeconds : 0,
    urgent: remaining > 0 && remaining <= 5,
  };
}
