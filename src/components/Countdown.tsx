import type { ServerEvent } from "../types";
import {
  deriveStatus,
  formatCountdown,
  formatRelative,
  formatUtc,
  progress,
} from "../lib/time";

interface CountdownProps {
  event: ServerEvent;
  now: number;
}

export function Countdown({ event, now }: CountdownProps) {
  const status = deriveStatus(event, now);

  if (status === "cancelled") {
    return (
      <div className="countdown countdown--muted">
        <span className="countdown-label">Cancelled</span>
        <span className="countdown-note">This update will not take place.</span>
      </div>
    );
  }

  if (status === "scheduled") {
    return (
      <div className="countdown">
        <span className="countdown-label">Starts in</span>
        <strong className="countdown-value" aria-live="off">
          {formatCountdown(Date.parse(event.startAt) - now)}
        </strong>
        <span className="countdown-note">{formatUtc(event.startAt)}</span>
      </div>
    );
  }

  if (status === "in_progress") {
    const percent = Math.round(progress(event, now) * 100);
    return (
      <div className="countdown countdown--live">
        <div className="countdown-row">
          <span className="countdown-label">Ends in</span>
          <strong className="countdown-value" aria-live="off">
            {formatCountdown(Date.parse(event.endAt) - now)}
          </strong>
          <span className="countdown-note">Ends {formatUtc(event.endAt)}</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Maintenance progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="countdown countdown--muted">
      <span className="countdown-label">Completed</span>
      <span className="countdown-note">
        {formatRelative(event.endAt, now)} · {formatUtc(event.endAt)}
      </span>
    </div>
  );
}
