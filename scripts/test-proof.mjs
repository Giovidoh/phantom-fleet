// Phantom Fleet — headless proof that the ZK layer genuinely works.
//
//   node scripts/test-proof.mjs
//
// Builds a random legal fleet (ships 5,4,3,3,2 = 17 cells), commits to it with
// Poseidon(packed, salt), then:
//   1. proves + verifies a HIT   -> must verify true
//   2. proves + verifies a MISS  -> must verify true
//   3. negative: claims HIT on a water cell -> proving must FAIL (constraint violated)
//   4. negative: honest result but WRONG commitment -> proving must FAIL
// Prints PASS/FAIL lines and exits non-zero on any failure.
import { groth16 } from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WASM = join(root, "public", "zk", "hitmiss.wasm");
const ZKEY = join(root, "public", "zk", "hitmiss.zkey");
const VKEY = JSON.parse(readFileSync(join(root, "public", "zk", "verification_key.json"), "utf8"));

const FIELD_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SHIPS = [5, 4, 3, 3, 2];

// ---- fleet generation (same rules as the web app) --------------------------
function randomFleet() {
  const board = new Array(100).fill(0);
  for (const size of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const x = Math.floor(Math.random() * (horiz ? 10 : 10 - size + 1));
      const y = Math.floor(Math.random() * (horiz ? 10 - size + 1 : 10));
      const cells = Array.from({ length: size }, (_, i) => (x + (horiz ? 0 : i)) * 10 + (y + (horiz ? i : 0)));
      if (cells.every((c) => board[c] === 0)) {
        cells.forEach((c) => (board[c] = 1));
        placed = true;
      }
    }
  }
  return board;
}

const packBoard = (board) => board.reduce((acc, b, i) => (b ? acc | (1n << BigInt(i)) : acc), 0n);
const randomSalt = () => BigInt("0x" + randomBytes(31).toString("hex")) % FIELD_P;
const coord = (i) => `${"ABCDEFGHIJ"[Math.floor(i / 10)]}${(i % 10) + 1}`;

// ---- run -------------------------------------------------------------------
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

const board = randomFleet();
const shipCells = board.reduce((n, b) => n + b, 0);
check("fleet has exactly 17 ship cells", shipCells === 17, `${shipCells} cells`);

const salt = randomSalt();
const poseidon = await buildPoseidon();
const packed = packBoard(board);
const commitment = poseidon.F.toObject(poseidon([packed, salt])).toString();
console.log(`commitment = ${commitment.slice(0, 24)}…${commitment.slice(-8)}`);

const hitIdx = board.findIndex((b) => b === 1);
const missIdx = board.findIndex((b) => b === 0);

const prove = async (idx, claimedResult, commit = commitment) => {
  const x = Math.floor(idx / 10), y = idx % 10;
  const input = {
    board: board.map(String),
    salt: salt.toString(),
    commitment: commit,
    x: String(x),
    y: String(y),
    result: String(claimedResult),
  };
  const t0 = performance.now();
  const { proof, publicSignals } = await groth16.fullProve(input, WASM, ZKEY);
  const proveMs = Math.round(performance.now() - t0);
  const t1 = performance.now();
  const ok = await groth16.verify(VKEY, publicSignals, proof);
  const verifyMs = Math.round(performance.now() - t1);
  return { ok, proveMs, verifyMs, publicSignals };
};

// 1. honest HIT
{
  const r = await prove(hitIdx, 1);
  check(`hit proof at ${coord(hitIdx)} verifies`, r.ok === true, `prove ${r.proveMs} ms, verify ${r.verifyMs} ms`);
  check("public signals = [commitment, x, y, result]", r.publicSignals[0] === commitment && r.publicSignals[3] === "1");
}
// 2. honest MISS
{
  const r = await prove(missIdx, 0);
  check(`miss proof at ${coord(missIdx)} verifies`, r.ok === true, `prove ${r.proveMs} ms, verify ${r.verifyMs} ms`);
}
// 3. cheating: claim HIT on water -> circuit constraints must reject
{
  let threw = false;
  try {
    const r = await prove(missIdx, 1);
    if (r.ok) check("false claim rejected", false, "proof verified — CIRCUIT IS BROKEN");
    else check("false hit claim rejected", true, "proof generated but verifies false");
  } catch {
    threw = true;
  }
  if (threw) check("false hit claim rejected", true, "witness generation failed as expected");
}
// 4. cheating: honest cell, wrong commitment -> must reject
{
  let threw = false;
  try {
    const r = await prove(hitIdx, 1, "12345");
    check("wrong commitment rejected", r.ok === false);
  } catch {
    threw = true;
  }
  if (threw) check("wrong commitment rejected", true, "witness generation failed as expected");
}

console.log(failures === 0 ? "\nALL CHECKS PASSED — ZK layer is real and sound." : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
