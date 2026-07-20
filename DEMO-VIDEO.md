# 🎬 Phantom Fleet — Demo Video Production Package

Guidelines verified against the official page (**midnight-hackathon-2026.devpost.com**, fetched 2026-07-19).

## ✅ Hard requirements (from the official Rules/Requirements)

| # | Requirement | How this production complies |
|---|---|---|
| 1 | **2 minutes or less** | Script is timed to **1:58** at a calm 135 wpm pace |
| 2 | **State the hackathon name at the beginning** | First sentence: *"…this is my demo for the **Midnight Hackathon**."* |
| 3 | Show **what you built** and how it meets the **Quest goals** | Live gameplay only — no slides; Gaming-track quest called out explicitly at 1:47 |
| 4 | Video **created the weekend of the hackathon** | Record now, in one or two takes, no pre-produced footage |
| 5 | **Public** video **and** public repo, kept public after the event | Upload as **Public** (not Unlisted) on YouTube; repo link in the description |
| 6 | One project only, team registered on Devpost + MLH with matching email | Non-video items — double-check before submitting |

**Target track: Gaming** — *"verifiable outcomes… without exposing hidden in-game states… fair play guaranteed by cryptography, player data strictly confidential."* Phantom Fleet maps 1:1; the closing line says so out loud.

**Safe on-camera claims** (measured on this machine, `npm run test:proof`, 2026-07-19):
hit proof 858 ms / verify 35 ms · miss proof 278 ms / verify 34 ms · 1,047-constraint circuit · false claims rejected at witness generation.

---

## 🎥 The shooting script (1:58)

Recording setup: browser fullscreen (F11), zoom 125 %, one monitor, 1080p.
**Two tabs:** Tab A = fresh game. Tab B = same game pre-played to **16 / 17 hits** (see staging notes).

| Time | On screen (action) | Say (verbatim) |
|---|---|---|
| 0:00–0:10 | Tab A, fresh board. Face-cam optional; cursor still. | "Hey, I'm *[your name]*, and this is my demo for the **Midnight Hackathon**. Phantom Fleet: Battleship where cheating isn't against the rules — it's mathematically impossible." |
| 0:10–0:24 | Stay on board. | "Battleship needs a referee to answer hit-or-miss honestly. On a public ledger there is no referee — and revealing your fleet to a smart contract ruins the game. So Phantom Fleet replaces the referee with zero-knowledge proofs." |
| 0:24–0:40 | Click **Random fleet**, then **Commit fleet**. Point cursor at both Poseidon commitments in the header. | "I randomize my fleet and commit. My board is packed into one field element, salted, and hashed with Poseidon — that's the commitment, on screen, for both sides. The board itself never leaves my browser." |
| 0:40–1:00 | Fire 2–3 shots on the enemy grid. Let the **Generating ZK proof…** banner show; land a 💥 hit. | "Now I fire. Every answer from the bot comes with a real Groth16 proof, generated live in a Web Worker — there it goes — and verified in about thirty milliseconds. Hit." |
| 1:00–1:18 | **Scroll the ZK Proof Log** slowly — the star moment. | "This is the proof log. Every single answer in this game — hit or miss — carries its own proof: proving time, verify time, checkmark. The bot cannot lie, and neither can I. A false answer doesn't get caught — it never generates at all." |
| 1:18–1:34 | Switch to **Tab B**. Fire the final shot → game-over modal: both boards revealed, commitments recomputed, **✓ match**. | "At game over, both boards and salts are revealed and the commitments are recomputed — matching the ones announced before the first shot. Neither fleet ever left its browser." |
| 1:34–1:47 | Switch to VS Code, `contract/battleship.compact`, `respondShot` visible (the two `assert` cheat checks). | "The same protocol ships as a Compact contract for Midnight: fleets are sealed on-chain as hash-of-cell-and-salt, and `respondShot` re-checks the seal inside the proof itself. Deploy scripts and a compile runbook are in the repo." |
| 1:47–1:58 | Back to the game UI (or game-over modal). Slow down. | "Verifiable outcomes, hidden state, fair play guaranteed by cryptography — that's the Gaming quest. Phantom Fleet: real ZK, playable today, deployable on Midnight tomorrow." |

**Narration ≈ 260 words.** Record the voiceover while driving the mouse — do not pre-record audio; "created this weekend" must stay obviously true.

---

## 🛠 Pre-flight checklist (5 minutes, do in order)

1. `npm install` (once) → `npm run dev` → open the printed URL.
2. **Warm up the prover:** fire one throwaway shot and wait for its proof (~3–5 s first time). Delete/refresh — every later proof lands in ~0.3–1 s. *This is the single most important step for a snappy video.*
3. **Stage Tab B:** play a full game in a second tab until the bot's fleet has **16 of 17 cells hit** and it's your turn — leave the final shot unfired.
4. Stage VS Code: `contract/battleship.compact` open at `respondShot`, font zoomed, minimap off.
5. Browser: fullscreen, 125 % zoom, bookmarks bar hidden, notifications off, close other tabs (proof log must be readable at 1080p).
6. Recorder: **Xbox Game Bar** (Win + G, built into Windows 11) or OBS — 1080p, microphone on, 5-second silence test first.
7. Rehearse the click path once: Random → Commit → 3 shots → scroll log → Tab B → final shot → VS Code → back.

## ⏱ If a take goes long

- Cut the third shot (saves ~6 s).
- Tighten the proof-log scroll to 12 s.
- Never cut: the hackathon-name opening, one full proof cycle, the game-over commitment match, the Gaming-quest close.

## 📤 After recording

- Trim to **≤ 2:00 exactly** (Clipchamp, built into Windows 11, is fine).
- YouTube title: `Phantom Fleet — Zero-Knowledge Battleship on Midnight (Midnight Hackathon Demo)`
- Description (paste-ready):

```
Phantom Fleet — my demo for the Midnight Hackathon (Gaming track).
Battleship where every hit/miss answer is a real Groth16 zero-knowledge proof,
generated and verified in the browser. Fleets never leave the players' machines;
at game over the Poseidon commitments are recomputed and matched.

The same protocol ships as a Compact contract for Midnight (preprod deploy
scripts + compile runbook in the repo).

Code: https://github.com/<your-user>/phantom-fleet
Built with circom, snarkjs, Poseidon, React, Vite, Compact, midnight-js.
```

- Visibility: **Public** (required for prize eligibility — Unlisted is a risk).
- Confirm the repo is public and stays public; submit once on Devpost.
