import type { ReactNode } from "react";

// ScreenFrame — crypto-noir environment wrapper: sonar grid, ambient pings,
// CRT scanlines and vignette. Pure dressing; children render unchanged.
export default function ScreenFrame({ pings = 3, children }: { pings?: number; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-abyss-900 font-hud text-ink-100 antialiased">
      {/* sonar grid */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-sonar-grid bg-sonar-tile opacity-70" />

      {/* ambient pings */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {Array.from({ length: pings }, (_, i) => (
          <span
            key={i}
            className="pf-env-ping"
            style={{
              top: `${20 + i * 26}%`,
              left: `${12 + i * 37}%`,
              animationDelay: `${i * 1.1}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">{children}</div>

      {/* CRT — topmost, pointer-transparent */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] bg-vignette" />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] bg-scanlines opacity-60 animate-flicker" />
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 right-0 left-0 z-[71] h-[200%] bg-scanlines opacity-25 animate-scan-drift"
      />
    </div>
  );
}
