import type {
  EventsResponse,
  EventInput,
  EventPatch,
  ServerEvent,
  SessionResponse,
} from "../types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (typeof body?.error === "string") {
        message = body.error;
      }
    } catch {
      // Keep the generic message when the error body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  getEvents: () => request<EventsResponse>("/api/events"),

  getSession: () => request<SessionResponse>("/api/admin/session"),

  login: (password: string) =>
    request<{ ok: true }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  logout: () =>
    request<{ ok: true }>("/api/admin/logout", { method: "POST" }),

  listAdminEvents: () => request<EventsResponse>("/api/admin/events"),

  createEvent: (input: EventInput) =>
    request<ServerEvent>("/api/admin/events", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateEvent: (id: string, patch: EventPatch) =>
    request<ServerEvent>(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  extendEvent: (id: string, minutes: number) =>
    request<ServerEvent>(`/api/admin/events/${encodeURIComponent(id)}/extend`, {
      method: "POST",
      body: JSON.stringify({ minutes }),
    }),

  deleteEvent: (id: string) =>
    request<void>(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong.";
}
