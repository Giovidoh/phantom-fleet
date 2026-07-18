import { useRef, useState } from "react";
import BoardGrid from "./components/BoardGrid";
import ProofLog from "./components/ProofLog";
import GameOverModal from "./components/GameOverModal";
import {
  SHIP_DEFS,
  TOTAL_SHIP_CELLS,
  canPlace,
  coordName,
  emptyFleet,
  packBoard,
  placeShip,
  randomFleet,
  randomSalt,
  shipCells,
} from "./game/fleet";
import type { Fleet } from "./game/fleet";
import { pickBotShot } from "./game/bot";
import type { CellMark, LogEntry, Phase } from "./game/types";
import { commitmentOf } from "./zk/poseidon";
import { proveHitMiss, verifyProof } from "./zk/prover";

interface GameData {
  phase: Phase;
  playerFleet: Fleet;
  botFleet: Fleet;
  playerSalt: string;
  botSalt: string;
  playerCommitment: string;
  botCommitment: string;
  enemyMarks: CellMark[]; // player's view of the bot's waters
  ownMarks: CellMark[]; // bot's shots on the player's fleet
  hitsOnBot: number;
  hitsOnPlayer: number;
  turn: "player" | "bot";
  busy: boolean; // a proof is being generated/verified
  log: LogEntry[];
  winner: "player" | "bot" | null;
}

const freshGame = (): GameData => ({
  phase: "placement",
  playerFleet: emptyFleet(),
  botFleet: emptyFleet(),
  playerSalt: "",
  botSalt: "",
  playerCommitment: "",
  botCommitment: "",
  enemyMarks: new Array(100).fill("unknown"),
  ownMarks: new Array(100).fill("unknown"),
  hitsOnBot: 0,
  hitsOnPlayer: 0,
  turn: "player",
  busy: false,
  log: [],
  winner: null,
});

