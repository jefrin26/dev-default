import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../lib/api";
import { formatUtc, toLocalInputValue } from "../lib/time";
import type { ServerEvent } from "../types";

interface EventFormProps {
  initial: ServerEvent | null;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}

function toMillis(value: string): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}

export function EventForm({ initial, onCancel, onSaved }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [start, setStart] = useState(
    initial ? toLocalInputValue(initial.startAt) : "",
  );
  const [end, setEnd] = useState(initial ? toLocalInputValue(initial.endAt) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startMs = toMillis(start);
  const endMs = toMillis(end);
  const timesValid = Number.isFinite(startMs) && Number.isFinite(endMs);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    if (!timesValid) {
      setError("Enter valid start and end times.");
      return;
    }
    if (endMs <= startMs) {
      setError("The end time must be after the start time.");
      return;
    }

    const input = {
      title: title.trim(),
      message: message.trim(),
      startAt: new Date(startMs).toISOString(),
      endAt: new Date(endMs).toISOString(),
    };

    setBusy(true);
    try {
      if (initial) {
        await api.updateEvent(initial.id, input);
      } else {
        await api.createEvent(input);
      }
      await onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-heading">
        <h3>{initial ? "Edit update" : "New update"}</h3>
        <button className="button button--ghost button--small" type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <p className="muted form-hint">
        Times are entered in your local timezone and stored in UTC.
      </p>

      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Dev server maintenance"
          required
        />
      </label>

      <label className="field">
        <span>Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="What should visitors know?"
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Starts</span>
          <input
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Ends</span>
          <input
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
      </div>

      {timesValid ? (
        <p className="form-preview">
          UTC: {formatUtc(new Date(startMs).toISOString())} →{" "}
          {formatUtc(new Date(endMs).toISOString())}
        </p>
      ) : null}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : initial ? "Save changes" : "Post update"}
        </button>
        <button className="button button--ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
