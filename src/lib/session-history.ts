import type { SessionSignal } from "./robot-schedule";

const PREFIX = "bacbo:history:";

interface Stored {
  session: number;
  items: SessionSignal[];
}

/** Signals seen in the current login session. A new sign-in (different session start) starts empty. */
export function loadHistory(userId: string, session: number): SessionSignal[] {
  try {
    const raw = localStorage.getItem(PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored;
    return parsed.session === session && Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveHistory(userId: string, session: number, items: SessionSignal[]) {
  try {
    localStorage.setItem(PREFIX + userId, JSON.stringify({ session, items } satisfies Stored));
  } catch {
    /* storage full or unavailable */
  }
}

export function clearAllHistory() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
