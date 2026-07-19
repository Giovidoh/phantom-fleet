// ProofLog — the ship's cryptographic combat console. The star of the demo.
// Adapter: entries are supplied newest-first by App; a pending entry shows the
// fast sonar sweep + scrambling hash while the prover works, and a scan bar
// sweeps the whole panel whenever any entry is pending.
import { useEffect, useState } from "react";

export interface ProofEntry {
  id: number;
  actor: "YOU" | "ENMY";
  coordinate: string;
  result: "hit" | "miss" | null;
  pending: boolean;
  hash?: string; // truncated proof fingerprint, 0x9f3c…a41b
  ms?: number; // proving time
  sunk?: string | null; // ship name when this shot sank it
  note?: string; // error/system line (rare path)
}

interface ProofLogProps {
  entries: ProofEntry[]; // newest first
  session: { commitment?: string; circuit?: string; turnsProven: number };
}

// Cryptography-working-in-real-time: hash chars scramble every 90 ms.
function ScrambleHash() {
  const [txt, setTxt] = useState("0x…………");
  useEffect(() => {
    const chars = "0123456789abcdef";
    const t = window.setInterval(() => {
      let s = "0x";
      for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * 16)];
      setTxt(`${s}…`);
    }, 90);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-mono text-[10.5px] text-phos-300">{txt}</span>;
}

export default function ProofLog({ entries, session }: ProofLogProps) {
  const proving = entries.some((e) => e.pending);

  return (
    <aside
      data-od-id="proof-log"
      className="flex min-h-0 min-w-[400px] flex-1 flex-col rounded-panel border border-phos-900/50 bg-abyss-800/70 shadow-panel backdrop-blur"
    >
      <header className="flex items-center justify-between border-b border-phos-900/50 px-4 py-3">
        <div>
          <h3 className="font-hud text-base font-semibold tracking-hud text-ink-100">ZK COMBAT CONSOLE</h3>
          <p className="font-mono text-eyebrow text-phos-600">// PROOF LOG — TURN-BY-TURN CRYPTOGRAPHY</p>
        </div>
        <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-hud text-alarm-400">
          <i className="h-1.5 w-1.5 rounded-full bg-alarm-500 shadow-glow-alarm" /> REC
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="pf-scroll h-full max-h-[62vh] space-y-2.5 overflow-y-auto px-4 py-3">
          {entries.length === 0 && (
            <div className="rounded-hud border border-phos-900/40 bg-abyss-700/50 px-3 py-2 font-mono text-[11px] text-steel-400">
              NO SHOTS FIRED. FIRST CONTACT GENERATES THE FIRST GROTH16 PROOF…
            </div>
          )}
          {entries.map((e, i) => (
            <article
              key={e.id}
              data-od-id={`log-entry-${e.id}`}
              className={`animate-log-in rounded-hud px-3 py-2 ${
                e.pending
                  ? "relative overflow-hidden border border-dashed border-phos-400/60 bg-abyss-700/70"
                  : "border border-phos-900/40 bg-abyss-700/50"
              }`}
              style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}
            >
              {e.pending && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-[-50%] bg-sweep opacity-40 animate-sweep-fast" />
                </div>
              )}
              <div className="relative flex items-center gap-3">
                <span className="font-mono text-[11px] text-steel-400">#{String(e.id).padStart(3, "0")}</span>
                <span className="font-mono text-coord text-ink-100">
                  {e.actor} · {e.coordinate}
                </span>
                {e.sunk && (
                  <span className="font-mono text-[9.5px] tracking-hud text-alarm-400">▼ {e.sunk} SUNK</span>
                )}
                {e.pending ? (
                  <span className="ml-auto animate-blink font-mono text-[11px] tracking-hud text-phos-300">
                    PROVING…
                  </span>
                ) : (
                  e.result && (
                    <span
                      className={`pf-stamp ml-auto font-mono ${
                        e.result === "hit" ? "pf-stamp-hit" : "pf-stamp-miss"
                      }`}
                    >
                      {e.result === "hit" ? "HIT" : "MISS"}
                    </span>
                  )
                )}
              </div>
              <div className="relative mt-1.5 flex items-center gap-3">
                {e.pending ? (
                  <>
                    <span className="font-mono text-[10.5px] text-phos-200">GENERATING ZK PROOF</span>
                    <ScrambleHash />
                  </>
                ) : e.note ? (
                  <span className="font-mono text-[10.5px] text-alarm-400">{e.note}</span>
                ) : (
                  <>
                    <span className="pf-badge-verify font-mono">PROOF VERIFIED ✓</span>
                    <span className="font-mono text-[10.5px] text-steel-400">{e.hash}</span>
                    <span className="ml-auto font-mono text-[10.5px] text-phos-300">{e.ms}ms</span>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
        {proving && <div className="pf-scan-line animate-scan-bar" />}
      </div>

      <footer className="border-t border-phos-900/50 px-4 py-2.5 font-mono text-[10.5px] leading-relaxed text-steel-400">
        SESSION COMMITMENT <span className="text-phos-300">{session.commitment ?? "—"}</span>
        {session.circuit && (
          <>
            {" "}
            · CIRCUIT <span className="text-ink-300">{session.circuit}</span>
          </>
        )}{" "}
        · {session.turnsProven} TURNS PROVEN
      </footer>
    </aside>
  );
}
