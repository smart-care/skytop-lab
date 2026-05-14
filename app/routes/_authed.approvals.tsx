import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StatusBadge } from "~/components/StatusBadge";
import type { ActionStatus } from "~/config/incentive-rules";
import { rpc } from "~/server/client";

export const Route = createFileRoute("/_authed/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(
    rpc.actions.list.queryOptions({ input: { status: "Pending" } }),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noteFor, setNoteFor] = useState<{ id: string; status: "Approved" | "Denied" } | null>(
    null,
  );
  const [note, setNote] = useState("");

  const update = useMutation({
    mutationFn: rpc.actions.updateStatus.mutationOptions().mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rpc.actions.list.key() });
      qc.invalidateQueries({ queryKey: rpc.dashboard.get.key() });
      setNoteFor(null);
      setNote("");
    },
  });
  const bulk = useMutation({
    mutationFn: rpc.actions.bulkApprove.mutationOptions().mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rpc.actions.list.key() });
      qc.invalidateQueries({ queryKey: rpc.dashboard.get.key() });
      setSelected(new Set());
    },
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={data ? `${data.rows.length} pending` : ""}
        actions={
          <button
            type="button"
            className="btn-primary"
            disabled={selected.size === 0 || bulk.isPending}
            onClick={() => bulk.mutate({ ids: Array.from(selected) })}
          >
            Approve selected ({selected.size})
          </button>
        }
      />
      <div className="p-6">
        <div className="card overflow-x-auto">
          {isLoading || !data ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : data.rows.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing pending. Caught up.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="pb-2 w-8" />
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Org / Staff</th>
                  <th className="pb-2 text-right">Commission</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                      />
                    </td>
                    <td className="py-2">{row.dateLogged}</td>
                    <td className="py-2">{row.actionType}</td>
                    <td className="py-2">
                      {row.org} / {row.staff}
                    </td>
                    <td className="py-2 text-right">${Number(row.commission).toFixed(2)}</td>
                    <td className="py-2">
                      <StatusBadge status={row.status as ActionStatus} />
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setNoteFor({ id: row.id, status: "Approved" })}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => setNoteFor({ id: row.id, status: "Denied" })}
                        >
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {noteFor ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-6">
          <div className="card w-full max-w-md space-y-4 bg-white">
            <h2 className="text-base font-semibold">
              {noteFor.status === "Approved" ? "Approve action" : "Deny action"}
            </h2>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Note (optional)</span>
              <textarea
                className="input min-h-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setNoteFor(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={noteFor.status === "Approved" ? "btn-primary" : "btn-danger"}
                onClick={() =>
                  update.mutate({ id: noteFor.id, status: noteFor.status, note: note || undefined })
                }
              >
                Confirm {noteFor.status}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
