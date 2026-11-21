import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function SideCard({
  tone,
  label,
  value,
  highlight,
}: {
  tone: "player" | "banker";
  label: string;
  value: number | null;
  highlight: boolean;
}) {
  const isPlayer = tone === "player";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-card/90 px-3 py-2.5 sm:px-3.5 sm:py-3",
        isPlayer ? "rounded-l-[1.15rem] rounded-r-xl" : "rounded-r-[1.15rem] rounded-l-xl",
        highlight
          ? isPlayer
            ? "border-player/55 ring-2 ring-player/35 shadow-[0_0_24px_-6px_var(--player)]"
            : "border-banker/55 ring-2 ring-banker/35 shadow-[0_0_24px_-6px_var(--banker)]"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "relative z-10 text-[9px] font-semibold uppercase tracking-[0.16em] sm:text-[10px]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {label}
      </span>

      <div className={cn("relative z-10 mt-1.5", isPlayer ? "text-left" : "text-right")}>
        <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>
    </div>
  );
}

export function LiquidBoard({
  dist,
  winner,
}: {
  dist: { player: number; banker: number; tie: number; sampleSize: number } | null;
  winner?: "player" | "banker" | null;
}) {
  return (
    <div className="relative h-24 sm:h-28 lg:h-32">
      <div className="absolute inset-y-0 left-0 w-[47%]">
        <SideCard
          tone="player"
          label="Player"
          value={dist?.player ?? null}
          highlight={winner === "player"}
        />
      </div>

      <div className="absolute inset-y-0 right-0 w-[47%]">
        <SideCard
          tone="banker"
          label="Banker"
          value={dist?.banker ?? null}
          highlight={winner === "banker"}
        />
      </div>

      {/* Center Tie card */}
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden rounded-xl border bg-card/95 shadow-sm sm:h-20 sm:w-20",
          winner ? "border-border/60 opacity-80" : "border-border",
          dist && !winner && "ring-1 ring-tie/20",
        )}
      >
        <span className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.16em] text-tie-glow sm:text-[9px]">
          Tie
        </span>
        <span className="relative z-10 mt-0.5 font-display text-lg font-extrabold tabular-nums sm:text-xl">
          {dist ? `${dist.tie}%` : "--"}
        </span>
      </div>
    </div>
  );
}
