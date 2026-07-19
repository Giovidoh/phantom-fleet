# Phantom Fleet — Midnight Integration Feasibility Report
**Date: 2026-07-19 · Windows 11, Node 24, npm 11, Git, NO Docker, no reboot · Budget ~3h**

## VERDICT: YES-WITH-RISKS

**Single biggest blocker: the proof server.** No official non-Docker proof server exists (no npm package, no Windows binary, no public WASM prover for Compact circuits), and no documented free public endpoint for dApp use. Two verified workarounds:

1. **Cloud-hosted proof server** — deploy midnightntwrk/proof-server to Railway/Render from its Dockerfile in the cloud (no local Docker). This is exactly what Midnight's own midnight-leaderboard example does for production (Vercel frontend + Railway proof server, ~$5/mo). ~20-30 min.
2. **Lace-delegated proving (zero infra, browser-only)** — midnight-js 4.1.1 ships @midnight-ntwrk/midnight-js-dapp-connector-proof-provider (dappConnectorProofProvider), delegating all proving to the Lace wallet via getProvingProvider() (dapp-connector-api 4.0.1). If current Lace implements it, no proof server is needed for the browser demo. **Lace-side support: UNVERIFIED — 15-min smoke test required.**

**Second blocker (smaller): the Compact compiler has no Windows build** (macOS/Linux only). Mitigation: compile in **GitHub Codespaces** (free Linux VM in browser, ~10 min, no reboot/admin) or a GitHub Action; commit the managed/ artifacts — exactly what midnight-leaderboard does.

Everything else — networks, endpoints, SDK, faucet, headless wallets, Node 24 — verified working/current as of 2026-07-19.

## 1. Network state (VERIFIED)

- **Mainnet LIVE since 2026-03-31** (federated Kūkolu phase; validators = IOG + Google Cloud, Vodafone/Pairpoint, Blockdaemon, eToro, MoneyGram, Worldpay, Bullish). Federated = block production only; no dApp-deployment allowlist found; you just need NIGHT→DUST for fees.
- **Testnets now: preview and preprod** (testnet-02 naming gone). Use **preprod** (closest to mainnet).
- Endpoints (probed live 2026-07-19):

| Service | Preview | Preprod | Mainnet |
|---|---|---|---|
| Node RPC | https://rpc.preview.midnight.network (live) | https://rpc.preprod.midnight.network | https://rpc.mainnet.midnight.network (live) |
| Indexer GraphQL | https://indexer.preview.midnight.network/api/v4/graphql (answered real query) | https://indexer.preprod.midnight.network/api/v4/graphql | https://indexer.mainnet.midnight.network/api/v4/graphql (live) |
| Indexer WS | wss://indexer.preview.midnight.network/api/v4/graphql/ws | wss://indexer.preprod.../ws | wss://indexer.mainnet.../ws |
| Faucet UI | https://midnight-tmnight-preview.nethermind.dev/ (HTTP 200) | https://midnight-tmnight-preprod.nethermind.dev/ | none (real NIGHT) |
| Explorers | preview.midnightexplorer.com | preprod.midnightexplorer.com | midnightexplorer.com, midnight.subscan.io |

- Versions (all 3 networks, compatibility matrix 2026-07-19): compact devtools 0.5.1, compiler compactc 0.31.1, compact-runtime 0.16.0, compact-js 2.5.1, **midnight-js 4.1.1**, testkit-js 4.1.1, **wallet-sdk 1.2.0**, dapp-connector-api 4.0.1, indexer 4.3.3 (preview/preprod) / 4.0.1 (mainnet), proof server 8.1.0 (preview/preprod) / 8.0.3 (mainnet). Nodes: preview 1.0.1, preprod 1.0.0, mainnet 0.22.5.

## 2. Compact compiler on Windows without Docker (VERIFIED: impossible natively)

- NOT on npm: @midnight-ntwrk/compact-cli, compactc, compact-tools all 404 on registry.npmjs.org. Install = shell script from github.com/midnightntwrk/compact releases + compact update.
- Latest releases (midnightntwrk/compact v0.5.1; LFDT-Minokawa/compact compactc-v0.31.1) ship only aarch64/x86_64 darwin + linux-musl. **No Windows asset.**
- Docs explicit: "Development is supported on Linux and Mac. Windows is not supported natively; WSL recommended." Official Windows guide = WSL2 + Docker Desktop (needs admin + reboot → ruled out).
- Compilation itself needs no Docker → Codespaces/CI workaround is clean.

