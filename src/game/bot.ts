import type { CellMark } from "./types";
import { toIdx } from "./fleet";

// Bot gunnery: classic hunt/target. It only ever sees the public hit/miss marks
// on the player's board — never the board itself (that stays behind the ZK proofs).
export function pickBotShot(marks: CellMark[]): number {
  // target mode: any unknown neighbour of a known hit
  const targets = new Set<number>();
  for (let i = 0; i < 100; i++) {
    if (marks[i] !== "hit") continue;
    const x = Math.floor(i / 10);
    const y = i % 10;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx > 9 || ny < 0 || ny > 9) continue;
      const j = toIdx(nx, ny);
      if (marks[j] === "unknown") targets.add(j);
    }
  }
  if (targets.size > 0) {
    const arr = [...targets];
    return arr[Math.floor(Math.random() * arr.length)];
  }
  // hunt mode: checkerboard parity (ships are >= 2 long), fallback to anything
  const parity: number[] = [];
  const rest: number[] = [];
  for (let i = 0; i < 100; i++) {
    if (marks[i] !== "unknown") continue;
    const x = Math.floor(i / 10);
    const y = i % 10;
    ((x + y) % 2 === 0 ? parity : rest).push(i);
  }
  const pool = parity.length > 0 ? parity : rest;
  return pool[Math.floor(Math.random() * pool.length)];
}
