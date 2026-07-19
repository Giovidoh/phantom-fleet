// Phantom Fleet — Compact contract witnesses (plain JS, ESM).
// Modeled on midnightntwrk/example-battleship contract/witnesses.ts.
//
// Private state shape (NEVER leaves the prover's machine):
//   {
//     board:  number[100],     // 0/1 cells, idx = x*10 + y
//     packed: Uint8Array(32),  // the 100 board bits packed little-endian
//     salt:   Uint8Array(32),  // commitment salt
//   }
// commitment = persistentHash([packed, salt]) — computed identically
// off-chain (scripts/midnight/fleet.mjs) and on-chain (fleetCommitment).

export const createFleetPrivateState = (board, packed, salt) => ({
  board,
  packed,
  salt,
});

export const witnesses = {
  // The packed board behind the sealed commitment.
  fleetSeal: ({ privateState }) => [privateState, privateState.packed],

  // The salt behind the sealed commitment.
  fleetSalt: ({ privateState }) => [privateState, privateState.salt],

  // The private cell value at (x, y) — read from the same board that
  // fleetSeal() packs, so the hash binding covers this answer.
  fleetCell: ({ privateState }, x, y) => [
    privateState,
    BigInt(privateState.board[Number(x) * 10 + Number(y)]),
  ],
};
