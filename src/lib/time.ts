import type { DerivedStatus, ServerEvent } from "../types";

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

function formatInZone(iso: string, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...DATE_FORMAT,
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString();
  }
}

export function formatUtc(iso: string): string {
  return `${formatInZone(iso, "UTC")} UTC`;
}

export function formatLocal(iso: string): string {
  return `${formatInZone(iso)} (local)`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function formatRelative(iso: string, nowMs: number): string {
  const diffMinutes = Math.round((Date.parse(iso) - nowMs) / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  return formatter.format(Math.round(diffHours / 24), "day");
}

export function deriveStatus(event: ServerEvent, nowMs: number): DerivedStatus {
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

export function progress(event: ServerEvent, nowMs: number): number {
  const start = Date.parse(event.startAt);
  const end = Date.parse(event.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
