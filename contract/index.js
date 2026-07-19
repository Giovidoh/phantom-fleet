// Phantom Fleet — compiled-contract loader.
// Modeled on midnightntwrk/example-battleship contract/index.ts (plain JS).
//
// IMPORTANT: this module imports the COMPILER OUTPUT under
// contract/managed/battleship/. Those artifacts do not exist until the
// contract is compiled (see COMPILE.md — GitHub Codespaces). Import this
// module DYNAMICALLY and only after checking the artifacts exist, the way
// scripts/midnight/*.mjs do.
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract } from './managed/battleship/contract/index.js';
import { witnesses } from './witnesses.js';

export { Contract } from './managed/battleship/contract/index.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(currentDir, 'managed', 'battleship');

export const CompiledBattleshipContract = CompiledContract.make(
  'BattleshipContract',
  Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
