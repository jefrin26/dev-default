import type { ServerEvent } from "../types";
import {
  deriveStatus,
  formatLocal,
  formatRelative,
  formatUtc,
} from "../lib/time";
import { Countdown } from "./Countdown";
import { StatusBadge } from "./StatusBadge";

interface EventCardProps {
  event: ServerEvent;
  now: number;
}

export function EventCard({ event, now }: EventCardProps) {
  const status = deriveStatus(event, now);

  return (
    <article className={`event-card event-card--${status}`}>
      <div className="event-card-top">
        <StatusBadge status={status} />
        <time className="event-posted" dateTime={event.createdAt}>
          Posted {formatRelative(event.createdAt, now)}
        </time>
      </div>

      <h3 className="event-title">{event.title}</h3>
      {event.message ? <p className="event-message">{event.message}</p> : null}

      <dl className="event-window">
        <div>
          <dt>Starts</dt>
          <dd>{formatUtc(event.startAt)}</dd>
          <dd className="event-local">{formatLocal(event.startAt)}</dd>
        </div>
        <div>
          <dt>Ends</dt>
          <dd>{formatUtc(event.endAt)}</dd>
          <dd className="event-local">{formatLocal(event.endAt)}</dd>
        </div>
      </dl>

      <Countdown event={event} now={now} />
    </article>
  );
}
