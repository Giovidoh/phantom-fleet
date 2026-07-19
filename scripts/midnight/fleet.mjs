// Phantom Fleet — deterministic demo fleet + commitment for Midnight scripts.
//
// The fleet is derived from MN_SEED with a SHA-256 PRNG, so the deploy and
// call scripts (separate processes) always reconstruct the SAME board, salt,
// and commitment for a given seed.
//
// Board model (must match contract/battleship.compact and src/game rules):
//   - 10x10 grid, cell index = x*10 + y
//   - ships [5, 4, 3, 3, 2] (17 cells total), no overlap, horizontal/vertical
//   - packed = the 100 board bits packed little-endian into 32 bytes
//   - salt   = 32 bytes from sha256(seed || ':salt')
//   - commitment = persistentHash([packed, salt]) as Vector<2, Bytes<32>>
//
// The commitment uses Midnight's OWN persistentHash (from
// @midnight-ntwrk/compact-runtime) — verified to run in plain Node — so the
// value computed here is exactly what the on-chain fleetCommitment circuit
// recomputes in respondShot.

import { createHash, randomBytes } from 'node:crypto';
import {
  persistentHash,
  CompactTypeVector,
  CompactTypeBytes,
} from '@midnight-ntwrk/compact-runtime';

const GRID = 10;
const SHIPS = [5, 4, 3, 3, 2];
const COMMITMENT_TYPE = new CompactTypeVector(2, new CompactTypeBytes(32));

/** Tiny deterministic PRNG over sha256(seed || ':fleet' || counter). */
function sha256Prng(seedHex) {
  let counter = 0;
  let buffer = Buffer.alloc(0);
  let offset = 0;
  const refill = () => {
    buffer = createHash('sha256')
      .update(Buffer.from(seedHex, 'hex'))
      .update(`:fleet:${counter++}`)
      .digest();
    offset = 0;
  };
  refill();
  return (maxExclusive) => {
    if (offset >= buffer.length) refill();
    return buffer[offset++] % maxExclusive;
  };
}

/** Place SHIPS on a fresh 10x10 board; returns number[100] of 0/1. */
export function generateBoard(seedHex) {
  const rand = sha256Prng(seedHex);
  const board = new Array(GRID * GRID).fill(0);
  for (const len of SHIPS) {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const horizontal = rand(2) === 0;
      const x = rand(horizontal ? GRID - len + 1 : GRID);
      const y = rand(horizontal ? GRID : GRID - len + 1);
      const cells = [];
      for (let i = 0; i < len; i++) {
        cells.push((horizontal ? x + i : x) * GRID + (horizontal ? y : y + i));
      }
      if (cells.every((c) => board[c] === 0)) {
        for (const c of cells) board[c] = 1;
        break;
      }
      if (attempt === 999) throw new Error('fleet placement failed (PRNG exhausted)');
    }
  }
  return board;
}

/** Pack 100 board bits little-endian (bit i of byte floor(i/8)) into 32 bytes. */
export function packBoard(board) {
  const packed = new Uint8Array(32);
  for (let i = 0; i < GRID * GRID; i++) {
    if (board[i]) packed[i >> 3] |= 1 << (i & 7);
  }
  return packed;
}

export function deriveSalt(seedHex) {
  return new Uint8Array(
    createHash('sha256').update(Buffer.from(seedHex, 'hex')).update(':salt').digest(),
  );
}

/** commitment = persistentHash([packed, salt]) — identical on- and off-chain. */
export function computeCommitment(packed, salt) {
  return persistentHash(COMMITMENT_TYPE, [packed, salt]);
}

/** Everything the scripts need for one demo player, derived from the seed. */
export function deriveFleet(seedHex) {
  const board = generateBoard(seedHex);
  const packed = packBoard(board);
  const salt = deriveSalt(seedHex);
  const commitment = computeCommitment(packed, salt);
  return { board, packed, salt, commitment };
}

/** Random 32-byte salt variant (used if you ever want a non-deterministic fleet). */
export function randomSalt() {
  return new Uint8Array(randomBytes(32));
}
