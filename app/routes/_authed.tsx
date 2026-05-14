import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "~/components/AppShell";

// Client-side session check. Hits Better Auth's /api/auth/get-session endpoint,
// which Hono forwards to Better Auth. No session → bounce to /login.
async function fetchSession(): Promise<{ user: { id: string } | null }> {
  try {
    const res = await fetch("/api/auth/get-session", { credentials: "same-origin" });
    if (!res.ok) return { user: null };
    const data = (await res.json()) as { user?: { id: string } | null };
    return { user: data.user ?? null };
  } catch {
    return { user: null };
  }
}

export const Route = createFileRoute("/_authed")({
  beforeLoad: async () => {
    const session = await fetchSession();
    if (!session.user) throw redirect({ to: "/login" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
