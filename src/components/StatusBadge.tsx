import type { DerivedStatus } from "../types";

const LABELS: Record<DerivedStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: DerivedStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
