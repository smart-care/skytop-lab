import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StatusBadge } from "~/components/StatusBadge";
import type { ActionStatus } from "~/config/incentive-rules";
import { rpc } from "~/server/client";

export const Route = createFileRoute("/_authed/activity")({ component: ActivityPage });

function ActivityPage() {
  const [status, setStatus] = useState<ActionStatus | "All">("All");
  const { data, isLoading } = useQuery(
    rpc.actions.list.queryOptions({ input: status === "All" ? {} : { status } }),
  );

  return (
    <div>
      <PageHeader
        title="My Activity"
        actions={
          <select
            className="input w-40"
            value={status}
            onChange={(e) => setStatus(e.target.value as ActionStatus | "All")}
          >
            <option value="All">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Denied">Denied</option>
            <option value="Disputed">Disputed</option>
          </select>
        }
      />
      <div className="p-6">
        <div className="card overflow-x-auto">
          {isLoading || !data ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No actions yet. Submit one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Org / Staff</th>
                  <th className="pb-2 text-right">Days</th>
                  <th className="pb-2 text-right">Commission</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="py-2">{row.dateLogged}</td>
                    <td className="py-2">{row.actionType}</td>
                    <td className="py-2">
                      {row.org} / {row.staff}
                    </td>
                    <td className="py-2 text-right">{row.daysCalc}</td>
                    <td className="py-2 text-right">${Number(row.commission).toFixed(2)}</td>
                    <td className="py-2">
                      <StatusBadge status={row.status as ActionStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
