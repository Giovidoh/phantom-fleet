// Phantom Fleet — game orchestration. This file wires UNCHANGED game logic
// (src/game/**, src/zk/**) into the Open Design "submarine CIC × crypto-noir"
// component system. No rules, proofs, or state transitions were modified —
// only presentation and the UI adapters around them.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import ScreenFrame from "./components/ScreenFrame";
import TurnBanner from "./components/TurnBanner";
import BoardGrid, { uiCoord } from "./components/BoardGrid";
import ShipTray from "./components/ShipTray";
import CommitmentSeal from "./components/CommitmentSeal";
import ProofLog from "./components/ProofLog";
import type { ProofEntry } from "./components/ProofLog";
import GameOverModal from "./components/GameOverModal";
import {
  SHIP_DEFS,
  TOTAL_SHIP_CELLS,
  canPlace,
  emptyFleet,
  packBoard,
  placeShip,
  randomFleet,
  randomSalt,
} from "./game/fleet";
import type { Fleet } from "./game/fleet";
import { pickBotShot } from "./game/bot";
import type { CellMark, Phase } from "./game/types";
import { commitmentOf } from "./zk/poseidon";
import { proveHitMiss, verifyProof } from "./zk/prover";

interface PendingShot {
  board: "enemy" | "own";
  idx: number;
}

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
  pending: PendingShot | null; // which cell the in-flight proof is about
  entries: ProofEntry[]; // chronological combat console entries
  seq: number; // entry id counter
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
  pending: null,
  entries: [],
  seq: 0,
  winner: null,
});

const EMPTY_MARKS: CellMark[] = new Array(100).fill("unknown");

// display helpers (commitments are decimal field elements; the HUD speaks hex)
const hexOf = (decimal: string) => "0x" + BigInt(decimal).toString(16).padStart(64, "0");
const shortHex = (decimal: string) => {
  const h = hexOf(decimal);
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
};
const proofHash = (proof: unknown) => {
  const p = proof as { pi_a?: string[] };
  const h = BigInt(p.pi_a?.[0] ?? "0").toString(16);
  return `0x${h.slice(0, 4)}…${h.slice(-4)}`;
};