export default function App() {
  // Canonical game data lives in a ref so async proof callbacks never see stale state.
  const gd = useRef<GameData>(freshGame());
  const [, setTick] = useState(0);
  const render = () => setTick((t) => t + 1);

  // --- placement UI state (purely synchronous) ---
  const [placeFleet, setPlaceFleet] = useState<Fleet>(emptyFleet());
  const [shipIdx, setShipIdx] = useState(0);
  const [horiz, setHoriz] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [committing, setCommitting] = useState(false);

  const g = gd.current;
  const placingDone = shipIdx >= SHIP_DEFS.length;

  // ---------- placement ----------
  function preview(): { cells: number[]; valid: boolean } | null {
    if (g.phase !== "placement" || placingDone || hover == null) return null;
    const def = SHIP_DEFS[shipIdx];
    const x = Math.floor(hover / 10);
    const y = hover % 10;
    const cells: number[] = [];
    for (let i = 0; i < def.size; i++) {
      const cx = x + (horiz ? 0 : i);
      const cy = y + (horiz ? i : 0);
      if (cx <= 9 && cy <= 9) cells.push(cx * 10 + cy);
    }
    return { cells, valid: canPlace(placeFleet.board, x, y, def.size, horiz) };
  }

  function handlePlaceClick(idx: number) {
    if (placingDone) return;
    const def = SHIP_DEFS[shipIdx];
    const x = Math.floor(idx / 10);
    const y = idx % 10;
    if (!canPlace(placeFleet.board, x, y, def.size, horiz)) return;
    setPlaceFleet(placeShip(placeFleet, def, x, y, horiz));
    setShipIdx(shipIdx + 1);
    setHover(null);
  }

  async function confirmFleet() {
    if (!placingDone || committing) return;
    setCommitting(true);
    try {
      const bot = randomFleet();
      const playerSalt = randomSalt();
      const botSalt = randomSalt();
      const [playerCommitment, botCommitment] = await Promise.all([
        commitmentOf(packBoard(placeFleet.board), playerSalt),
        commitmentOf(packBoard(bot.board), botSalt),
      ]);
      const ng = freshGame();
      ng.phase = "battle";
      ng.playerFleet = placeFleet;
      ng.botFleet = bot;
      ng.playerSalt = playerSalt;
      ng.botSalt = botSalt;
      ng.playerCommitment = playerCommitment;
      ng.botCommitment = botCommitment;
      ng.log.push({
        id: 1,
        n: 0,
        who: "system",
        text: "Both fleets committed via Poseidon(packed board, salt). Boards stay private in this browser — only proofs will travel.",
      });
      gd.current = ng;
    } finally {
      setCommitting(false);
      render();
    }
  }

  // ---------- battle ----------
  async function fireAt(idx: number) {
    const g = gd.current;
    if (g.phase !== "battle" || g.turn !== "player" || g.busy || g.enemyMarks[idx] !== "unknown") return;
    g.busy = true;
    render();
    const x = Math.floor(idx / 10);
    const y = idx % 10;
    const result = g.botFleet.board[idx];
    const n = g.log.filter((e) => e.who === "fire").length + 1;
    try {
      // The defender (bot engine) proves the answer about ITS private board.
      const { proof, publicSignals, proveMs } = await proveHitMiss({
        board: g.botFleet.board.map(String),
        salt: g.botSalt,
        commitment: g.botCommitment,
        x: String(x),
        y: String(y),
        result: String(result),
      });
      const { ok, verifyMs } = await verifyProof(publicSignals, proof);
      if (!ok) throw new Error("Groth16 verification returned false");

      g.enemyMarks[idx] = result === 1 ? "hit" : "miss";
      g.log.push({
        id: g.log.length + 1,
        n,
        who: "fire",
        text: `You fired at ${coordName(idx)}`,
        coord: coordName(idx),
        result: result === 1 ? "hit" : "miss",
        proveMs,
        verifyMs,
        verified: true,
      });
      if (result === 1) {
        g.hitsOnBot++;
        const ship = g.botFleet.ships.find((s) => s.cells.includes(idx));
        if (ship && ++ship.hits === ship.size) {
          g.log.push({ id: g.log.length + 1, n: 0, who: "system", text: `☠️ You sank the enemy ${ship.name}!` });
        }
      }
      if (g.hitsOnBot >= TOTAL_SHIP_CELLS) {
        g.winner = "player";
        g.phase = "gameover";
        g.busy = false;
        render();
        return;
      }
      g.turn = "bot";
      render();
      window.setTimeout(() => void botTurn(), 800);
    } catch (err) {
      g.log.push({
        id: g.log.length + 1,
        n,
        who: "system",
        text: `⚠️ proof error: ${String((err as Error)?.message ?? err)}`,
      });
      g.busy = false;
      g.turn = "player";
      render();
    }
  }

  async function botTurn() {
    const g = gd.current;
    if (g.phase !== "battle" || g.turn !== "bot") return;
    const idx = pickBotShot(g.ownMarks);
    const x = Math.floor(idx / 10);
    const y = idx % 10;
    const result = g.playerFleet.board[idx];
    const n = g.log.filter((e) => e.who === "prove").length + 1;
    try {
      // The defender (you, the player's client) proves the answer about YOUR private board.
      const { proof, publicSignals, proveMs } = await proveHitMiss({
        board: g.playerFleet.board.map(String),
        salt: g.playerSalt,
        commitment: g.playerCommitment,
        x: String(x),
        y: String(y),
        result: String(result),
      });
      const { ok, verifyMs } = await verifyProof(publicSignals, proof);
      if (!ok) throw new Error("Groth16 verification returned false");

      g.ownMarks[idx] = result === 1 ? "hit" : "miss";
      g.log.push({
        id: g.log.length + 1,
        n,
        who: "prove",
        text: `You proved: ${result === 1 ? "hit" : "miss"} at ${coordName(idx)}`,
        coord: coordName(idx),
        result: result === 1 ? "hit" : "miss",
        proveMs,
        verifyMs,
        verified: true,
      });
      if (result === 1) {
        g.hitsOnPlayer++;
        const ship = g.playerFleet.ships.find((s) => s.cells.includes(idx));
        if (ship && ++ship.hits === ship.size) {
          g.log.push({ id: g.log.length + 1, n: 0, who: "system", text: `☠️ The enemy sank your ${ship.name}!` });
        }
      }
      if (g.hitsOnPlayer >= TOTAL_SHIP_CELLS) {
        g.winner = "bot";
        g.phase = "gameover";
        g.busy = false;
        render();
        return;
      }
      g.turn = "player";
      g.busy = false;
      render();
    } catch (err) {
      g.log.push({
        id: g.log.length + 1,
        n,
        who: "system",
        text: `⚠️ proof error: ${String((err as Error)?.message ?? err)}`,
      });
      g.turn = "player";
      g.busy = false;
      render();
    }
  }

  function playAgain() {
    gd.current = freshGame();
    setPlaceFleet(emptyFleet());
    setShipIdx(0);
    setHoriz(true);
    setHover(null);
    render();
  }

  // ---------- views ----------
  const banner =
    g.phase === "gameover"
      ? g.winner === "player"
        ? "🏆 Game over — you win"
        : "💀 Game over — the enemy wins"
      : g.busy
        ? "⏳ Generating ZK proof… (Groth16 in a Web Worker)"
        : g.turn === "player"
          ? "🎯 Your turn — fire at will"
          : "🛡️ Enemy is firing — you prove the answer";

  return (
    <div className="flex min-h-full flex-col bg-[#050a12]">
      <header className="border-b border-cyan-900/30 bg-[#070f1d]/90 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-[0.25em] text-cyan-300">⚓ PHANTOM FLEET</h1>
            <p className="text-[11px] text-slate-400">Zero-Knowledge Battleship on Midnight</p>
          </div>
          {g.phase !== "placement" && (
            <div className="flex flex-wrap items-center gap-2">
              <CommitmentChip label="YOU" value={g.playerCommitment} />
              <CommitmentChip label="ENEMY" value={g.botCommitment} />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4">
        {g.phase === "placement" ? (
          <div className="flex flex-col items-start gap-4 lg:flex-row">
            <div className="w-full max-w-md rounded-xl border border-cyan-900/40 bg-[#0b1526]/80 p-4">
              <h2 className="text-sm font-semibold tracking-wide text-cyan-200">Deploy your fleet</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Click a water cell to place the current ship. Only overlaps are rejected. When you commit, your board is
                packed and hashed with Poseidon + a random salt — the hash is public, the board never leaves this
                browser.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SHIP_DEFS.map((d, i) => (
                  <span
                    key={d.name}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      i < shipIdx
                        ? "bg-emerald-900/50 text-emerald-300 line-through"
                        : i === shipIdx
                          ? "bg-cyan-700/60 text-cyan-100"
                          : "bg-slate-800/60 text-slate-400"
                    }`}
                  >
                    {d.name} · {d.size}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHoriz((h) => !h)}
                  className="rounded-lg border border-cyan-700/50 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/40"
                >
                  ⟳ Rotate ({horiz ? "horizontal" : "vertical"})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceFleet(randomFleet());
                    setShipIdx(SHIP_DEFS.length);
                  }}
                  className="rounded-lg border border-cyan-700/50 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900/40"
                >
                  🎲 Random fleet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceFleet(emptyFleet());
                    setShipIdx(0);
                  }}
                  className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60"
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                disabled={!placingDone || committing}
                onClick={() => void confirmFleet()}
                className="mt-4 w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {committing ? "Hashing fleet with Poseidon…" : "🔒 Commit fleet & start battle"}
              </button>
            </div>
            <BoardGrid
              title="Your Fleet"
              subtitle={placingDone ? "ready to commit" : `placing: ${SHIP_DEFS[shipIdx].name} (${SHIP_DEFS[shipIdx].size})`}
              fleet={placeFleet}
              marks={new Array(100).fill("unknown")}
              revealShips
              interactive={!placingDone}
              onCellClick={handlePlaceClick}
              preview={preview()}
              onCellHover={setHover}
            />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[auto_auto_minmax(280px,1fr)]">
            <div
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium lg:col-span-3 ${
                g.busy
                  ? "border-amber-700/50 bg-amber-950/30 text-amber-200"
                  : "border-cyan-900/40 bg-[#0b1526]/80 text-cyan-200"
              }`}
            >
              {banner}
            </div>
            <BoardGrid
              title="Your Fleet"
              subtitle={`${TOTAL_SHIP_CELLS - g.hitsOnPlayer}/17 cells afloat`}
              fleet={g.playerFleet}
              marks={g.ownMarks}
              revealShips
              interactive={false}
            />
            <BoardGrid
              title="Enemy Waters"
              subtitle={`${TOTAL_SHIP_CELLS - g.hitsOnBot}/17 cells afloat`}
              fleet={g.phase === "gameover" ? g.botFleet : null}
              marks={g.enemyMarks}
              revealShips={g.phase === "gameover"}
              interactive={g.phase === "battle" && g.turn === "player" && !g.busy}
              onCellClick={(idx) => void fireAt(idx)}
            />
            <div className="min-h-[320px] lg:row-span-1">
              <ProofLog entries={g.log} />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-cyan-900/20 px-4 py-2 text-center text-[10px] text-slate-500">
        Every answer is a real Groth16 proof (bn128) over a hidden board — generated in a Web Worker with snarkjs,
        verified against the circuit's verification key. Circuit: circuits/hitmiss.circom · Midnight deployment path:
        contract/battleship.compact
      </footer>

      {g.phase === "gameover" && g.winner && (
        <GameOverModal
          winner={g.winner}
          playerFleet={g.playerFleet}
          botFleet={g.botFleet}
          playerSalt={g.playerSalt}
          botSalt={g.botSalt}
          playerCommitment={g.playerCommitment}
          botCommitment={g.botCommitment}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
}

function CommitmentChip({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      title={`${value} (click to copy)`}
      onClick={() => void navigator.clipboard?.writeText(value)}
      className="rounded-lg border border-cyan-900/50 bg-[#081120] px-2.5 py-1.5 text-left font-mono text-[10px] hover:border-cyan-600/60"
    >
      <span className="mr-1.5 font-sans text-[9px] font-bold text-slate-400">{label}</span>
      <span className="text-emerald-300">
        {value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "—"}
      </span>{" "}
      ⧉
    </button>
  );
}