## 3. Proof server without Docker (VERIFIED + caveats)

- Official docs still Docker-only: docker run -p 6300:6300 midnightntwrk/proof-server:8.0.3 -- midnight-proof-server -v. No binary/npm/WASM prover published.
- midnight-sdk COMPATIBILITY.md lists hosted lace-proof-pub.preview / lace-proof-pub.preprod endpoints. **UNVERIFIED for dApp use**: preview host alive (AWS ELB) but 404 on documented API paths POST /check and POST /prove (paths confirmed from midnight-js 4.1.1 http-client-proof-provider source); preprod host did not resolve from my location. Appears to back Lace's own proving only.
- Verified alternatives: (a) cloud Dockerfile deploy (midnight-leaderboard pattern: proof-server/Dockerfile → Railway, documented in its README); (b) wallet-delegated proving via dappConnectorProofProvider@4.1.1 (type defs verified: "Creates a ProofProvider that delegates proving to a DApp Connector wallet") — Lace support UNVERIFIED; (c) MeshJS meshsdk/midnight-proof-server image (still Docker).

## 4. Wallet + funds (VERIFIED)

- **Lace**: Midnight incl. mainnet supported in the main Lace extension since ~April 2026 (lace.io blog 2026-04-16). Chrome Web Store: Lace v2.1.1, updated 2026-07-15, IOHK USA LLC. Chrome 119+; Brave needs shields disabled.
- **Faucet**: copy unshielded address from Lace → paste at preprod/preview faucet → 1000 tNIGHT in ~2 min → Lace "Generate tDUST" delegation tx → tDUST accrues over time. Rate-limited per address.
- **Headless wallets**: @midnightntwrk/wallet-sdk@1.2.0 (scope has NO hyphen) builds seed/HD wallets in Node without Lace — official guide "Generating DUST programmatically on Preprod". create-mn-app also generates a wallet + prints faucet URL headlessly. Lace NOT required for deploy scripts.

## 5. MidnightJS (VERIFIED)

- Packages (pin to matrix): @midnight-ntwrk/midnight-js@4.1.1 (barrel) or granular midnight-js-{contracts,types,utils,network-id,indexer-public-data-provider,http-client-proof-provider,dapp-connector-proof-provider,node-zk-config-provider,fetch-zk-config-provider,level-private-state-provider}@4.1.1; @midnightntwrk/wallet-sdk@1.2.0; @midnight-ntwrk/dapp-connector-api@4.0.1; compact-runtime@0.16.0; compact-js@2.5.1.
- Flow (docs "How to configure providers"): setNetworkId('preprod') → providers {privateStateProvider(level), publicDataProvider(indexer HTTP+WS), zkConfigProvider(compiled keys/zkir), proofProvider(HTTP or Lace-delegated), walletProvider+midnightProvider(wallet-sdk facade or Lace)} → deployContract() → submitCallTx(). Browser: polyfill Buffer; Node: polyfill WebSocket (ws).
- **Node 24 fine**: example-bboard requires Node v24.11.1+; no Node-24 blockers in issues.

## 6. Official examples (VERIFIED, freshly updated)

- **npx create-mn-app** — official scaffolder (pushed 2026-07-16). Templates: hello-world (bundled devnet, needs Docker), **battleship**, bboard, leaderboard.
- **example-battleship** — pushed 2026-07-13. battleship.compact + witnesses + vitest suite deploying programmatically with headless seed wallet (src/wallet.ts). **No precompiled artifacts committed** — must compile. Best reference for you.
- **example-bboard** — pushed 2026-07-16; current-network ready; README confirms "Proof server (Docker) is required for both CLI and UI".
- **midnight-leaderboard** — pushed 2026-07-07. Canonical browser DApp: React+Vite+Lace on preprod, live on Vercel, commits contract/managed/ artifacts, documents Railway proof-server pattern, in-browser "Deploy New" flow.
- **July-2026 hackathon starter kit: UNVERIFIED.** "Midnight Hackathon 2026" event listing found (48h, MLH Fellowship admission prize) but no dedicated kit repo; create-mn-app is the de-facto kit. Discord not scrapeable.

## 7. Known blockers scan (VERIFIED)

