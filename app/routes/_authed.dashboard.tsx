import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "~/components/PageHeader";
import { rpc } from "~/server/client";

export const Route = createFileRoute("/_authed/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { data, isLoading } = useQuery(rpc.dashboard.get.queryOptions());

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={data ? `Month: ${data.period}` : ""} />
      <div className="space-y-6 p-6">
        {isLoading || !data ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="Pending approvals" value={data.pendingCount} />
              <StatCard
                label="Total commission (month)"
                value={`$${data.staffTotals.reduce((s, r) => s + r.total, 0).toFixed(2)}`}
              />
              <StatCard
                label="Approved (month)"
                value={`$${data.staffTotals.reduce((s, r) => s + r.paid, 0).toFixed(2)}`}
              />
            </div>

            <section className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">By staff</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Staff</th>
                    <th className="pb-2">Org</th>
                    <th className="pb-2 text-right">Actions</th>
                    <th className="pb-2 text-right">Approved</th>
                    <th className="pb-2 text-right">Pending</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.staffTotals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-gray-500">
                        No actions this month yet.
                      </td>
                    </tr>
                  ) : (
                    data.staffTotals.map((r) => (
                      <tr key={`${r.staff}-${r.org}`} className="border-t border-gray-100">
                        <td className="py-2">{r.staff}</td>
                        <td className="py-2">{r.org}</td>
                        <td className="py-2 text-right">{r.actions}</td>
                        <td className="py-2 text-right">${r.paid.toFixed(2)}</td>
                        <td className="py-2 text-right">${r.pending.toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">${r.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">By action type</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="pb-2">Action</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.byAction).map(([name, val]) => (
                    <tr key={name} className="border-t border-gray-100">
                      <td className="py-2">{name}</td>
                      <td className="py-2 text-right">{val.count}</td>
                      <td className="py-2 text-right">${val.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
