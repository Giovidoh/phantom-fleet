// CommitmentSeal — the cryptographic wax-seal moment.
// Stamps in with animate-seal when `sealed` flips true; a slow dashed ring
// keeps it alive. `hash` is the 0x-prefixed hex form of the Poseidon
// commitment (line-broken in mono inside the disc).
interface CommitmentSealProps {
  hash?: string;
  sealed?: boolean;
}

export default function CommitmentSeal({ hash = "", sealed = false }: CommitmentSealProps) {
  const groups = hash.replace(/^0x/, "").match(/.{1,8}/g) ?? [];
  return (
    <section
      data-od-id="commitment-seal"
      className="flex min-w-[380px] flex-1 flex-col items-center justify-center rounded-panel border border-phos-700/40 bg-abyss-800/50 px-8 py-10 text-center shadow-panel backdrop-blur"
    >
      <p className="font-mono text-eyebrow text-phos-600">// STEP 02 — CRYPTOGRAPHIC COMMITMENT</p>

      <div className={`my-8 ${sealed ? "animate-seal" : "opacity-40"}`}>
        <div
          className="pf-seal-disc"
          style={sealed ? undefined : { borderStyle: "dashed", boxShadow: "none" }}
        >
          <span className="pf-seal-ring" />
          <span className="pf-seal-ring-2" />
          <div className="text-center">
            <div className="pf-txt-glow font-display text-4xl font-bold tracking-hud text-phos-300">PF</div>
            {sealed && (
              <div className="mt-3 font-mono text-[10px] leading-relaxed text-phos-200">
                0x{groups.slice(0, 2).join("")}
                <br />
                {groups.slice(2, 4).join("")}
                <br />
                {groups.slice(4, 6).join("")}
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="font-display text-2xl font-bold tracking-hud text-ink-100">
        {sealed ? "COMMITMENT HASH SEALED" : "AWAITING COMMITMENT"}
      </h3>
      {sealed ? (
        <>
          <p className="mt-2 font-mono text-[11px] tracking-[.08em] text-verify-400">
            FLEET CRYPTOGRAPHICALLY LOCKED ✓
          </p>
          <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink-300">
            Your fleet is sealed before the first shot is fired. When the game ends, the reveal is checked
            against this seal — move a single ship and the mathematics exposes you.
          </p>
        </>
      ) : (
        <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-ink-300">
          Position all five hulls, then seal. The commitment (Poseidon hash of your packed board + a random
          salt) is what every hit/miss proof is checked against — the fleet itself never leaves your device.
        </p>
      )}
    </section>
  );
}
