import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StatusBadge } from "~/components/StatusBadge";
import type { ActionStatus, Org } from "~/config/incentive-rules";
import { rpc } from "~/server/client";

export const Route = createFileRoute("/_authed/all-records")({ component: AllRecordsPage });

function AllRecordsPage() {
  const [org, setOrg] = useState<Org | "All">("All");
  const [status, setStatus] = useState<ActionStatus | "All">("All");
  const { data, isLoading } = useQuery(
    rpc.actions.list.queryOptions({
      input: {
        ...(org !== "All" ? { org } : {}),
        ...(status !== "All" ? { status } : {}),
      },
    }),
  );

  return (
    <div>
      <PageHeader
        title="All Records"
        actions={
          <div className="flex gap-2">
            <select
              className="input w-32"
              value={org}
              onChange={(e) => setOrg(e.target.value as Org | "All")}
            >
              <option value="All">All orgs</option>
              <option value="EHS">EHS</option>
              <option value="THC">THC</option>
            </select>
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
          </div>
        }
      />
      <div className="p-6">
        <div className="card overflow-x-auto">
          {isLoading || !data ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No records match these filters.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Org</th>
                  <th className="pb-2">Staff</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2 text-right">Days</th>
                  <th className="pb-2 text-right">Pct</th>
                  <th className="pb-2 text-right">Commission</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="py-2">{row.dateLogged}</td>
                    <td className="py-2">{row.org}</td>
                    <td className="py-2">{row.staff}</td>
                    <td className="py-2">{row.actionType}</td>
                    <td className="py-2 text-right">{row.daysCalc}</td>
                    <td className="py-2 text-right">{Math.round(Number(row.pctEarned) * 100)}%</td>
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
