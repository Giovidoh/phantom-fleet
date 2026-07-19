# ⚓ Phantom Fleet — Project Story

## Inspiration

Battleship is the classic zero-knowledge thought experiment: two players hide
their fleets, and every "hit" or "miss" answer requires a trusted referee.
Online, that referee is a server that sees both boards. On-chain, it's worse —
a smart contract *is* public state, so revealing your fleet to the contract
ruins the game, and keeping it off-chain means trusting your opponent not to
lie.

When I read Midnight's pitch — private state with public verifiability — it
clicked: **Midnight is the referee Battleship always needed.** I set myself
one hard rule for the hackathon: no mocks, no commit-reveal shortcuts. Every
single hit/miss answer in the game had to be a *real* zero-knowledge proof,
generated and verified live. If I couldn't make cheating mathematically
impossible, the project wasn't worth submitting.

## What it does

Phantom Fleet is a fully playable Battleship game (you vs. a hunt/target bot
AI) where:

1. Each side packs its 10×10 board into one field element
   $packed = \sum_{i=0}^{99} b_i \cdot 2^i$, picks a random salt, and publishes
   a Poseidon commitment $C = \mathrm{Poseidon}(packed, salt)$.
2. On every shot, the defender runs a Groth16 circuit proving
   $result = board[10x + y]$ against the public commitment — **inside the
   browser, in a Web Worker**.
3. The attacker verifies the proof in ~30 ms. Only `hit`/`miss` is ever
   revealed; the board never leaves the machine.
4. At game over, both boards and salts are revealed and the commitments are
   recomputed — matching the ones announced before the first shot.

A live ZK Proof Log shows every proof: generation time, verification time,
and the checkmark. A dishonest answer doesn't get "caught" — it simply fails
witness generation. You *cannot* answer dishonestly.

## How I built it

- **Circuit:** `hitmiss.circom` (1,047 constraints), compiled with the
  official circom 2.2.3 compiler. It enforces that every cell is a bit
  ($b_i(b_i - 1) = 0$), that the packed board matches the Poseidon commitment,
  that the coordinate is in range, and that the claimed result equals the
  committed cell.
- **Proving pipeline:** snarkjs 0.7 — powers-of-tau (bn128, pot12) → Groth16
  setup → zkey + verification key, shipped as static assets so the game runs
  without rebuilding.
- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4. Proving runs
  in a Web Worker (`snarkjs.groth16.fullProve`) so the UI stays responsive;
  verification happens on the main thread.
- **Midnight layer:** the same protocol written as a real Compact contract
  (`constructor` seals player 1's fleet, `joinGame`, `fireShot`,
  `respondShot`), with the fleet and salt kept as private witnesses —
  plus headless preprod deploy/call scripts (`scripts/midnight/`) and a
  Codespaces compile runbook (`COMPILE.md`).
- **Verification culture:** a headless test suite proves a hit, proves a miss,
  and — the important part — confirms that a false claim and a wrong
  commitment are both *rejected*.

## Challenges I ran into

**The environment fought back.** My build machine was Windows 11 with no
Docker, no admin rights, no reboot budget. Midnight's documented path — WSL2 +
Docker Desktop, `compactc` (no Windows build exists), and a Docker-only proof
server — was completely blocked. Rather than fake the ZK layer, I pivoted the
architecture: circom ships an official Windows binary and snarkjs runs
anywhere JavaScript runs, so I moved *all* proving into the browser itself and
kept the Compact contract as a faithful, deployment-ready reference
implementation. The constraint became the design.

**snarkjs in a Web Worker is not a paved road.** Groth16 proving needs Node
APIs, WASM, and multi-megabyte zkeys inside a Vite worker bundle. Solving that
(`vite-plugin-node-polyfills`, careful asset loading) is what turned "ZK demo"
into "playable game" — first proof takes a few seconds of warmup, every proof
after that lands in ~0.3–1 s.

**Hash parity across three languages.** The commitment is computed in
JavaScript (circomlibjs), enforced in circom, and mirrored in Compact. One
off-by-one in the packing convention ($idx = 10x + y$) and every proof fails
silently. I pinned one convention everywhere and tested the JS output against
the circuit's public input directly.

## What I learned

- **Circuits change how you think about cheating.** You don't detect a lie;
  you make it unrepresentable. If the witness doesn't satisfy the constraints,
  there is no proof — the concept of "lying about hit/miss" stops existing.
- **Groth16's cost is its trusted setup** (my demo uses a fixed-entropy pot12
  ceremony) — which is precisely what Midnight's ledger-side proving
  eliminates, making the deployment path genuinely exciting rather than a
  chore.
- **Poseidon exists because keccak is murder inside a SNARK.** Choosing a
  SNARK-friendly hash is the difference between 1k constraints and 100k.
- **A feasibility report before writing code saved the hackathon.** Two hours
  of verifying toolchains (compiler builds, proof-server options, network
  endpoints) prevented me from burning the weekend on a blocked path.

## What's next

Deploy the Compact contract to Midnight's preprod testnet: compile in CI,
reuse the existing commitment code as witness values, swap the snarkjs calls
for the generated contract bindings, and let two real players face each other
across the ledger — same game, no shared browser.

---

## Built with

`zero-knowledge-proofs` `midnight` `circom` `groth16` `zk-snark` `snarkjs`
`poseidon` `compact` `blockchain` `privacy` `cryptography` `typescript`
`react` `vite` `tailwind-css` `web-workers` `node.js` `circomlib` `bn128`
`gaming`