export default function App() {
  // Canonical game data lives in a ref so async proof callbacks never see stale state.
  const gd = useRef<GameData>(freshGame());
  const [, setTick] = useState(0);
  const render = () => setTick((t) => t + 1);

  // --- placement UI state (purely synchronous) ---
  const [placeFleet, setPlaceFleet] = useState<Fleet>(emptyFleet());
  const [shipIdx, setShipIdx] = useState(0);
  const [horiz, setHoriz] = useState(true);
  const [committing, setCommitting] = useState(false);
  // --- seal interstitial: commitment stamped, battle begins a beat later ---
  const [sealed, setSealed] = useState<{ hash: string } | null>(null);
  const pendingGame = useRef<GameData | null>(null);
  // --- battle UI state ---
  const [lockCoord, setLockCoord] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ player: string; enemy: string; match: boolean } | null>(null);
  const [modalDismissed, setModalDismissed] = useState(false);

  const g = gd.current;
  const placingDone = shipIdx >= SHIP_DEFS.length;

  // R rotates during placement (matches the tray's "ROTATE — R")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gd.current.phase !== "placement" || sealed) return;
      if (e.key === "r" || e.key === "R") setHoriz((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sealed]);

  // game-over ceremony: recompute both commitments from the revealed boards
  const phase = g.phase;
  useEffect(() => {
    if (phase !== "gameover") return;
    const gg = gd.current;
    let cancelled = false;
    (async () => {
      const p = await commitmentOf(packBoard(gg.playerFleet.board), gg.playerSalt);
      const b = await commitmentOf(packBoard(gg.botFleet.board), gg.botSalt);
      if (!cancelled) {
        setReveal({
          player: hexOf(p),
          enemy: hexOf(b),
          match: p === gg.playerCommitment && b === gg.botCommitment,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // ---------- placement ----------
  // hover is tracked in a ref so BoardGrid mouse moves don't re-render the app
  const hoverIdx = useRef<number | null>(null);
  const [hoverTick, setHoverTick] = useState(0);

  function buildPreview(): { cells: number[]; valid: boolean } | null {
    const hov = hoverIdx.current;
    if (g.phase !== "placement" || placingDone || sealed || hov == null) return null;
    const def = SHIP_DEFS[shipIdx];
    const x = Math.floor(hov / 10);
    const y = hov % 10;
    const cells: number[] = [];
    for (let i = 0; i < def.size; i++) {
      const cx = x + (horiz ? 0 : i);
      const cy = y + (horiz ? i : 0);
      if (cx <= 9 && cy <= 9) cells.push(cx * 10 + cy);
    }
    return { cells, valid: canPlace(placeFleet.board, x, y, def.size, horiz) };
  }

  function handlePlaceHover(idx: number | null) {
    hoverIdx.current = idx;
    setHoverTick((t) => t + 1); // light re-render so the ghost follows the cursor
  }

  function handlePlaceClick(idx: number) {
    if (placingDone || sealed) return;
    const def = SHIP_DEFS[shipIdx];
    const x = Math.floor(idx / 10);
    const y = idx % 10;
    if (!canPlace(placeFleet.board, x, y, def.size, horiz)) return;
    setPlaceFleet(placeShip(placeFleet, def, x, y, horiz));
    setShipIdx(shipIdx + 1);
    hoverIdx.current = null;
  }

  async function confirmFleet() {
    if (!placingDone || committing || sealed) return;
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
      pendingGame.current = ng;
      setSealed({ hash: hexOf(playerCommitment) });
      // let the seal stamp-in play for a full beat, then open fire
      window.setTimeout(() => {
        if (pendingGame.current) {
          gd.current = pendingGame.current;
          pendingGame.current = null;
        }
        setSealed(null);
        render();
      }, 2000);
    } finally {
      setCommitting(false);
    }
  }

  // ---------- battle ----------
  async function fireAt(idx: number) {
    const g = gd.current;
    if (g.phase !== "battle" || g.turn !== "player" || g.busy || g.enemyMarks[idx] !== "unknown") return;
    g.busy = true;
    g.pending = { board: "enemy", idx };
    const entryId = ++g.seq;
    g.entries.push({ id: entryId, actor: "YOU", coordinate: uiCoord(idx), result: null, pending: true });
    render();
    const x = Math.floor(idx / 10);
    const y = idx % 10;
    const result = g.botFleet.board[idx];
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
      const { ok } = await verifyProof(publicSignals, proof);
      if (!ok) throw new Error("Groth16 verification returned false");

      g.enemyMarks[idx] = result === 1 ? "hit" : "miss";
      let sunk: string | null = null;
      if (result === 1) {
        g.hitsOnBot++;
        const ship = g.botFleet.ships.find((s) => s.cells.includes(idx));
        if (ship && ++ship.hits === ship.size) sunk = ship.name.toUpperCase();
      }
      const e = g.entries.find((en) => en.id === entryId);
      if (e) {
        e.pending = false;
        e.result = result === 1 ? "hit" : "miss";
        e.hash = proofHash(proof);
        e.ms = proveMs;
        e.sunk = sunk;
      }
      if (g.hitsOnBot >= TOTAL_SHIP_CELLS) {
        g.winner = "player";
        g.phase = "gameover";
        g.busy = false;
        g.pending = null;
        render();
        return;
      }
      g.pending = null;
      g.turn = "bot";
      render();
      window.setTimeout(() => void botTurn(), 800);
    } catch (err) {
      const e = g.entries.find((en) => en.id === entryId);
      if (e) {
        e.pending = false;
        e.note = `PROOF ERROR — ${String((err as Error)?.message ?? err)}`;
      }
      g.busy = false;
      g.pending = null;
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
    g.pending = { board: "own", idx };
    const entryId = ++g.seq;
    g.entries.push({ id: entryId, actor: "ENMY", coordinate: uiCoord(idx), result: null, pending: true });
    render();
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
      const { ok } = await verifyProof(publicSignals, proof);
      if (!ok) throw new Error("Groth16 verification returned false");

      g.ownMarks[idx] = result === 1 ? "hit" : "miss";
      let sunk: string | null = null;
      if (result === 1) {
        g.hitsOnPlayer++;
        const ship = g.playerFleet.ships.find((s) => s.cells.includes(idx));
        if (ship && ++ship.hits === ship.size) sunk = ship.name.toUpperCase();
      }
      const e = g.entries.find((en) => en.id === entryId);
      if (e) {
        e.pending = false;
        e.result = result === 1 ? "hit" : "miss";
        e.hash = proofHash(proof);
        e.ms = proveMs;
        e.sunk = sunk;
      }
      if (g.hitsOnPlayer >= TOTAL_SHIP_CELLS) {
        g.winner = "bot";
        g.phase = "gameover";
        g.busy = false;
        g.pending = null;
        render();
        return;
      }
      g.pending = null;
      g.turn = "player";
      g.busy = false;
      render();
    } catch (err) {
      const e = g.entries.find((en) => en.id === entryId);
      if (e) {
        e.pending = false;
        e.note = `PROOF ERROR — ${String((err as Error)?.message ?? err)}`;
      }
      g.turn = "player";
      g.busy = false;
      g.pending = null;
      render();
    }
  }

  function playAgain() {
    gd.current = freshGame();
    pendingGame.current = null;
    setPlaceFleet(emptyFleet());
    setShipIdx(0);
    setHoriz(true);
    setSealed(null);
    setReveal(null);
    setModalDismissed(false);
    setLockCoord(null);
    render();
  }

  // ---------- derived view data ----------
  void hoverTick; // hover re-render signal
  const sealing = committing || sealed !== null;
  const trayShips = SHIP_DEFS.map((d, i) => ({
    name: d.name.toUpperCase(),
    len: d.size,
    placed: i < shipIdx,
  }));
  const enemyShipsShown =
    g.phase === "gameover" ? g.botFleet.ships : g.botFleet.ships.filter((s) => s.hits >= s.size);
  const turnsProven = g.entries.filter((e) => e.result !== null).length;
  const logEntries = [...g.entries].reverse();

  const headerPill = (children: ReactNode, key: string) => (
    <span
      key={key}
      className="rounded-hud border border-phos-900/50 bg-abyss-800/60 px-2.5 py-1 font-mono text-[10.5px] tracking-hud text-steel-400"
    >
      {children}
    </span>
  );

  return (
    <ScreenFrame pings={3}>
      {/* ═══ header bar ═══ */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-phos-900/40 bg-abyss-950/70 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,.7))" }}
          >
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v5M12 18v5M1 12h5M18 12h5" />
          </svg>
          <div>
            <h1 className="font-display text-title font-bold text-ink-100">
              PHANTOM <span className="text-phos-400">FLEET</span>
            </h1>
            <p className="font-mono text-eyebrow text-steel-400">
              ZERO-KNOWLEDGE NAVAL COMBAT // MIDNIGHT HACKATHON
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerPill("GROTH16 · BN128", "proto")}
          {g.phase !== "placement" && headerPill(
            <>
              YOU <b className="font-normal text-phos-300">{shortHex(g.playerCommitment)}</b>
            </>,
            "you"
          )}
          {g.phase !== "placement" && headerPill(
            <>
              ENEMY <b className="font-normal text-phos-300">{shortHex(g.botCommitment)}</b>
            </>,
            "enemy"
          )}
          {headerPill(
            <>
              <i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-phos-400 shadow-glow-sm" />
              LOCAL PROVER
            </>,
            "local"
          )}
        </div>
      </header>

      {/* ═══ turn banner (battle only) ═══ */}
      {g.phase === "battle" && (
        <TurnBanner turn={g.turn === "player" ? "player" : "enemy"} turnNumber={g.entries.length} />
      )}
      {g.phase === "gameover" && (
        <TurnBanner
          turn="enemy"
          label="ENGAGEMENT COMPLETE"
          sub="— FULL FLEET DISCLOSURE"
          action={
            modalDismissed ? (
              <button
                type="button"
                onClick={() => setModalDismissed(false)}
                className="rounded-panel border border-phos-700/60 px-4 py-2 font-hud text-[12px] font-semibold tracking-hud text-ink-200 transition-glow hover:border-phos-400 hover:text-ink-100 hover:shadow-glow-sm"
              >
                VIEW CEREMONY
              </button>
            ) : undefined
          }
        />
      )}

      {/* ═══ FLEET PLACEMENT ═══ */}
      {g.phase === "placement" && (
        <main className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-wrap items-stretch gap-6 px-6 py-6">
          <div className="board-wrap-lg">
            <BoardGrid
              label="DEPLOY YOUR FLEET"
              sublabel="// GRID SECTOR 7 — PLACEMENT PHASE"
              status={
                <>
                  SHIPS <b className="font-normal text-phos-300">{Math.min(shipIdx, 5)}/5</b>
                </>
              }
              marks={EMPTY_MARKS}
              ships={placeFleet.ships}
              targeting={!placingDone && !sealing}
              onFire={handlePlaceClick}
              onHover={handlePlaceHover}
              preview={buildPreview()}
              caption="CLICK TO POSITION · R = ROTATE · PLACEMENT IS LOCAL ONLY — NOTHING LEAVES YOUR DEVICE."
            />
          </div>
          <ShipTray
            ships={trayShips}
            orientation={horiz ? "h" : "v"}
            onRotate={() => setHoriz((h) => !h)}
            onRandom={() => {
              if (sealing) return;
              setPlaceFleet(randomFleet());
              setShipIdx(SHIP_DEFS.length);
            }}
            onClear={() => {
              if (sealing) return;
              setPlaceFleet(emptyFleet());
              setShipIdx(0);
            }}
            onSeal={() => void confirmFleet()}
            sealing={sealing}
          />
          <CommitmentSeal hash={sealed?.hash ?? ""} sealed={sealed !== null} />
        </main>
      )}

      {/* ═══ BATTLE ═══ */}
      {g.phase !== "placement" && (
        <main className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-wrap items-stretch gap-6 px-6 py-6">
          <div className="board-wrap">
            <BoardGrid
              label="YOUR FLEET"
              sublabel="// DEFENSIVE SONAR"
              status={
                <>
                  HULL INTEGRITY{" "}
                  <b className="font-normal text-phos-300">
                    {TOTAL_SHIP_CELLS - g.hitsOnPlayer}/{TOTAL_SHIP_CELLS}
                  </b>
                </>
              }
              marks={g.ownMarks}
              ships={g.playerFleet.ships}
              pendingIdx={g.pending?.board === "own" ? g.pending.idx : null}
              targeting={false}
              caption="INCOMING FIRE IS ANSWERED BY YOUR LOCAL PROVER — POSITIONS NEVER LEAVE THIS DEVICE."
            />
          </div>
          <div className="board-wrap">
            <BoardGrid
              label="ENEMY WATERS"
              sublabel="// TARGETING"
              status={
                <>
                  TARGET LOCK <b className="font-normal text-phos-300">{lockCoord ?? "—"}</b> · HITS{" "}
                  <b className="font-normal text-alarm-400">
                    {g.hitsOnBot}/{TOTAL_SHIP_CELLS}
                  </b>
                </>
              }
              marks={g.enemyMarks}
              ships={enemyShipsShown}
              pendingIdx={g.pending?.board === "enemy" ? g.pending.idx : null}
              targeting={g.phase === "battle" && g.turn === "player" && !g.busy}
              onFire={(idx) => void fireAt(idx)}
              onHover={(idx) => setLockCoord(idx == null ? null : uiCoord(idx))}
              caption="EVERY SHOT IS ANSWERED WITH A ZERO-KNOWLEDGE PROOF — HITS CANNOT BE FAKED, MISSES CANNOT BE HIDDEN."
            />
          </div>
          <ProofLog
            entries={logEntries}
            session={{
              commitment: g.playerCommitment ? shortHex(g.playerCommitment) : "—",
              circuit: "hitmiss · groth16 · bn128",
              turnsProven,
            }}
          />
        </main>
      )}

      {/* ═══ game-over ceremony ═══ */}
      {g.phase === "gameover" && g.winner && (
        <GameOverModal
          open={!modalDismissed}
          result={g.winner === "player" ? "victory" : "defeat"}
          turns={turnsProven}
          playerCommitted={hexOf(g.playerCommitment)}
          playerRevealed={reveal?.player ?? null}
          enemyCommitted={hexOf(g.botCommitment)}
          enemyRevealed={reveal?.enemy ?? null}
          match={reveal?.match ?? null}
          boardReveal={
            <BoardGrid
              label=""
              sublabel=""
              small
              marks={g.enemyMarks}
              ships={g.botFleet.ships}
              targeting={false}
            />
          }
          onRematch={playAgain}
          onTranscript={() => setModalDismissed(true)}
        />
      )}
    </ScreenFrame>
  );
}
