import { useCallback, useEffect, useRef, useState } from "react";
import { EventCard } from "../components/EventCard";
import { Header } from "../components/Header";
import { api, ApiError } from "../lib/api";
import { deriveStatus } from "../lib/time";
import { useServerTime } from "../lib/useServerTime";
import type { EventsResponse, ServerEvent } from "../types";

type EventGroups = Record<
  "in_progress" | "scheduled" | "completed" | "cancelled",
  ServerEvent[]
>;

interface EventListProps {
  events: ServerEvent[];
  now: number;
}

function EventList({ events, now }: EventListProps) {
  if (events.length === 0) {
    return null;
  }
  return (
    <div className="event-list">
      {events.map((event) => (
        <EventCard key={event.id} event={event} now={now} />
      ))}
    </div>
  );
}

function OngoingGroup({ events, now }: EventListProps) {
  if (events.length === 0) {
    return null;
  }
  return (
    <section className="event-group event-group--fixed" aria-label="In progress">
      <h3 className="event-group-heading">
        In progress <span className="count">{events.length}</span>
      </h3>
      <EventList events={events} now={now} />
    </section>
  );
}

interface CollapsibleGroupProps extends EventListProps {
  title: string;
  defaultOpen?: boolean;
}

function CollapsibleGroup({
  title,
  events,
  now,
  defaultOpen = false,
}: CollapsibleGroupProps) {
  const details = useRef<HTMLDetailsElement>(null);

  // Keep <details> uncontrolled so polling/ticking cannot re-open a group the
  // visitor has collapsed.
  useEffect(() => {
    if (details.current) {
      details.current.open = defaultOpen;
    }
  }, [defaultOpen]);

  if (events.length === 0) {
    return null;
  }

  return (
    <details ref={details} className="event-group">
      <summary className="event-group-summary">
        <span>
          {title} <span className="count">{events.length}</span>
        </span>
        <svg
          className="chevron"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </summary>
      <EventList events={events} now={now} />
    </details>
  );
}

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
  const groups = events.reduce<EventGroups>(
    (result, event) => {
      result[deriveStatus(event, now)].push(event);
      return result;
    },
    { in_progress: [], scheduled: [], completed: [], cancelled: [] },
  );

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

          <OngoingGroup events={groups.in_progress} now={now} />
          <CollapsibleGroup title="Upcoming" events={groups.scheduled} now={now} defaultOpen />
          <CollapsibleGroup title="Completed" events={groups.completed} now={now} />
          <CollapsibleGroup title="Cancelled" events={groups.cancelled} now={now} />
        </section>
      </main>
    </div>
  );
}
