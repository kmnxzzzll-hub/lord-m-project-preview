import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Power, WifiOff, Wrench } from "lucide-react";
import { Logo } from "@/components/bacbo/Logo";
import { LiquidBoard } from "@/components/bacbo/LiquidBoard";
import { RobotIcon } from "@/components/bacbo/RobotIcon";
import { LiveTableCard } from "@/components/bacbo/LiveTable";
import { SignalOrb, WaterWave } from "@/components/bacbo/SignalOrb";
import { Scoreboard, ResultBanner } from "@/components/bacbo/Scoreboard";
import { summarizeRoundFrequencies } from "@/lib/round-statistics";
import { useRobot } from "@/lib/robot-context";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/robos")({
  head: () => ({
    meta: [
      { title: "Robôs — Bac Bo Live" },
      {
        name: "description",
        content:
          "Acompanhe o robô Bac Bo Live, que lê as rodadas reais da mesa e mostra o sinal de Player ou Banker.",
      },
      { property: "og:title", content: "Robôs — Bac Bo Live" },
      { property: "og:description", content: "Sinais de Player ou Banker em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RobotsPage,
});

function Clock() {
  const now = useNow(1000);
  return (
    <span className="font-display tabular-nums">{new Date(now).toLocaleTimeString("pt-BR")}</span>
  );
}

function RobotsPage() {
  const robot = useRobot();
  const { phase, isAdmin } = robot;
  const on = phase !== "off";

  const dist = robot.history.length ? summarizeRoundFrequencies(robot.history, 20) : null;

  return (
    <div className="space-y-3 sm:space-y-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-3.5 lg:space-y-0">
      <ResultBanner />
      <div className="space-y-3 sm:space-y-3.5">
        <header className="pt-0.5">
          <Logo />
          <div className="mt-1.5 flex items-center justify-center gap-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  on ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {on ? "Online" : "Standby"}
            </span>
            <Clock />
          </div>
        </header>

        <Scoreboard />

        {isAdmin && (
          <motion.button
            onClick={robot.toggle}
            whileTap={{ scale: 0.97 }}
            disabled={robot.toggling}
            className={cn(
              "relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-full font-display text-sm font-bold tracking-wide transition-colors disabled:opacity-60 sm:h-11",
              robot.running
                ? "border border-border bg-secondary text-foreground"
                : "bg-gradient-to-r from-success/90 to-success text-background",
            )}
          >
            <Power className="relative h-3.5 w-3.5" />
            <span className="relative">{robot.running ? "Desligar Robô" : "Ligar Robô"}</span>
          </motion.button>
        )}

        <LiquidBoard
          dist={dist}
          winner={phase === "signal" ? (robot.signal?.side ?? null) : null}
        />

        <LiveTableCard rounds={robot.rounds} />
      </div>

      <div>
        <AnimatePresence mode="wait">
          {robot.maintenance ? (
            <Panel key="maint">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-tie/30 bg-tie/10 text-tie">
                <Wrench className="h-3.5 w-3.5" />
              </div>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Modo manutenção
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">ROBÔ PAUSADO</h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                O administrador está calibrando o sistema. Volte em instantes.
              </p>
            </Panel>
          ) : phase === "off" ? (
            <Panel key="off">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/60 text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
              </div>
              <h2 className="mt-2 font-display text-base font-extrabold sm:text-lg">STANDBY</h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                {isAdmin
                  ? "Toque em Ligar Robô para iniciar os sinais para todos."
                  : "Aguarde o administrador iniciar o robô."}
              </p>
            </Panel>
          ) : robot.reason === "no_connection" ? (
            <Panel key="offline">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
                <WifiOff className="h-3.5 w-3.5" />
              </div>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Robô ligado
              </span>
              <h2 className="mt-0.5 font-display text-base font-extrabold sm:text-lg">
                SEM CONEXÃO COM A MESA
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                A mesa ao vivo não está enviando rodadas, então nenhum sinal será enviado. Não
                recomendamos operar agora.
              </p>
            </Panel>
          ) : phase === "analyzing" ? (
            <Analyzing key={`analyzing-${robot.key}`} />
          ) : (
            robot.signal && (
              <SignalOrb
                key={`signal-${robot.key}`}
                side={robot.signal.side}
                signal={robot.signal}
                phaseStart={robot.phaseStart}
                phaseEnd={robot.phaseEnd}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <p className="px-3 text-center lg:col-span-2 text-[10px] leading-relaxed text-muted-foreground/70">
        As rodadas analisadas vêm da mesa Bac Bo Live ao vivo. Os sinais são leituras de padrões e
        não garantem ganhos. Jogue com responsabilidade · +18.
      </p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="relative isolate flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 text-center sm:px-5 sm:py-5"
    >
      <WaterWave />
      <div className="relative z-10 flex w-full flex-col items-center">{children}</div>
    </motion.div>
  );
}

function Analyzing() {
  const { phaseStart, phaseEnd, reason, waiting } = useRobot();
  const now = useNow(250);
  const total = Math.max(1, phaseEnd - phaseStart);
  const elapsed = Math.min(total, Math.max(0, now - phaseStart));

  return (
    <Panel>
      <RobotIcon size={32} className="sm:size-9" />
      <h2 className="mt-2 font-display text-xs font-extrabold tracking-[0.1em] sm:text-sm">
        <span className="text-success">SISTEMA ONLINE</span>{" "}
        <span className="text-foreground">
          {reason === "result" ? "AGUARDANDO" : "ANALISANDO"}
        </span>
      </h2>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {waiting ? (
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-success to-transparent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-success/60 to-success transition-[width] duration-150 ease-linear"
            style={{ width: `${(elapsed / total) * 100}%` }}
          />
        )}
      </div>
    </Panel>
  );
}
