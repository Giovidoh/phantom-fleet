import { useEffect, useState } from "react";
import type { Fleet } from "../game/fleet";
import { packBoard } from "../game/fleet";
import { commitmentOf } from "../zk/poseidon";

interface Props {
  winner: "player" | "bot";
  playerFleet: Fleet;
  botFleet: Fleet;
  playerSalt: string;
  botSalt: string;
  playerCommitment: string;
  botCommitment: string;
  onPlayAgain: () => void;
}

const short = (v: string) => `${v.slice(0, 14)}…${v.slice(-8)}`;

// Game over = full reveal. Both boards + salts are revealed in-browser and the
// Poseidon commitments are recomputed to prove nobody moved a single ship.
export default function GameOverModal(props: Props) {
  const [checks, setChecks] = useState<{ player: boolean | null; bot: boolean | null }>({
    player: null,
    bot: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await commitmentOf(packBoard(props.playerFleet.board), props.playerSalt);
      const b = await commitmentOf(packBoard(props.botFleet.board), props.botSalt);
      if (!cancelled) setChecks({ player: p === props.playerCommitment, bot: b === props.botCommitment });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const won = props.winner === "player";
  const allOk = checks.player === true && checks.bot === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-700/40 bg-[#0b1526] p-6 shadow-[0_0_60px_rgba(34,211,238,0.25)]">
        <h2 className={`text-2xl font-bold ${won ? "text-cyan-300" : "text-red-300"}`}>
          {won ? "🏆 Victory — enemy fleet destroyed" : "💀 Defeat — your fleet was sunk"}
        </h2>

        <div className="mt-4 space-y-2 font-mono text-[11px]">
          <CommitRow label="Your commitment" value={props.playerCommitment} ok={checks.player} />
          <CommitRow label="Enemy commitment" value={props.botCommitment} ok={checks.bot} />
        </div>

        <p className="mt-4 text-sm text-slate-300">
          {allOk ? (
            <>
              <span className="font-semibold text-emerald-300">Commitment verified.</span> Both fleets were fully
              revealed and their Poseidon commitments recomputed — they match the ones announced before the first
              shot. Neither fleet ever left its browser. No cheating was mathematically possible.
            </>
          ) : (
            <>Recomputing Poseidon commitments from the revealed boards…</>
          )}
        </p>

        <button
          type="button"
          onClick={props.onPlayAgain}
          className="mt-6 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
        >
          Play again
        </button>
      </div>
    </div>
  );
}

function CommitRow({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-slate-800 bg-[#081120] px-2 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-emerald-300">{short(value)}</span>
      <span>{ok === null ? "…" : ok ? "✓ match" : "✗ MISMATCH"}</span>
    </div>
  );
}
