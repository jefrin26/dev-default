import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Header } from "../components/Header";
import { StatusBadge } from "../components/StatusBadge";
import { api, ApiError, errorMessage } from "../lib/api";
import {
  deriveStatus,
  formatRelative,
  formatUtc,
  toLocalInputValue,
} from "../lib/time";
import { useServerTime } from "../lib/useServerTime";
import type { EventsResponse, ServerEvent } from "../types";
import { EventForm } from "./EventForm";
import { LoginForm } from "./LoginForm";

type AuthState = "checking" | "out" | "in";

interface CustomEndFormProps {
  event: ServerEvent;
  busy: boolean;
  onSave: (endAt: string) => void;
  onCancel: () => void;
}

function CustomEndForm({ event, busy, onSave, onCancel }: CustomEndFormProps) {
  const [value, setValue] = useState(toLocalInputValue(event.endAt));

  const submit = (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const millis = new Date(value).getTime();
    if (Number.isFinite(millis)) {
      onSave(new Date(millis).toISOString());
    }
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      <label className="field">
        <span>New end time (your timezone)</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(changeEvent) => setValue(changeEvent.target.value)}
          required
        />
      </label>
      <div className="form-actions">
        <button className="button button--primary button--small" type="submit" disabled={busy}>
          Set end time
        </button>
        <button className="button button--ghost button--small" type="button" onClick={onCancel}>
          Never mind
        </button>
      </div>
    </form>
  );
}

export function AdminPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [data, setData] = useState<EventsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerEvent | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customFor, setCustomFor] = useState<string | null>(null);

  const now = useServerTime(data?.serverNow ?? null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.listAdminEvents();
      setData(next);
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuth("out");
        setError("Session expired. Please sign in again.");
        return;
      }
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    let active = true;
    api
      .getSession()
      .then((session) => {
        if (active) {
          setAuth(session.authenticated ? "in" : "out");
        }
      })
      .catch(() => {
        if (active) {
          setAuth("out");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (auth !== "in") {
      return;
    }
    void refresh();
    const poll = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(poll);
  }, [auth, refresh]);

  const runAction = async (
    id: string | null,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setError(null);
    setNotice(null);
    setBusyId(id);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuth("out");
        setError("Session expired. Please sign in again.");
      } else {
        setError(errorMessage(cause));
      }
    } finally {
      setBusyId(null);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setAuth("out");
      setData(null);
    }
  };

  if (auth === "checking") {
    return (
      <div className="site">
        <Header />
        <main className="main">
          <p className="muted">Checking session…</p>
        </main>
      </div>
    );
  }

  if (auth === "out") {
    return <LoginForm onSuccess={() => setAuth("in")} />;
  }

  const events = data?.events ?? [];

  return (
    <div className="site">
      <Header />

      <main className="main main--admin">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Maintenance updates</h1>
          </div>
          <div className="admin-actions">
            <a className="admin-link" href="/">
              View site
            </a>
            <button className="button button--ghost button--small" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>

        {error ? (
          <div className="notice notice--error" role="alert">
            {error}
          </div>
        ) : null}
        {notice ? <div className="notice notice--ok" role="status">{notice}</div> : null}

        {showForm ? (
          <EventForm
            initial={editing}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={async () => {
              setShowForm(false);
              setEditing(null);
              setNotice("Update saved.");
              await refresh();
            }}
          />
        ) : (
          <button
            className="button button--primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            + New update
          </button>
        )}

        <section className="admin-list" aria-labelledby="admin-list-heading">
          <div className="section-heading">
            <h2 id="admin-list-heading">
              All updates <span className="count">{events.length}</span>
            </h2>
          </div>

          {events.length === 0 ? (
            <p className="muted">No updates yet. Post one to get started.</p>
          ) : null}

          {events.map((event) => {
            const status = deriveStatus(event, now);
            const busy = busyId === event.id;

            return (
              <article className="admin-item" key={event.id}>
                <div className="admin-item-top">
                  <div className="admin-item-info">
                    <div className="admin-item-title">
                      <StatusBadge status={status} />
                      <h3>{event.title}</h3>
                    </div>
                    <p className="admin-item-time">
                      {formatUtc(event.startAt)} → {formatUtc(event.endAt)}
                    </p>
                    {event.message ? (
                      <p className="event-message">{event.message}</p>
                    ) : null}
                    <p className="event-posted">
                      Posted {formatRelative(event.createdAt, now)}
                    </p>
                  </div>

                  <div className="admin-item-actions">
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(event);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(event.id, () => api.extendEvent(event.id, 30), "Extended by 30 minutes.")}
                    >
                      +30m
                    </button>
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(event.id, () => api.extendEvent(event.id, 60), "Extended by 1 hour.")}
                    >
                      +1h
                    </button>
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(event.id, () => api.extendEvent(event.id, 120), "Extended by 2 hours.")}
                    >
                      +2h
                    </button>
                    <button
                      className="button button--ghost button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => setCustomFor(customFor === event.id ? null : event.id)}
                    >
                      Custom…
                    </button>
                    {status !== "cancelled" ? (
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(event.id, () => api.updateEvent(event.id, { status: "cancelled" }), "Update cancelled.")}
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      className="button button--danger button--small"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
                          void runAction(event.id, () => api.deleteEvent(event.id), "Update deleted.");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {customFor === event.id ? (
                  <CustomEndForm
                    key={`${event.id}-${event.endAt}`}
                    event={event}
                    busy={busy}
                    onCancel={() => setCustomFor(null)}
                    onSave={(endAt) => {
                      void runAction(event.id, () => api.updateEvent(event.id, { endAt }), "End time updated.");
                      setCustomFor(null);
                    }}
                  />
                ) : null}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
