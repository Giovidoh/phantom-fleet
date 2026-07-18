import { useEffect, useRef } from "react";
import type { LogEntry } from "../game/types";

// The star of the demo: every shot, its hit/miss answer, and the fact that a
// real Groth16 proof was generated and verified for it — with timings.
export default function ProofLog({ entries }: { entries: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-cyan-900/40 bg-[#0b1526]/80 p-3">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-cyan-200">
        ZK Proof Log <span className="ml-1 text-[10px] font-normal text-slate-400">every answer is proven, not claimed</span>
      </h2>
      <div ref={ref} className="log-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 font-mono text-[11px]">
        {entries.length === 0 && (
          <div className="text-slate-500">No shots yet. Fire at the enemy waters to generate the first proof…</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="rounded border border-slate-800/80 bg-[#081120] px-2 py-1.5">
            {e.who === "system" ? (
              <div className="text-slate-400 italic">{e.text}</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-slate-500">#{e.n}</span>
                  <span>{e.who === "fire" ? "🎯" : "🛡️"}</span>
                  <span className="text-slate-200">{e.text}</span>
                  {e.result && (
                    <span
                      className={`rounded px-1.5 py-px text-[10px] font-bold ${
                        e.result === "hit" ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {e.result.toUpperCase()}
                    </span>
                  )}
                </div>
                {e.verified && (
                  <div className="mt-0.5 text-[10px] text-emerald-300">
                    ZK proof verified ✓
                    <span className="text-slate-500">
                      {"  ·  prove "}
                      {e.proveMs} ms · verify {e.verifyMs} ms
                    </span>
                  </div>
                )}
                {e.verified === false && <div className="mt-0.5 text-[10px] text-red-400">proof failed ✗</div>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
