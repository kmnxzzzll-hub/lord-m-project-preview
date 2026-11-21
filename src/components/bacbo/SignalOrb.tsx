import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Decorative low water layer used on standby/analyzing panels (no raise). */
export function WaterWave({
  side,
}: {
  side?: Side;
  raised?: boolean;
}) {
  const fill = side === "player"
    ? "fill-player/12"
    : side === "banker"
      ? "fill-banker/12"
      : "fill-muted-foreground/10";
  const gradient = side === "player"
    ? "from-player/10"
    : side === "banker"
      ? "from-banker/10"
      : "from-muted-foreground/8";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[14%] overflow-hidden opacity-40"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-t to-transparent", gradient)} />
      <div className={cn("absolute inset-x-0 bottom-0 h-full", fill)} />
    </div>
  );
}

export function SignalOrb({
  side,
  signal: _signal,
  phaseStart,
  phaseEnd,
}: {
  side: Side;
  signal?: Signal | null;
  phaseStart: number;
  phaseEnd: number;
}) {
  const now = useNow(1000);
  const isPlayer = side === "player";
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card px-4 py-4 sm:px-5 sm:py-5",
        isPlayer ? "border-player/40" : "border-banker/40",
      )}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14",
            isPlayer ? "bg-player/12" : "bg-banker/12",
          )}
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full sm:h-9 sm:w-9",
              isPlayer ? "ball-player" : "ball-banker",
            )}
          />
        </div>

        <h2
          className={cn(
            "mt-2.5 font-display text-xl font-extrabold tracking-[0.12em] sm:text-2xl",
            isPlayer ? "text-player-glow" : "text-banker-glow",
          )}
        >
          {isPlayer ? "PLAYER" : "BANKER"}
        </h2>

        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
        </p>

        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-28">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              isPlayer ? "bg-player-glow" : "bg-banker-glow",
            )}
            style={{ width: `${left * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
