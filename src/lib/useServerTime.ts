import { useEffect, useRef, useState } from "react";

/**
 * Returns a ticking "now" value adjusted by the difference between the
 * server clock and the browser clock, so countdowns do not drift when the
 * visitor's machine has the wrong time.
 */
export function useServerTime(syncedAt: string | null): number {
  const offset = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!syncedAt) {
      return;
    }
    offset.current = Date.parse(syncedAt) - Date.now();
    setNow(Date.now() + offset.current);
  }, [syncedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now() + offset.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
