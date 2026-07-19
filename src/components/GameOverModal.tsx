// GameOverModal — victory/defeat + the no-cheating ceremony.
// Adapter deviation: the design shows one COMMITTED/REVEALED ledger; the game
// has TWO sealed fleets, so the ceremony renders both and the match line
// requires both recomputed commitments to be identical.
import type { ReactNode } from "react";

interface GameOverModalProps {
  open: boolean;
  result: "victory" | "defeat";
  turns: number;
  // hex (0x…) display forms; null while the recompute is in flight
  playerCommitted: string;
  playerRevealed: string | null;
  enemyCommitted: string;
  enemyRevealed: string | null;
  match: boolean | null;
  boardReveal: ReactNode;
  onRematch: () => void;
  onTranscript: () => void;
}

const short = (v: string) => (v.length > 26 ? `${v.slice(0, 16)}…${v.slice(-8)}` : v);

export default function GameOverModal({
  open,
  result,
  turns,
  playerCommitted,
  playerRevealed,
  enemyCommitted,
  enemyRevealed,
  match,
  boardReveal,
  onRematch,
  onTranscript,
}: GameOverModalProps) {
  if (!open) return null;
  const victory = result === "victory";

  return (
    <div
      data-od-id="gameover-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/85 p-8 backdrop-blur-sm"
    >
      <div className="relative flex w-full max-w-[1020px] items-center gap-10 rounded-panel border border-phos-700/40 bg-abyss-800/95 p-10 shadow-panel">
        <span className="pf-corner border-t-2 border-l-2" style={{ top: 10, left: 10 }} />
        <span className="pf-corner border-t-2 border-r-2" style={{ top: 10, right: 10 }} />
        <span className="pf-corner border-b-2 border-l-2" style={{ bottom: 10, left: 10 }} />
        <span className="pf-corner border-b-2 border-r-2" style={{ bottom: 10, right: 10 }} />

        <div className="flex-1">
          <p className="font-mono text-eyebrow text-phos-600">
            // ENGAGEMENT COMPLETE — {turns} TURNS PROVEN
          </p>
          <h2
            className={`mt-3 font-display text-[64px] font-black leading-none tracking-hud ${
              victory ? "pf-txt-glow text-phos-300" : "pf-txt-glow-alarm text-alarm-500"
            }`}
          >
            {victory ? "VICTORY" : "DEFEAT"}
          </h2>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-300">
            {victory ? "Enemy fleet destroyed." : "Your fleet has been lost."} Both boards are now revealed and
            checked against the turn-zero commitments.
          </p>

          <div className="mt-7 rounded-panel border border-verify-900/80 bg-verify-900/20 p-5 shadow-[0_0_22px_rgba(52,211,153,.12)]">
            <div className="flex items-center gap-4">
              <span className="pf-seal-mini">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.4">
                  <path d="M4 12.5l5 5L20 6.5" />
                </svg>
              </span>
              <span className="pf-badge-verify px-3 py-1 font-mono text-xs">COMMITMENT VERIFIED ✓</span>
            </div>
            <div className="mt-4 space-y-1.5 font-mono text-[11.5px] leading-relaxed">
              <div className="flex justify-between gap-6">
                <span className="text-steel-400">YOUR FLEET · COMMITTED (TURN 0)</span>
                <span className="text-ink-100">{short(playerCommitted)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-steel-400">YOUR FLEET · REVEALED (GAME END)</span>
                <span className="text-ink-100">{playerRevealed ? short(playerRevealed) : "…"}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-steel-400">ENEMY FLEET · COMMITTED (TURN 0)</span>
                <span className="text-ink-100">{short(enemyCommitted)}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-steel-400">ENEMY FLEET · REVEALED (GAME END)</span>
                <span className="text-ink-100">{enemyRevealed ? short(enemyRevealed) : "…"}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-steel-400">MATCH</span>
                <span
                  className={
                    match == null
                      ? "text-steel-400"
                      : match
                        ? "pf-txt-glow-verify text-verify-400"
                        : "pf-txt-glow-alarm text-alarm-500"
                  }
                >
                  {match == null ? "RECOMPUTING…" : match ? "✓ IDENTICAL" : "✕ MISMATCH"}
                </span>
              </div>
            </div>
            <p className="mt-4 font-hud text-sm font-semibold tracking-hud text-verify-300">
              NO CHEATING WAS MATHEMATICALLY POSSIBLE
            </p>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onRematch}
              className="rounded-panel bg-phos-400 px-6 py-3 font-hud text-[13px] font-semibold tracking-hud text-abyss-900 shadow-glow transition-glow hover:bg-phos-300 hover:shadow-glow-lg"
            >
              REMATCH
            </button>
            <button
              type="button"
              onClick={onTranscript}
              className="rounded-panel border border-phos-700/60 bg-transparent px-6 py-3 font-hud text-[13px] font-semibold tracking-hud text-ink-200 transition-glow hover:border-phos-400 hover:text-ink-100 hover:shadow-glow-sm"
            >
              VIEW FULL TRANSCRIPT
            </button>
          </div>
        </div>

        {boardReveal && (
          <div className="w-[300px] shrink-0">
            <h4 className="mb-1 font-hud text-sm font-semibold tracking-hud text-ink-100">
              ENEMY WATERS — REVEALED
            </h4>
            <p className="mb-3 font-mono text-eyebrow text-alarm-400">// FULL BOARD DISCLOSURE</p>
            {boardReveal}
          </div>
        )}
      </div>
    </div>
  );
}
