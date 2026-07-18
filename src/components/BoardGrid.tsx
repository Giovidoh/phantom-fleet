import type { ReactNode } from "react";
import type { CellMark } from "../game/types";
import type { Fleet } from "../game/fleet";

interface BoardGridProps {
  title: string;
  subtitle?: string;
  fleet: Fleet | null;
  marks: CellMark[];
  revealShips: boolean;
  interactive: boolean;
  onCellClick?: (idx: number) => void;
  preview?: { cells: number[]; valid: boolean } | null;
  onCellHover?: (idx: number | null) => void;
}

const COLS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const ROWS = "ABCDEFGHIJ".split("");

export default function BoardGrid(props: BoardGridProps) {
  const { fleet, marks, revealShips, interactive, preview } = props;
  const previewSet = new Set(preview?.cells ?? []);

  return (
    <div className="rounded-xl border border-cyan-900/40 bg-[#0b1526]/80 p-3 shadow-[0_0_24px_rgba(34,211,238,0.07)]">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-cyan-200">{props.title}</h2>
        {props.subtitle && <span className="text-[10px] text-slate-400">{props.subtitle}</span>}
      </div>
      <div className="inline-grid grid-cols-[1.1rem_repeat(10,minmax(0,1fr))] gap-[2px]">
        <div />
        {COLS.map((c) => (
          <div key={c} className="flex h-5 items-end justify-center text-[9px] text-slate-500">
            {c}
          </div>
        ))}
        {ROWS.map((rowLabel, x) => (
          <Row key={rowLabel} label={rowLabel} x={x} />
        ))}
      </div>
    </div>
  );

  function Row({ label, x }: { label: string; x: number }) {
    return (
      <>
        <div className="flex w-[1.1rem] items-center justify-center text-[9px] text-slate-500">
          {label}
        </div>
        {Array.from({ length: 10 }, (_, y) => {
          const idx = x * 10 + y;
          const mark = marks[idx];
          const isShip = revealShips && fleet?.board[idx] === 1;
          const inPreview = previewSet.has(idx);

          let cls = "bg-[#0b1a2e]";
          let content: ReactNode = null;
          if (isShip) cls = "bg-cyan-700/50";
          if (mark === "hit") {
            cls = "bg-red-600/60 cell-hit";
            content = <span className="text-[11px] leading-none">💥</span>;
          } else if (mark === "miss") {
            cls = "bg-sky-900/40";
            content = <span className="text-[10px] leading-none opacity-80">🌊</span>;
          }
          if (inPreview) cls = preview?.valid ? "bg-cyan-400/40" : "bg-red-500/40";

          const clickable = interactive && mark === "unknown";
          return (
            <button
              key={idx}
              type="button"
              disabled={!clickable}
              onClick={() => props.onCellClick?.(idx)}
              onMouseEnter={() => props.onCellHover?.(idx)}
              onMouseLeave={() => props.onCellHover?.(null)}
              className={`flex h-6 w-6 items-center justify-center border border-cyan-950/70 select-none sm:h-7 sm:w-7 ${cls} ${
                clickable ? "cursor-pointer hover:bg-cyan-800/60" : "cursor-default"
              }`}
            >
              {content}
            </button>
          );
        })}
      </>
    );
  }
}
