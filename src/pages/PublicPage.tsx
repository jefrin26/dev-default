import { useCallback, useEffect, useRef, useState } from "react";
import { EventCard } from "../components/EventCard";
import { Header } from "../components/Header";
import { api, ApiError } from "../lib/api";
import { useServerTime } from "../lib/useServerTime";
import type { EventsResponse } from "../types";

export function PublicPage() {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const active = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getEvents();
      if (active.current) {
        setData(next);
        setError(null);
      }
    } catch (cause) {
      if (active.current) {
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Could not load updates.",
        );
      }
    } finally {
      if (active.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    active.current = true;
    void refresh();

    const poll = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => {
      if (!document.hidden) {
        void refresh();
      }
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active.current = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const now = useServerTime(data?.serverNow ?? null);
  const events = data?.events ?? [];

  return (
    <div className="site">
      <Header />

      <main className="main">
        <div className="hero">
          <p className="server-address">Dev-Server@dev.enyard.in</p>
          <p className="server-subtitle">Status &amp; maintenance updates</p>
        </div>

        <section className="updates" aria-labelledby="updates-heading">
          <div className="section-heading">
            <h2 id="updates-heading">Server updates</h2>
            <a className="admin-link" href="/admin">
              Admin
            </a>
          </div>

          {error ? (
            <div className="notice notice--error" role="alert">
              <span>{error}</span>
              <button className="button button--small" type="button" onClick={() => void refresh()}>
                Retry
              </button>
            </div>
          ) : null}

          {loading && !data ? <p className="muted">Loading updates…</p> : null}

          {!loading && !error && events.length === 0 ? (
            <div className="empty-state">
              <span className="empty-dot" aria-hidden="true" />
              <p>No scheduled maintenance.</p>
              <span className="muted">All systems go.</span>
            </div>
          ) : null}

          <div className="event-list">
            {events.map((event) => (
              <EventCard key={event.id} event={event} now={now} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
