# Phantom Fleet — Midnight preprod deploy & call

Headless scripts that put the battleship contract on the **Midnight preprod**
testnet: no browser, no Lace, no Docker on your machine. Modeled on the
official `midnightntwrk/example-battleship` suite (midnight-js 4.1.1,
wallet-sdk 1.2.0).

## Prereqs

1. **Compiled artifacts committed** — see [`COMPILE.md`](../../COMPILE.md)
   (GitHub Codespaces, ~15 min). These scripts refuse to run without
   `contract/managed/battleship/`.
2. **A proof server URL** — none is public for dApps. Two options:
   - **A — Cloud-hosted (recommended, ~20 min):** deploy
     `midnightntwrk/proof-server:8.1.0` to Railway/Render **from its
     Dockerfile in the cloud** (zero local Docker). This is exactly what
     Midnight's own `midnight-leaderboard` example does in production.
   - **B — Local Docker** (`docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0`)
     if you're on a machine that has it.
3. **Test funds:** a 64-hex seed → its unshielded address → 1000 tNIGHT from
   the [preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) →
   tDUST generation (the deploy script registers it; DUST accrues over a
   few minutes — start the faucet step early).

## Setup

```bash
cd scripts/midnight
npm install
```

## Run

```bash
# 1. Deploy (player 1 + game creation)
MN_SEED=<64-hex-seed-1> \
MN_PROOF_SERVER=https://<your-proof-server> \
npm run deploy
# → prints the contract address + explorer link

# 2. One on-chain call (player 2 joins with a sealed fleet)
MN_SEED=<64-hex-seed-2> \
MN_CONTRACT=<address-from-step-1> \
MN_PROOF_SERVER=https://<your-proof-server> \
npm run call:new-game
# → prints the tx id + explorer link
```

(Windows PowerShell: `$env:MN_SEED="…"` etc. The two seeds must differ —
the contract forbids playing against yourself.)

## Verify

Open the printed links on <https://preprod.midnightexplorer.com> — the
deploy and the `joinGame` call are both visible, while **neither fleet is**:
only sealed `hash(cell, salt)` values touched the ledger. That contrast is
the entire point of Phantom Fleet.

## Honest status

- ✅ Scripts written against the official 4.1.1 API patterns
- ⏳ Compile (needs Codespaces), deploy, call — pending; this build machine
  has no Linux compiler, Docker, or funded wallet
- 🔶 The in-browser demo (circom/snarkjs Groth16) is a **different proof
  system** from Midnight's ZKIR/Impact proofs — see the main README
