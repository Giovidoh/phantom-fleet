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
single hit/miss answer had to be backed by a *real* zero-knowledge proof,
generated and verified live. If I couldn't make cheating mathematically
impossible, the project wasn't worth submitting.

## What it does

Phantom Fleet is a fully playable Battleship game (you vs. a hunt/target bot
AI) with the same anti-cheat protocol implemented **twice, honestly** — once
in the browser, once as a Midnight contract:

**In the browser (playable today):**

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

**On Midnight (contract + deploy tooling shipped):**

1. Each player seals a 17-cell fleet on the ledger as per-cell hashes
   $\sigma_i = H(cell_i \,\|\, salt)$ — the fleet and salt live only in the
   player's private state, never on-chain.
2. Turns, shots, and hit counters are enforced by the contract's public
   ledger state.
3. When answering a shot, the `respondShot` circuit recomputes the seal
   *inside the ZK proof* and asserts
   $r = \mathrm{HIT} \Rightarrow H(shot \,\|\, salt) \in F$ and
   $r = \mathrm{MISS} \Rightarrow H(shot \,\|\, salt) \notin F$.
   A lied hit or miss simply cannot be proven.

A live ZK Proof Log shows every in-browser proof: generation time,
verification time, and the checkmark. A dishonest answer doesn't get
"caught" — it fails at proof generation. You *cannot* answer dishonestly.

## How I built it

- **Browser circuit:** `hitmiss.circom` (1,047 constraints), compiled with
  the official circom 2.2.3 compiler. It enforces that every cell is a bit
  ($b_i(b_i - 1) = 0$), that the packed board matches the Poseidon
  commitment, that the coordinate is in range, and that the claimed result
  equals the committed cell.
- **Proving pipeline:** snarkjs 0.7 — powers-of-tau (bn128, pot12) → Groth16
  setup → zkey + verification key, shipped as static assets so the game runs
  without rebuilding.
- **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS 4. Proving
  runs in a Web Worker (`snarkjs.groth16.fullProve`) so the UI stays
  responsive; verification happens on the main thread.
- **Midnight contract:** `contract/battleship.compact`, written for compiler
  0.31.1 against the official `example-battleship` idioms. Real game logic:
  a `Phase` state machine for turn enforcement, repeat-shot protection,
  per-player hit counters, and a win state at 17 hits. Player identity is a
  dapp-scoped public key derived from a secret-key witness; the fleet and
  salt are witnesses too, so private state never touches the ledger.
- **Deployment tooling:** headless preprod scripts (`scripts/midnight/`)
  built on midnight-js 4.1.1 + wallet-sdk 1.2.0 — `deploy-preprod.mjs`
  deploys with a seed wallet, `call-new-game.mjs` joins on-chain with a
  second sealed fleet, both printing explorer links. `COMPILE.md` is a
  15-minute GitHub Codespaces runbook (the Compact compiler has no Windows
  build; `.devcontainer/` pre-installs the toolchain).
- **Honest status:** the contract and scripts are written and reviewed
  against the official patterns; compile/deploy are *pending* — they need a
  Linux compiler, a funded preprod wallet, and a proof-server URL, none of
  which fit on the build machine. The runbook is the deliverable.
- **Verification culture:** a headless test suite proves a hit, proves a
  miss, and — the important part — confirms that a false claim and a wrong
  commitment are both *rejected*.

## Challenges I ran into

**The environment fought back.** My build machine was Windows 11 with no
Docker, no admin rights, no reboot budget. Midnight's documented path — WSL2
+ Docker Desktop, `compactc` (no Windows build exists), and a Docker-only
proof server — was completely blocked. Rather than fake the ZK layer, I
pivoted the architecture: circom ships an official Windows binary and
snarkjs runs anywhere JavaScript runs, so I moved *all* in-browser proving
into the browser itself, and packaged the Midnight half as a proper
compile-and-deploy kit (Codespaces runbook + headless scripts) instead of a
vaporware claim. The constraint became the design.

**Writing a contract for a compiler I couldn't run.** With no local
`compactc`, every line of the Compact contract had to be right by
construction — I modeled it on the official `example-battleship` idioms,
kept the ledger state minimal (sealed hashes, counters, a phase enum), and
pushed everything game-cosmetic off-chain. Discipline substituted for a
compiler feedback loop.

**One protocol, two proof systems — stated plainly.** Midnight doesn't run
Groth16; it uses its own ZKIR/Impact proofs via a proof server. So the
project deliberately implements the same anti-cheat property twice: a
full-board Poseidon commitment in circom for the browser, and per-cell
sealed hashes re-checked inside the Compact circuit on Midnight. No hand-waving
that they're the same thing — they're two honest implementations of one idea.

**snarkjs in a Web Worker is not a paved road.** Groth16 proving needs Node
APIs, WASM, and multi-megabyte zkeys inside a Vite worker bundle. Solving
that (`vite-plugin-node-polyfills`, careful asset loading) is what turned
"ZK demo" into "playable game" — first proof takes a few seconds of warmup,
every proof after that lands in ~0.3–1 s.

**Hash parity across three languages.** Commitments are computed in
JavaScript (circomlibjs), enforced in circom, and mirrored in Compact. One
off-by-one in the packing convention ($idx = 10x + y$) and every proof fails
silently. I pinned one convention everywhere and tested the JS output
against the circuit's public input directly.

## What I learned

- **Circuits change how you think about cheating.** You don't detect a lie;
  you make it unrepresentable. In circom, a false answer fails witness
  generation; in Compact, it's an `assert` that no proof can satisfy.
  Either way, "lying about hit/miss" stops existing as a concept.
- **Midnight's witness model is the real product.** Ledger state is public
  and minimal; everything sensitive is a witness evaluated inside the proof.
  Designing for that split — sealed hashes on-chain, fleet + salt off-chain —
  is the opposite of EVM intuition, and it's what makes hidden-information
  games viable on a public ledger at all.
- **Groth16's cost is its trusted setup** (my demo uses a fixed-entropy
  pot12 ceremony) — which is precisely what Midnight's ledger-side proving
  eliminates. The deployment path is genuinely exciting rather than a chore.
- **Poseidon exists because keccak is murder inside a SNARK.** Choosing a
  SNARK-friendly hash is the difference between 1k constraints and 100k.
- **A feasibility report before writing code saved the hackathon.** Two
  hours of verifying toolchains (compiler builds, proof-server options,
  network endpoints) prevented me from burning the weekend on a blocked path.

## What's next

The on-chain half is a runbook away from live: **compile in Codespaces →
fund a preprod wallet from the faucet → `npm run mn:deploy` →
`npm run mn:call-new-game`.** The one piece of outside infrastructure is a
proof-server URL (cloud-hosting `midnightntwrk/proof-server` from its
Dockerfile — the pattern Midnight's own `midnight-leaderboard` uses in
production). Then two real players face each other across the ledger — same
game, no shared browser, and a referee made of math.

---

## Built with

`zero-knowledge-proofs` `midnight` `circom` `groth16` `zk-snark` `snarkjs`
`poseidon` `compact` `midnight-js` `blockchain` `privacy` `cryptography`
`typescript` `react` `vite` `tailwind-css` `web-workers` `node.js`
`circomlib` `bn128` `gaming`
