/**
 * Shared robot timeline driven by the real Bac Bo Live table.
 * Signals reveal after a short analysis window (not forced immediate).
 */
import { analyze, type Analysis, type Round, type Side, type Signal } from "./bacbo-engine";
import type { LiveRound } from "./live-table";

/** Typical time between two results at the Bac Bo Live table (measured ~33-38s). */
export const ROUND_MS = 35_000;
/** How long to wait after a round settles before revealing the signal (natural analysis window). */
export const ANALYSIS_MS = 6_000;
/** Estimated moment, after a round settles, when bets for the next round close. */
export const BET_CLOSE_MS = 24_000;
/** A round reaching us later than this after settling leaves too little time to bet: no signal. */
export const LATE_MS = 17_000;
/** No new round for this long: the table is treated as quiet and the robot waits. */
export const STALE_MS = 120_000;
const HISTORY = 60;
/** Past real rounds the robot needs before it reads a pattern. */
export const MIN_HISTORY = 5;

export function liveWindow(rounds: LiveRound[], now: number): LiveRound[] {
  const last = rounds[rounds.length - 1];
  if (!last || now - last.settledAt > STALE_MS) return [];
  let start = rounds.length - 1;
  while (start > 0 && rounds[start]!.settledAt - rounds[start - 1]!.settledAt <= STALE_MS) start--;
  return start === 0 ? rounds : rounds.slice(start);
}

/** When the signal after this round shows: after the analysis window. */
export const revealTime = (r: LiveRound) => r.settledAt + ANALYSIS_MS;
export const arrivedLate = (r: LiveRound) =>
  r.receivedAt !== undefined && r.receivedAt - r.settledAt > LATE_MS;

export const AUTO_CONFIDENCE = 60;

export interface ScheduleConfig {
  startedAt: number;
  minConfidence: number;
}

export type RobotPhase = "off" | "analyzing" | "signal" | "paused";
export type WaitReason =
  | "no_connection"
  | "collecting"
  | "next_round"
  | "no_pattern"
  | "weak_pattern"
  | "conflict"
  | "cold_table"
  | "result"
  | "paused"
  | null;

export interface RobotView {
  phase: RobotPhase;
  key: string;
  phaseStart: number;
  phaseEnd: number;
  wakeAt: number;
  waiting: boolean;
  reason: WaitReason;
  signal: Signal | null;
  history: Round[];
  lastRound: LiveRound | null;
}

const analysisCache = new Map<string, Analysis | null>();

/** The robot's full reading after round `index` (signal, or why it held back). Cached per round. */
export function analysisAfter(
  rounds: LiveRound[],
  index: number,
  minConfidence: number,
): Analysis | null {
  const round = rounds[index];
  if (!round || index + 1 < MIN_HISTORY) return null;
  const key = `${round.id}:${minConfidence}`;
  if (analysisCache.has(key)) return analysisCache.get(key)!;
  const history = rounds.slice(Math.max(0, index + 1 - HISTORY), index + 1);
  const result = analyze(history, minConfidence);
  if (analysisCache.size > 500) analysisCache.clear();
  analysisCache.set(key, result);
  return result;
}

export function signalAfter(
  rounds: LiveRound[],
  index: number,
  minConfidence: number,
): Signal | null {
  return analysisAfter(rounds, index, minConfidence)?.signal ?? null;
}

export function robotView(
  cfg: ScheduleConfig | null,
  rounds: LiveRound[],
  now: number,
): RobotView {
  const lastRound = rounds[rounds.length - 1] ?? null;
  const base = { history: rounds as Round[], lastRound, signal: null };
  if (!cfg) {
    return {
      ...base,
      phase: "off",
      key: "off",
      phaseStart: now,
      phaseEnd: Infinity,
      wakeAt: Infinity,
      waiting: false,
      reason: null,
    };
  }

  const waitFor = (from: number, key: string, reason: WaitReason): RobotView => ({
    ...base,
    phase: "analyzing",
    key,
    phaseStart: from,
    phaseEnd: Math.max(from + 1_000, from + ROUND_MS),
    wakeAt: Infinity,
    waiting: true,
    reason,
  });

  if (!lastRound || now - lastRound.settledAt > STALE_MS) {
    return waitFor(Math.max(cfg.startedAt, lastRound?.settledAt ?? 0), "no_connection", "no_connection");
  }
  if (lastRound.settledAt < cfg.startedAt) {
    const reason = rounds.length < MIN_HISTORY ? "collecting" : "next_round";
    return waitFor(lastRound.settledAt, `wait:${cfg.startedAt}`, reason);
  }

  const i = rounds.length - 1;
  const settled = lastRound.settledAt;
  const late = arrivedLate(lastRound);
  const analysis = late ? null : analysisAfter(rounds, i, cfg.minConfidence);
  const signal = analysis?.signal ?? null;
  const revealAt = revealTime(lastRound);
  const closeAt = settled + BET_CLOSE_MS;
  const history = rounds.slice(Math.max(0, i + 1 - HISTORY));
  const common = { history, lastRound, key: lastRound.id };

  if (signal && now >= revealAt) {
    if (now >= closeAt) {
      return {
        ...common,
        phase: "analyzing",
        phaseStart: closeAt,
        phaseEnd: settled + ROUND_MS,
        wakeAt: Infinity,
        waiting: true,
        reason: "result",
        signal,
      };
    }
    return {
      ...common,
      phase: "signal",
      phaseStart: revealAt,
      phaseEnd: Math.max(revealAt + 1_000, closeAt),
      wakeAt: closeAt,
      waiting: false,
      reason: null,
      signal,
    };
  }
  if (signal) {
    return {
      ...common,
      phase: "analyzing",
      phaseStart: settled,
      phaseEnd: revealAt,
      wakeAt: revealAt,
      waiting: false,
      reason: null,
      signal: null,
    };
  }
  return {
    ...common,
    phase: "analyzing",
    phaseStart: settled,
    phaseEnd: settled + ROUND_MS,
    wakeAt: settled + STALE_MS,
    waiting: true,
    reason:
      rounds.length < MIN_HISTORY
        ? "collecting"
        : late
          ? "next_round"
          : (analysis?.reason ?? "no_pattern"),
    signal: null,
  };
}

export interface SessionSignal {
  key: string;
  side: Side;
  at: number;
}

export function signalsBetween(
  cfg: ScheduleConfig,
  rounds: LiveRound[],
  from: number,
  to: number,
  limit = 20,
): SessionSignal[] {
  const out: SessionSignal[] = [];
  for (let i = rounds.length - 1; i >= 0 && out.length < limit; i--) {
    const r = rounds[i]!;
    if (r.settledAt < cfg.startedAt) break;
    const at = revealTime(r);
    if (at > to) continue;
    if (r.settledAt + ANALYSIS_MS < from) break;
    if (at < from || arrivedLate(r)) continue;
    const signal = signalAfter(rounds, i, cfg.minConfidence);
    if (signal) out.push({ key: r.id, side: signal.side, at });
  }
  return out;
}

export function mergeSignals(
  existing: SessionSignal[],
  incoming: SessionSignal[],
  limit = 20,
): SessionSignal[] {
  const map = new Map<string, SessionSignal>();
  for (const s of [...existing, ...incoming]) map.set(s.key, s);
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}