- Windows: no native compiler build; WSL2+Docker is the only documented Windows path.
- Node 24: not a blocker (example-bboard target runtime v24.11.1+).
- Proof server: the blocker (section 3).
- Mainnet permissioning: no allowlist found; federated = validators only. Deployment costs real NIGHT/DUST → use preprod.
- Misc: version-mixing breaks builds (docs "fix version mismatches"); npm 403 fixes documented; Brave shields block Lace↔proof-server; faucet rate limits; additionalFeeOverhead must be lowered on remote networks (example-bboard README).

## INTEGRATION PLAN (~2.5–3h, Windows, no Docker, no reboot)

**Step 0 — Smoke-test Lace prover (15 min, decides path).** Install Lace v2.1.1 in Chrome → create wallet → Preprod. In your Vite app connect via window.midnight, call api.getProvingProvider(). Present → **Path A (zero infra)**; absent → **Path B (cloud proof server)**.

**Step 1 — Compile in Codespaces (~25 min).** Push battleship.compact → open Codespace → compact installer + compact update → compact compile → commit managed/ (keys/, zkir/, contract JS). Headless; no Lace. If your hand-written contract errors out, port logic into official example-battleship structure (+30 min risk).

**Step 2 — Funds, headless (~15 min + DUST wait).** Node script with @midnightntwrk/wallet-sdk@1.2.0: generate seed → print unshielded address → human step: faucet web form (1000 tNIGHT, ~2 min) → script registers DUST generation. **Start early — DUST accrues over time.**

**Step 3 — Proof server.**
- Path A: nothing to run — dappConnectorProofProvider (Lace proves). Browser-only.
- Path B: deploy midnightntwrk/proof-server:8.0.3 to Railway/Render from GitHub Dockerfile (cloud build) → httpClientProofProvider(https://...railway.app, zkConfigProvider). Works for Node scripts and browser.

**Step 4 — Deploy (~20 min).** Node script (headless, Path B) or browser button (Path A, leaderboard "Deploy New" pattern): providers per section 5 → deployContract → save contractAddress; verify on preprod.midnightexplorer.com.

**Step 5 — One on-chain call (~20 min).** submitCallTx on a trivial circuit → show tx in explorer. Expect ~20–60 s proving latency per call (example-battleship test logs).

**Headless vs Lace boundary:** Steps 1, 2 (except faucet form), 4, 5 fully headless if Path B. Lace required only for Path A proving and the judged demo UX. Faucet form = 1-minute human step either way.

**Fallback if stalled:** (1) compile-only proof — commit managed/ + CI log showing compact compile success; (2) link official docs/endpoints in README; (3) keep circom/snarkjs Groth16 as the in-browser ZK story; frame Midnight as deployment-ready, blocked by one cloud service. NOTE: Groth16 proofs do NOT execute on Midnight (own ZKIR/Impact-VM proofs via proof server) — do not claim Groth16-on-Midnight.

| Step | Est. |
|---|---|
| 0 Lace prover smoke test | 15 min |
| 1 Codespaces compile | 25 min (+30 risk) |
| 2 Funds + DUST wait | 15 min + passive |
| 3 Proof server (A:0 / B:30) | 0–30 min |
| 4 Deploy | 20 min |
| 5 On-chain call | 20 min |
| Slack | 30 min |

## Sources
- docs.midnight.network: /relnotes/network, /relnotes/support-matrix, /getting-started/installation, /getting-started/quickstart, /guides/windows-compact-setup, /guides/run-proof-server, /guides/acquire-tokens, /guides/configure-providers, /guides/generating-dust-programmatically
- github.com/midnightntwrk: compact (v0.5.1), example-battleship, example-bboard, example-counter, midnight-leaderboard, create-mn-app, midnight-sdk/COMPATIBILITY.md
- github.com/LFDT-Minokawa/compact (compactc-v0.31.1); github.com/MeshJS/midnight-proof-server
- npm: midnight-js@4.1.1, compact-js@2.5.3, dapp-connector-proof-provider@4.1.1, http-client-proof-provider source (/check, /prove)
- crypto.news 2026-05-26 (mainnet launch); lace.io blog 2026-04-16; Chrome Web Store Lace v2.1.1
- Live probes 2026-07-19: rpc/indexer preview+mainnet OK, faucet preview OK, lace-proof-pub.preview 404 on API paths
