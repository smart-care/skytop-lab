import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardListIcon,
  FilePlusIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { signOut, useSession } from "~/lib/auth-client";
import { cn } from "~/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboardIcon; adminOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { to: "/submit", label: "Submit Action", icon: FilePlusIcon },
  { to: "/activity", label: "My Activity", icon: ClipboardListIcon },
  { to: "/approvals", label: "Approvals", icon: ShieldCheckIcon, adminOnly: true },
  { to: "/all-records", label: "All Records", icon: ListChecksIcon, adminOnly: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = session?.user && "role" in session.user && session.user.role !== "staff";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="p-5">
          <div className="text-lg font-bold text-brand-600">Skytop Lab</div>
          <div className="text-xs text-gray-500">Front Office Incentive</div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          {session?.user ? (
            <div className="space-y-2">
              <div className="px-2 text-sm font-medium text-gray-900">{session.user.name}</div>
              <div className="px-2 text-xs text-gray-500">{session.user.email}</div>
              <button type="button" className="btn-secondary w-full" onClick={() => signOut()}>
                <LogOutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
