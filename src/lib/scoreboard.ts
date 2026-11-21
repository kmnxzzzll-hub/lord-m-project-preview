import type { Side } from "./bacbo-engine";
import type { LiveRound } from "./live-table";
import type { SessionSignal } from "./robot-schedule";

export interface SignalResult {
  key: string;
  side: Side;
  /** Outcome of the round that came right after the signal. A tie counts as green (tie protection). */
  green: boolean;
  tie: boolean;
  at: number;
}

/** Real results: each signal (keyed by the round it was read after) is judged by the next real round. */
export function scoreSignals(signals: SessionSignal[], rounds: LiveRound[]): SignalResult[] {
  const index = new Map(rounds.map((r, i) => [r.id, i]));
  const out: SignalResult[] = [];
  for (const s of signals) {
    const i = index.get(s.key);
    if (i === undefined) continue;
    const next = rounds[i + 1];
    if (!next) continue;
    const tie = next.outcome === "T";
    const won = next.outcome === (s.side === "player" ? "P" : "B");
    out.push({ key: s.key, side: s.side, green: won || tie, tie, at: s.at });
  }
  return out.sort((a, b) => a.at - b.at);
}

export function summarize(results: SignalResult[]) {
  let greens = 0, best = 0, run = 0;
  for (const r of results) {
    if (r.green) { greens++; run++; best = Math.max(best, run); } else run = 0;
  }
  const total = results.length;
  return { greens, reds: total - greens, total, best, rate: total ? Math.round((greens / total) * 100) : 0 };
}
