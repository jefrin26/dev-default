export type EventStatus = "active" | "cancelled";

export type DerivedStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface ServerEvent {
  id: string;
  title: string;
  message: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  status: EventStatus;
}

export interface EventsResponse {
  events: ServerEvent[];
  serverNow: string;
}

export interface SessionResponse {
  authenticated: boolean;
}

export interface EventInput {
  title: string;
  message: string;
  startAt: string;
  endAt: string;
}

export type EventPatch = Partial<EventInput> & { status?: EventStatus };
