# ⚓ Phantom Fleet

**Zero-Knowledge Battleship on Midnight** — play Battleship against a bot where every
"hit" or "miss" answer is a real Groth16 zero-knowledge proof generated and verified
**in your browser**. Your fleet never leaves your machine — and neither does the bot's.
Cheating isn't against the rules; it's mathematically impossible.

Built for the Midnight blockchain hackathon.

---

## Status (honest)

| Deliverable | Status |
|---|---|
| Full playable game (player vs bot, placement, hunt/target bot AI, sunk announcements, game-over reveal) | ✅ Working |
| Real Groth16 ZK proofs, generated in a Web Worker + verified in-browser (`snarkjs`, bn128) | ✅ Working |
| Circom circuit `circuits/hitmiss.circom` — compiled with the official circom 2.2.3 compiler | ✅ Working (1,047 constraints) |
| Headless ZK test suite (`node scripts/test-proof.mjs`) — hit proof, miss proof, false-claim rejection, wrong-commitment rejection | ✅ All PASS |
| Fleet commitments — Poseidon(packed board, salt), recomputed and checked at game over | ✅ Working |
| Midnight contract `contract/battleship.compact` — rewritten for compiler 0.31.1 with real fleet-sealing game logic (17 cells, per-cell `hash(cell, salt)` checks) | ✅ Written against official example idioms — **compile pending** (no Linux compiler on the build machine; see [COMPILE.md](COMPILE.md)) |
| Midnight deploy + on-chain call scripts (`scripts/midnight/`, preprod, headless) | ✅ Written against midnight-js 4.1.1 official patterns — **run pending** (needs compiled artifacts + funded wallet + proof-server URL) |
| Midnight preprod deployment | ⏳ Pending — runbook: compile in Codespaces → fund wallet → deploy → call |

**No fallback was taken:** the ZK layer is genuine circom + Groth16, not a
commit-reveal substitute. The commit-reveal scheme only appears at game over
(full board reveal + commitment re-check), exactly as designed.

---

## How it works

1. **Commit.** Each side packs its 10×10 board into a single field element
   `packed = Σ board[i]·2^i`, picks a random salt, and publishes
   `commitment = Poseidon(packed, salt)`. The board stays in the browser.
2. **Fire.** The attacker names a coordinate `(x, y)`.
3. **Prove.** The defender runs the `hitmiss` circuit with private inputs
   `board`, `salt` and public inputs `commitment, x, y, result`. The circuit
   enforces: every cell is a bit, the packed board matches the commitment, the
   coordinate is in range, and `result === board[x*10+y]`. A lie fails proof
   generation — you cannot answer dishonestly.
4. **Verify.** The attacker verifies the Groth16 proof against the circuit's
   verification key. Only `hit`/`miss` is ever revealed.
5. **Reveal.** When 17 cells are hit, both boards + salts are revealed
   in-browser and the commitments are recomputed — matching the ones announced
   before the first shot.

```
┌────────────────────────────  one browser  ────────────────────────────┐
│                                                                        │
│   React UI (Vite + Tailwind)                                           │
│   ├── your fleet grid      ├── enemy waters grid    ├── ZK proof log   │
│   └── game engine (turns, bot hunt/target AI, sunk tracking)           │
│                                                                        │
│   Web Worker ── snarkjs.groth16.fullProve(input, wasm, zkey)           │
│        ▲ private: board[100], salt        (board never leaves worker)  │
│   Main thread ─ snarkjs.groth16.verify(vkey, publicSignals, proof)     │
│        ▲ public: commitment, x, y, result                              │
│                                                                        │
│   Poseidon commitment (circomlibjs)  ==  circuit's public input        │
└────────────────────────────────────────────────────────────────────────┘

   circuits/hitmiss.circom ──circom 2.2.3──> r1cs + wasm
   snarkjs: powersoftau (bn128, pot12) → groth16 setup → zkey → vkey
   artifacts shipped in public/zk/  (hitmiss.wasm, hitmiss.zkey, vkey.json)

   contract/battleship.compact — same protocol as a Midnight reference
   implementation (deployment path below)
```

---

## Quick start

```bash
npm install                 # install dependencies
npm run dev                 # play at the printed localhost URL
```

`public/zk/` proving artifacts are committed, so **the game runs without
rebuilding the circuit**. To rebuild from source (requires `tools/circom.exe`,
already in this repo):

```bash
npm run build:circuit       # circom compile → pot12 ceremony → groth16 setup → public/zk/
npm run test:proof          # headless proof: hit ✓ miss ✓ cheaters rejected ✓
npm run build               # type-check + production build
```

### Demo notes

- **First proof warmup:** the very first in-browser proof can take a few
  seconds (the worker loads the snarkjs bundle and compiles the wasm). Every
  proof after that is typically ~0.3–1 s, verification ~30 ms. Fire one
  throwaway shot before recording a demo if you want it snappy.
- Tested flow: place or randomize fleet → commit → alternate turns → game over
  → commitment re-check.

