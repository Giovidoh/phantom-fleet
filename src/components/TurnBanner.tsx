import type { ReactNode } from "react";

// TurnBanner — whose turn, readable from 2 meters at 1080p.
// player → phosphor, "YOUR TURN — FIRE AT WILL"
// enemy  → steel, pulsing ticks, "ENEMY TURN — STAND BY"
// (alarm red stays reserved for hits — never used for turns)
// Adapter additions: optional label/sub override (game-over strip) and an
// action slot (e.g. re-open the ceremony after viewing the transcript).
interface TurnBannerProps {
  turn: "player" | "enemy";
  turnNumber?: number;
  label?: string;
  sub?: string;
  action?: ReactNode;
}

export default function TurnBanner({ turn, turnNumber, label, sub, action }: TurnBannerProps) {
  const player = turn === "player";
  return (
    <div data-od-id="turn-banner" className="relative z-10 border-b border-phos-900/30 bg-abyss-800/40">
      <div className="mx-auto flex max-w-[1720px] items-center gap-6 px-6 py-4">
        <span className="pf-banner-line" />
        <span className={`pf-banner-tick ${player && !label ? "" : "animate-tick-pulse"}`} />
        <h2 className="font-display text-banner font-bold leading-none">
          <span className={player && !label ? "pf-txt-glow text-phos-300" : "text-steel-300"}>
            {label ?? (player ? "YOUR TURN" : "ENEMY TURN")}
          </span>
          <span className="ml-4 align-middle font-hud text-2xl font-semibold tracking-hud text-ink-300">
            {sub ?? (player ? "— FIRE AT WILL" : "— STAND BY")}
          </span>
          {turnNumber != null && (
            <span className="ml-4 align-middle font-mono text-sm tracking-hud text-steel-400">
              TURN {String(turnNumber).padStart(3, "0")}
            </span>
          )}
        </h2>
        <span className={`pf-banner-tick ${player && !label ? "" : "animate-tick-pulse"}`} />
        <span className="pf-banner-line" />
        {action}
      </div>
    </div>
  );
}
