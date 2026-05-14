import type { ActionStatus } from "~/config/incentive-rules";

const CLASS: Record<ActionStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-approved",
  Denied: "badge-denied",
  Disputed: "badge-disputed",
};

export function StatusBadge({ status }: { status: ActionStatus }) {
  return <span className={CLASS[status]}>{status}</span>;
}