---

## 2-minute demo video script

| Time | Action |
|---|---|
| 0:00 | "This is **Phantom Fleet**, built for the **Midnight blockchain hackathon**." *(State the hackathon name per the rules.)* |
| 0:10 | Problem: "Battleship needs a trusted referee to answer hit-or-miss. On-chain, there's no referee — and revealing your fleet to the contract ruins the game. Phantom Fleet replaces the referee with zero-knowledge proofs." |
| 0:30 | Show placement → click **Random fleet** → **Commit fleet**. Point at both Poseidon commitments in the header: "My board was just hashed with a salt. The board itself never leaves my browser." |
| 0:45 | Fire at the enemy grid. Show the *Generating ZK proof…* banner, then the 💥/🌊 result. |
| 0:55 | **Star moment:** scroll the **ZK Proof Log** — "Every single answer came with a real Groth16 proof, verified right here — proof time, verify time, checkmark. The bot cannot lie about hit or miss, and neither can I." |
| 1:20 | Play to game over (cut ahead). Game-over modal: both boards revealed, commitments recomputed → "✓ match. Neither fleet ever left its browser. No cheating was mathematically possible." |
| 1:45 | Midnight layer: open `contract/battleship.compact` — "The same protocol is written as a real Compact contract for Midnight: fleets are sealed on-chain as hash-of-cell-and-salt, and the `respondShot` circuit re-checks the seal *inside* the proof — a lied hit or miss simply cannot be proven. Deploy scripts for preprod are in the repo." |
| 2:00 | "Phantom Fleet — real ZK, playable today, deployable on Midnight tomorrow." |

---

## Midnight integration (preprod)

The repo ships the complete on-chain layer, written against the current
official toolchain (midnight-js **4.1.1**, wallet-sdk **1.2.0**, compactc
**0.31.1**) and the official `example-battleship` idioms:

- **`contract/battleship.compact`** — real Battleship logic in Compact:
  17-cell fleets sealed as per-cell `hash(cell, salt)` values on the ledger,
  turn enforcement, and a `respondShot` circuit that recomputes the seal
  **inside the ZK proof** — a claimed HIT must be sealed, a claimed MISS must
  not be. The fleet and salt never leave the player's private state.
- **`contract/witnesses.ts` + `contract/index.ts`** — private state and the
  compiled-contract export, ready for `compact compile`.
- **`COMPILE.md`** — 15-minute GitHub Codespaces compile runbook (the Compact
  compiler has no Windows build; `.devcontainer/` pre-installs the toolchain).
- **`scripts/midnight/`** — headless preprod scripts (own isolated
  `package.json`): `deploy-preprod.mjs` deploys the contract with a seed
  wallet; `call-new-game.mjs` joins the game on-chain with a second sealed
  fleet. Both print preprod-explorer links.

Runbook: **compile in Codespaces → fund a preprod wallet (faucet) → deploy →
call.** The one piece of outside infrastructure is a proof-server URL
(cloud-host `midnightntwrk/proof-server` from its Dockerfile — the pattern
Midnight's own `midnight-leaderboard` uses in production).

> ⚠️ **Two different proof systems, stated plainly:** the in-browser demo
> uses Groth16 (circom/snarkjs) — those proofs do *not* execute on Midnight.
> The Compact contract above uses Midnight's own ZKIR/Impact proofs via the
> proof server. Same game protocol, two honest implementations.

---

## Design decisions & simplifications (hackathon pragmatism)

- **Player vs bot in one browser.** The bot's fleet + salt live in the same
  client; it still proves every answer honestly, which is what makes the demo
  self-contained. The two-party protocol is what the Compact contract encodes.
- **Trusted setup is a fixed-entropy demo ceremony** (`scripts/build-circuit.mjs`)
  — fine for a circuit this size in a demo; a production deployment would run a
  proper multi-party ceremony or use Midnight's ledger proofs (no setup needed).
- **Ships may touch** — only overlaps are rejected (adjacency rules add nothing
  to the ZK story).
- **Board index convention:** `idx = x*10 + y`, `x` = row (A–J), `y` = column
  (1–10), identical in the circuit, the JS packing, and the contract.
- **Sunk announcements are cosmetic** client-side bookkeeping (per-ship hit
  counts), as are the 17-cell win totals.

## Tech stack

- **ZK:** circom 2.2.3 (official Windows binary, `tools/circom.exe`), snarkjs
  0.7 (Groth16, bn128, pot12), circomlib / circomlibjs (Poseidon)
- **Game:** Vite 8, React 19, TypeScript, Tailwind CSS 4, Web Worker proving,
  `vite-plugin-node-polyfills`
- **Midnight:** Compact contract (compiler 0.31.1 idiom) in `contract/`,
  midnight-js 4.1.1 + wallet-sdk 1.2.0 headless scripts in `scripts/midnight/`,
  Codespaces compile kit (`.devcontainer/`, `COMPILE.md`)

## License

MIT — see [LICENSE](LICENSE).
