import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createNewEvent,
  httpError,
  sortEvents,
  validateInput,
  validateStatus,
} from "./events.js";

const dataDir = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
);
const filePath = path.join(dataDir, "events.json");
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EXTENSION_MINUTES = 30 * 24 * 60;

// Serialize mutations so two concurrent writes cannot clobber each other.
let queue = Promise.resolve();

async function readStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (!parsed || !Array.isArray(parsed.events)) {
      return { version: 1, events: [] };
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      return { version: 1, events: [] };
    }
    throw error;
  }
}

async function writeStore(data) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporary = path.join(dataDir, `.events.${process.pid}.${randomUUID()}.tmp`);
  await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.rename(temporary, filePath);
}

function mutate(action) {
  const task = queue.then(async () => {
    const data = await readStore();
    const result = await action(data.events);
    await writeStore(data);
    return result;
  });
  queue = task.catch(() => {});
  return task;
}

export async function listEvents({ includeOld = false } = {}) {
  const data = await readStore();
  const cutoff = Date.now() - RETENTION_MS;
  const events = includeOld
    ? data.events
    : data.events.filter((event) => Date.parse(event.endAt) >= cutoff);
  return sortEvents(events);
}

export async function createEvent(input) {
  const event = createNewEvent(input);
  await mutate((events) => {
    events.push(event);
  });
  return event;
}

export async function updateEvent(id, patch) {
  return mutate((events) => {
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) {
      throw httpError(404, "Update not found.");
    }
    const existing = events[index];
    const source = patch && typeof patch === "object" ? patch : {};
    const fields = validateInput(source, existing);
    const status = validateStatus(source.status) ?? existing.status;
    const updated = {
      ...existing,
      ...fields,
      status,
      updatedAt: new Date().toISOString(),
    };
    events[index] = updated;
    return updated;
  });
}

export async function extendEvent(id, minutes) {
  if (
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    minutes > MAX_EXTENSION_MINUTES
  ) {
    throw httpError(400, "Extension must be between 1 minute and 30 days.");
  }

  return mutate((events) => {
    const event = events.find((item) => item.id === id);
    if (!event) {
      throw httpError(404, "Update not found.");
    }
    event.endAt = new Date(Date.parse(event.endAt) + minutes * 60_000).toISOString();
    event.updatedAt = new Date().toISOString();
    return event;
  });
}

export async function deleteEvent(id) {
  await mutate((events) => {
    const index = events.findIndex((event) => event.id === id);
    if (index === -1) {
      throw httpError(404, "Update not found.");
    }
    events.splice(index, 1);
  });
}
