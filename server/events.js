import { randomUUID } from "node:crypto";

const VALID_STATUSES = new Set(["active", "cancelled"]);
const MAX_TITLE = 120;
const MAX_MESSAGE = 2000;

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function deriveStatus(event, nowMs = Date.now()) {
  if (event.status === "cancelled") {
    return "cancelled";
  }
  if (nowMs < Date.parse(event.startAt)) {
    return "scheduled";
  }
  if (nowMs < Date.parse(event.endAt)) {
    return "in_progress";
  }
  return "completed";
}

export function sortEvents(events, nowMs = Date.now()) {
  const rank = { in_progress: 0, scheduled: 1, completed: 2, cancelled: 3 };
  return [...events].sort((left, right) => {
    const leftRank = rank[deriveStatus(left, nowMs)];
    const rightRank = rank[deriveStatus(right, nowMs)];
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    const delta = Date.parse(left.startAt) - Date.parse(right.startAt);
    return leftRank <= 1 ? delta : -delta;
  });
}

function parseDate(value) {
  if (typeof value !== "string") {
    throw httpError(400, "Invalid date.");
  }
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) {
    throw httpError(400, "Invalid date.");
  }
  return millis;
}

export function validateInput(input, base = {}) {
  const source = input && typeof input === "object" ? input : {};
  const title = source.title ?? base.title;
  const message = source.message ?? base.message ?? "";
  const startAt = source.startAt ?? base.startAt;
  const endAt = source.endAt ?? base.endAt;

  if (typeof title !== "string" || !title.trim() || title.trim().length > MAX_TITLE) {
    throw httpError(400, `Title must be 1-${MAX_TITLE} characters.`);
  }
  if (typeof message !== "string" || message.length > MAX_MESSAGE) {
    throw httpError(400, `Message must be at most ${MAX_MESSAGE} characters.`);
  }

  const startMs = parseDate(startAt);
  const endMs = parseDate(endAt);
  if (endMs <= startMs) {
    throw httpError(400, "End time must be after start time.");
  }

  return {
    title: title.trim(),
    message: message.trim(),
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
  };
}

export function validateStatus(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!VALID_STATUSES.has(value)) {
    throw httpError(400, "Invalid status.");
  }
  return value;
}

export function createNewEvent(input) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    ...validateInput(input),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}
