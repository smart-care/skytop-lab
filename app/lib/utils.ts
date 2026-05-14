import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStrOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function monthRange(monthStr: string): { start: string; end: string } | null {
  const parts = monthStr.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  if (!y || !m) return null;
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDay)}` };
}

export function diffDays(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;
  const a = new Date(startDate).getTime();
  const b = new Date(endDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
