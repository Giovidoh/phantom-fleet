// Cell — one grid square. Shape-coded, never color-only:
//   miss → hollow ring + ripple (○) · hit → blast ✕ + flash ·
//   sunk → solid silhouette segment over hazard stripes ·
//   pending → rotating sonar sweep · hover → corner reticle.
// Adapter addition: `ghost` hull segments render the placement hover preview
// (the game uses click-to-place, so the preview must be visible).
export type CellVisualState = "empty" | "miss" | "hit" | "sunk" | "pending";

export interface HullSeg {
  orientation: "h" | "v";
  end: "start" | "middle" | "end";
  sunk: boolean;
  ghost?: boolean;
  ghostValid?: boolean;
}

interface CellProps {
  state?: CellVisualState;
  hull?: HullSeg | null;
  targetable?: boolean;
  coordinate: string;
  onFire?: (coordinate: string) => void;
  onHover?: (coordinate: string | null) => void;
}

export default function Cell({
  state = "empty",
  hull = null,
  targetable = false,
  coordinate,
  onFire,
  onHover,
}: CellProps) {
  const cls = ["pf-cell"];
  if (state === "hit") cls.push("pf-cell-hit");
  if (state === "sunk") cls.push("pf-cell-sunk", "bg-hazard");
  if (targetable && state === "empty") cls.push("pf-targetable");

  let hullCls: string | null = null;
  if (hull) {
    if (hull.ghost) {
      hullCls = [
        "pf-hull-ghost",
        hull.ghostValid === false ? "pf-hull-ghost-bad" : "",
        hull.orientation === "h" ? "pf-hull-h" : "pf-hull-v",
      ]
        .join(" ")
        .trim();
    } else {
      hullCls = [
        hull.sunk ? "pf-mk-sunk" : "pf-hull",
        (hull.sunk ? "pf-mk-sunk-" : "pf-hull-") + hull.orientation,
        hull.end === "start"
          ? hull.orientation === "h"
            ? "pf-cap-w"
            : "pf-cap-n"
          : hull.end === "end"
            ? hull.orientation === "h"
              ? "pf-cap-e"
              : "pf-cap-s"
            : "",
      ]
        .join(" ")
        .trim();
    }
  }

  return (
    <div
      className={cls.join(" ")}
      role={targetable ? "button" : undefined}
      aria-label={coordinate}
      onClick={targetable && state === "empty" ? () => onFire?.(coordinate) : undefined}
      onMouseEnter={() => onHover?.(coordinate)}
      onMouseLeave={() => onHover?.(null)}
    >
      {hullCls && <span className={hullCls} />}

      {state === "miss" && (
        <>
          <span className="pf-mk-ripple animate-ripple" />
          <span className="pf-mk-miss" />
        </>
      )}
      {state === "hit" && (
        <>
          <span className="pf-mk-flash animate-hitflash" />
          <span className="pf-mk-hit" />
        </>
      )}
      {state === "pending" && (
        <>
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-[-50%] bg-sweep animate-sweep" />
          </div>
          <div className="absolute inset-0 border border-dashed border-phos-300/80" />
          <span className="pf-txt-glow relative z-10 font-mono text-[9px] tracking-hud text-phos-200">ZK</span>
        </>
      )}

      {targetable && state === "empty" && !hullCls && (
        <span className="pf-ret">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
