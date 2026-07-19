// ShipTray — placement-phase ship list + actions.
// Adapter props: the game's SHIP_DEFS/placement index drive `ships`; a small
// CLEAR button preserves the existing reset affordance; rotate shows the
// current orientation.
export interface TrayShip {
  name: string;
  len: number;
  placed: boolean;
}

interface ShipTrayProps {
  ships: TrayShip[];
  orientation: "h" | "v";
  onRotate: () => void;
  onRandom: () => void;
  onClear: () => void;
  onSeal: () => void;
  sealing?: boolean;
}

export default function ShipTray({
  ships,
  orientation,
  onRotate,
  onRandom,
  onClear,
  onSeal,
  sealing = false,
}: ShipTrayProps) {
  const placedCount = ships.filter((s) => s.placed).length;
  const ready = placedCount === ships.length && ships.length > 0;

  return (
    <section
      data-od-id="ship-tray"
      className="flex w-[360px] shrink-0 flex-col rounded-panel border border-phos-900/50 bg-abyss-800/70 shadow-panel backdrop-blur"
    >
      <header className="border-b border-phos-900/50 px-4 py-3">
        <h3 className="font-hud text-base font-semibold tracking-hud text-ink-100">SHIP TRAY</h3>
        <p className="font-mono text-eyebrow text-phos-600">// {ships.length} HULLS AWAITING ORDERS</p>
      </header>

      <div className="flex-1 space-y-2 px-4 py-3">
        {ships.map((ship) => (
          <div
            key={ship.name}
            className={`flex items-center justify-between rounded-hud border px-3 py-2.5 transition-glow ${
              ship.placed ? "border-phos-900/40 bg-abyss-700/50" : "border-dashed border-steel-600/60 bg-abyss-800/40"
            }`}
          >
            <div>
              <div
                className={`font-hud text-sm font-semibold tracking-hud ${
                  ship.placed ? "text-ink-100" : "text-steel-400"
                }`}
              >
                {ship.name}
              </div>
              <div className="mt-1.5 flex gap-1">
                {Array.from({ length: ship.len }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-3.5 border ${
                      ship.placed
                        ? "border-phos-400 bg-phos-400/20 shadow-glow-sm"
                        : "border-steel-300/40 bg-steel-700"
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className={`font-mono text-[10px] tracking-hud ${ship.placed ? "text-verify-400" : "text-steel-400"}`}>
              {ship.placed ? "PLACED ✓" : "UNPLACED"}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5 border-t border-phos-900/50 px-4 py-4">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onRotate}
            disabled={sealing}
            className="flex-1 rounded-panel border border-phos-700/60 bg-transparent px-4 py-3 font-hud text-[13px] font-semibold tracking-hud text-ink-200 transition-glow hover:border-phos-400 hover:text-ink-100 hover:shadow-glow-sm disabled:opacity-40"
          >
            ROTATE — R ·{orientation === "h" ? "HORZ" : "VERT"}
          </button>
          <button
            type="button"
            onClick={onRandom}
            disabled={sealing}
            className="flex-1 rounded-panel border border-phos-700/60 bg-transparent px-4 py-3 font-hud text-[13px] font-semibold tracking-hud text-ink-200 transition-glow hover:border-phos-400 hover:text-ink-100 hover:shadow-glow-sm disabled:opacity-40"
          >
            RANDOM FLEET
          </button>
        </div>
        <button
          type="button"
          onClick={onSeal}
          disabled={!ready || sealing}
          className="w-full rounded-panel bg-phos-400 px-4 py-3 font-hud text-[13px] font-semibold tracking-hud text-abyss-900 shadow-glow transition-glow hover:bg-phos-300 hover:shadow-glow-lg disabled:cursor-not-allowed disabled:bg-steel-600 disabled:text-steel-400 disabled:shadow-none"
        >
          {sealing ? "SEALING…" : `SEAL COMMITMENT — ${placedCount}/${ships.length}`}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={sealing}
          className="w-full rounded-panel px-4 py-1.5 font-hud text-[11px] font-semibold tracking-hud text-steel-400 transition-glow hover:text-ink-200 disabled:opacity-40"
        >
          CLEAR GRID
        </button>
      </div>
    </section>
  );
}
