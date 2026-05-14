import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import {
  ACTION_TYPES,
  type ActionTypeName,
  type Org,
  calculateCommission,
} from "~/config/incentive-rules";
import { useSession } from "~/lib/auth-client";
import { diffDays, todayStr } from "~/lib/utils";
import { rpc } from "~/server/client";

export const Route = createFileRoute("/_authed/submit")({ component: SubmitPage });

function SubmitPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sessionUser = session?.user as
    | { role?: string; org?: Org | null; name?: string }
    | undefined;
  const isStaff = sessionUser?.role === "staff";
  const staffOrg = sessionUser?.org ?? null;

  const [form, setForm] = useState({
    dateLogged: todayStr(),
    org: (staffOrg ?? "EHS") as Org,
    staff: isStaff ? (sessionUser?.name ?? "") : "",
    mrn: "",
    actionType: "Lead, Registered, Qualified" as ActionTypeName,
    location: "",
    outreach: "",
    scheduledOn: "",
    apptDate: "",
    reportSent: "",
    proofLink: "",
  });

  const submit = useMutation({
    mutationFn: rpc.actions.submit.mutationOptions().mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rpc.dashboard.get.key() });
      qc.invalidateQueries({ queryKey: rpc.actions.list.key() });
      navigate({ to: "/activity" });
    },
  });

  const preview = useMemo(() => {
    const days =
      form.actionType === "Courtesy Report"
        ? diffDays(form.apptDate || null, form.reportSent || null)
        : diffDays(form.outreach || null, form.apptDate || null);
    const { commission, pct } = calculateCommission(form.org, form.actionType, days);
    return { days, pct, commission };
  }, [form]);

  const isCourtesy = form.actionType === "Courtesy Report";

  return (
    <div>
      <PageHeader title="Submit Action" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({
            ...form,
            proofLink: form.proofLink || undefined,
            // staff submissions don't send org/staff; server pins them.
            ...(isStaff ? { org: undefined, staff: undefined } : {}),
          } as never);
        }}
        className="space-y-6 p-6"
      >
        <div className="card grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Date logged">
            <input
              type="date"
              className="input"
              value={form.dateLogged}
              onChange={(e) => setForm({ ...form, dateLogged: e.target.value })}
            />
          </Field>
          {!isStaff && (
            <Field label="Org">
              <select
                className="input"
                value={form.org}
                onChange={(e) => setForm({ ...form, org: e.target.value as Org })}
              >
                <option value="EHS">EHS</option>
                <option value="THC">THC</option>
              </select>
            </Field>
          )}
          {!isStaff && (
            <Field label="Staff name">
              <input
                className="input"
                value={form.staff}
                onChange={(e) => setForm({ ...form, staff: e.target.value })}
                required
              />
            </Field>
          )}
          <Field label="Action type">
            <select
              className="input"
              value={form.actionType}
              onChange={(e) => setForm({ ...form, actionType: e.target.value as ActionTypeName })}
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="MRN (optional)">
            <input
              className="input"
              value={form.mrn}
              onChange={(e) => setForm({ ...form, mrn: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          {!isCourtesy && (
            <>
              <Field label="Outreach date">
                <input
                  type="date"
                  className="input"
                  value={form.outreach}
                  onChange={(e) => setForm({ ...form, outreach: e.target.value })}
                />
              </Field>
              <Field label="Scheduled on">
                <input
                  type="date"
                  className="input"
                  value={form.scheduledOn}
                  onChange={(e) => setForm({ ...form, scheduledOn: e.target.value })}
                />
              </Field>
              <Field label="Appointment date">
                <input
                  type="date"
                  className="input"
                  value={form.apptDate}
                  onChange={(e) => setForm({ ...form, apptDate: e.target.value })}
                />
              </Field>
            </>
          )}
          {isCourtesy && (
            <>
              <Field label="Appointment date">
                <input
                  type="date"
                  className="input"
                  value={form.apptDate}
                  onChange={(e) => setForm({ ...form, apptDate: e.target.value })}
                />
              </Field>
              <Field label="Report sent">
                <input
                  type="date"
                  className="input"
                  value={form.reportSent}
                  onChange={(e) => setForm({ ...form, reportSent: e.target.value })}
                />
              </Field>
            </>
          )}
          <Field label="Proof link (optional)">
            <input
              type="url"
              className="input"
              value={form.proofLink}
              onChange={(e) => setForm({ ...form, proofLink: e.target.value })}
            />
          </Field>
        </div>

        <div className="card bg-brand-50">
          <div className="text-xs uppercase tracking-wide text-brand-700">Commission preview</div>
          <div className="mt-1 flex items-baseline gap-4">
            <div className="text-2xl font-semibold text-brand-900">
              ${preview.commission.toFixed(2)}
            </div>
            <div className="text-sm text-brand-700">
              {preview.days} days · {(preview.pct * 100).toFixed(0)}% of base
            </div>
          </div>
          <div className="mt-2 text-xs text-brand-700">
            Accelerator (monthly threshold) is checked on submit.
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit action"}
        </button>
        {submit.error ? (
          <p className="text-sm text-alert-500">{(submit.error as Error).message}</p>
        ) : null}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // The control is rendered as `children`, so the visible label wraps it — semantically valid.
  return (
    <div className="block text-sm">
      <div className="mb-1 block font-medium text-gray-700">{label}</div>
      {children}
    </div>
  );
}
