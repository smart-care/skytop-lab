import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "~/lib/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn.magicLink({ email, callbackURL: "/dashboard" });
    setSubmitting(false);
    if (err) setError(err.message ?? "Couldn't send the link. Try again.");
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-brand-600">Skytop Lab</div>
          <div className="mt-1 text-sm text-gray-500">Front Office Incentive</div>
        </div>
        {sent ? (
          <div className="card text-center">
            <p className="text-sm text-gray-700">
              We sent a sign-in link to <strong>{email}</strong>. Check your email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@skytop.example"
              />
            </label>
            {error ? <p className="text-sm text-alert-500">{error}</p> : null}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
