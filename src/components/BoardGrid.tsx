// BoardGrid — labeled 10×10 board ("YOUR FLEET" defensive sonar /
// "ENEMY WATERS" targeting). Thin TypeScript adapter over the game state:
// it maps the game's index-based boards/marks onto the Open Design cell
// vocabulary and echoes clicks upward as game indexes. No rules here.
//
// Coordinate law (UI layer): letters = columns (A–J), numbers = rows (1–10).
// Game internals keep idx = x*10 + y (x = row). uiCoord() bridges the two.
import type { ReactNode } from "react";
import type { CellMark } from "../game/types";
import type { Ship } from "../game/fleet";
import Cell from "./Cell";
import type { CellVisualState, HullSeg } from "./Cell";

const COLS = "ABCDEFGHIJ";

export const uiCoord = (idx: number) => `${COLS[idx % 10]}${Math.floor(idx / 10) + 1}`;

export const idxFromCoord = (coord: string): number => {
  const col = coord.charCodeAt(0) - 65; // 'A' → 0
  const row = parseInt(coord.slice(1), 10) - 1;
  return row * 10 + col;
};

interface BoardGridProps {
  label: string;
  sublabel: string;
  status?: ReactNode;
  marks: CellMark[]; // game shot marks, index-addressed
  ships?: Ship[]; // hulls to render (own fleet / sunk reveals / full reveal)
  pendingIdx?: number | null; // cell currently waiting on a ZK proof
  targeting?: boolean; // reticle hover + clicks
  onFire?: (idx: number) => void;
  onHover?: (idx: number | null) => void;
  preview?: { cells: number[]; valid: boolean } | null; // placement ghost
  small?: boolean; // compact axes (game-over reveal board)
  caption?: string;
}

interface HullEntry {
  seg: HullSeg;
  ship: Ship;
}

export default function BoardGrid({
  label,
  sublabel,
  status,
  marks,
  ships = [],
  pendingIdx = null,
  targeting = false,
  onFire,
  onHover,
  preview = null,
  small = false,
  caption,
}: BoardGridProps) {
  // hull lookup: idx → segment + owning ship
  const hullAt = new Map<number, HullEntry>();
  for (const ship of ships) {
    const horiz = ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1;
    ship.cells.forEach((idx, i) => {
      hullAt.set(idx, {
        ship,
        seg: {
          orientation: horiz ? "h" : "v",
          end: i === 0 ? "start" : i === ship.cells.length - 1 ? "end" : "middle",
          sunk: ship.hits >= ship.size,
        },
      });
    });
  }

  // placement ghost lookup: idx → dashed preview segment
  const ghostAt = new Map<number, HullSeg>();
  if (preview && preview.cells.length > 0) {
    const horiz = preview.cells.length > 1 && preview.cells[1] - preview.cells[0] === 1;
    preview.cells.forEach((idx, i) => {
      if (hullAt.has(idx)) return; // real hull wins; ghost would overlap anyway (invalid)
      ghostAt.set(idx, {
        orientation: horiz ? "h" : "v",
        end: i === 0 ? "start" : i === preview.cells.length - 1 ? "end" : "middle",
        sunk: false,
        ghost: true,
        ghostValid: preview.valid,
      });
    });
  }

  const stateAt = (idx: number): CellVisualState => {
    if (pendingIdx === idx) return "pending";
    const h = hullAt.get(idx);
    if (h && h.seg.sunk) return "sunk";
    const m = marks[idx];
    if (m === "hit") return "hit";
    if (m === "miss") return "miss";
    return "empty";
  };

  return (
    <section data-od-id={targeting ? "enemy-board" : "fleet-board"}>
      <header className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="font-hud text-lg font-semibold tracking-hud text-ink-100">{label}</h3>
          <p className="font-mono text-eyebrow text-phos-600">{sublabel}</p>
        </div>
        {status && <div className="font-mono text-[11px] text-steel-400">{status}</div>}
      </header>

      <div
        className="grid gap-[5px]"
        style={{
          gridTemplateColumns: `${small ? 12 : 18}px 1fr`,
          gridTemplateRows: `${small ? 12 : 18}px 1fr`,
        }}
      >
        <span />
        <div className="grid grid-cols-10">
          {COLS.split("").map((c) => (
            <span
              key={c}
              className={`flex items-center justify-center font-mono tracking-[.08em] text-steel-500 ${
                small ? "text-[7.5px]" : "text-[10px]"
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        {/* known-good pattern: inline gridTemplateRows, never a grid-rows-10 class */}
        <div className="grid" style={{ gridTemplateRows: "repeat(10, 1fr)" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={`flex items-center justify-center font-mono tracking-[.08em] text-steel-500 ${
                small ? "text-[7.5px]" : "text-[10px]"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-10 gap-px border border-phos-900/55 bg-phos-900/35 shadow-[0_0_0_1px_rgba(2,5,11,.6),0_0_40px_rgba(34,211,238,.06)]">
          {Array.from({ length: 10 }, (_, r) =>
            COLS.split("").map((_, c) => {
              const idx = r * 10 + c;
              const coord = uiCoord(idx);
              const hull = hullAt.get(idx)?.seg ?? ghostAt.get(idx) ?? null;
              return (
                <Cell
                  key={coord}
                  coordinate={coord}
                  state={stateAt(idx)}
                  hull={hull}
                  targetable={targeting}
                  onFire={(cd) => onFire?.(idxFromCoord(cd))}
                  onHover={(cd) => onHover?.(cd == null ? null : idxFromCoord(cd))}
                />
              );
            })
          )}
        </div>
      </div>

      {caption && <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-steel-400">{caption}</p>}
    </section>
  );
}
