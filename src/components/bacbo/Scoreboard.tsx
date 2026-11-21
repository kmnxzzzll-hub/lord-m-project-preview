import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, PartyPopper } from "lucide-react";
import { useRobot } from "@/lib/robot-context";
import { scoreSignals, summarize, type SignalResult } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

export function useSessionResults() {
  const { sessionSignals, rounds } = useRobot();
  return useMemo(() => scoreSignals(sessionSignals, rounds), [sessionSignals, rounds]);
}

export function Scoreboard() {
  const results = useSessionResults();
  const s = summarize(results);
  const items = [
    { label: "Greens", value: s.greens, tone: "text-success" },
    { label: "Reds", value: s.reds, tone: "text-destructive" },
    { label: "Acerto", value: s.total ? `${s.rate}%` : "—", tone: "text-foreground" },
    { label: "Sequência", value: s.best, tone: "text-tie" },
  ];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-4 rounded-2xl border border-border bg-card px-2 py-3 sm:py-3.5">
        {items.map((i) => (
          <div key={i.label} className="flex flex-col items-center gap-0.5">
            <span className={cn("font-display text-lg font-extrabold tabular-nums sm:text-xl", i.tone)}>
              {i.value}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {i.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const RESULT_BANNER_MS = 2_600;
const RESULT_FRESH_MS = 75_000;

export function ResultBanner() {
  const results = useSessionResults();
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<SignalResult | null>(null);
  const [streakBanner, setStreakBanner] = useState<"greens" | null>(null);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(results.map((r) => r.key));
      return;
    }
    const fresh = results.filter((r) => !seen.current!.has(r.key));
    fresh.forEach((r) => seen.current!.add(r.key));
    const latest = fresh.filter((r) => Date.now() - r.at < RESULT_FRESH_MS).at(-1);
    if (latest) setShow(latest);

    if (results.slice(-5).length === 5 && results.slice(-5).every((r) => r.green)) {
      setStreakBanner("greens");
    }
  }, [results]);

  const showKey = show?.key;
  useEffect(() => {
    if (!showKey) return;
    const t = setTimeout(() => setShow(null), RESULT_BANNER_MS);
    return () => clearTimeout(t);
  }, [showKey]);

  useEffect(() => {
    if (!streakBanner) return;
    const t = setTimeout(() => setStreakBanner(null), 5000);
    return () => clearTimeout(t);
  }, [streakBanner]);

  const blue = show?.side === "player";
  const sideName = blue ? "Azul (Player)" : "Vermelho (Banker)";

  return (
    <>
      <AnimatePresence>
        {show && (
          <div
            className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <motion.div
              key={show.key}
              role="status"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl"
              style={{ width: "min(360px, 92vw)" }}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-background",
                  !show.green
                    ? "bg-destructive"
                    : show.tie
                      ? "bg-tie"
                      : blue
                        ? "bg-player"
                        : "bg-banker",
                )}
              >
                {show.green ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : (
                  <X className="h-5 w-5" strokeWidth={3} />
                )}
              </span>
              <div className="min-w-0 leading-tight">
                <p
                  className={cn(
                    "font-display text-sm font-extrabold",
                    show.green ? "text-success" : "text-destructive",
                  )}
                >
                  {show.green ? (show.tie ? "GREEN (Empate)" : "GREEN") : "RED"}
                </p>
                <p className="truncate text-xs text-foreground/80">
                  {show.green ? `No ${sideName}` : `Entrada no ${sideName} não bateu`}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {streakBanner === "greens" && (
          <div
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-lg"
            >
              <PartyPopper className="h-5 w-5 text-success" />
              <span>Surra no branco, dinheiro no bolso</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
