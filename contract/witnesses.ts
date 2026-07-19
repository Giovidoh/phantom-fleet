// Phantom Fleet — private state + witnesses for the battleship contract.
// SPDX-License-Identifier: MIT
//
// Private state lives ONLY on the player's machine (LevelDB private state
// provider). The fleet and the sealing salt never touch the chain or the
// browser of the opponent — this file is the whole privacy story.
//
// NOTE: this file mirrors the official midnightntwrk/example-battleship
// witness idioms (WitnessContext<[privateState, result]> returns).

import { type Ledger, ShotResult } from './managed/battleship/contract/index.js';
import { type WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';

export type PhantomPrivateState = {
    // The player's 17 fleet cells (0..99, index = row*10 + col). Secret.
    fleet: bigint[];
    // Sealing salt for hash(cell, salt) commitments. Secret.
    salt: Uint8Array;
    // Dapp-scoped secret key for role checks. Secret.
    sk: Uint8Array;
};

export const createPhantomPrivateState = (
    fleet: bigint[],
    salt: Uint8Array,
    sk: Uint8Array,
): PhantomPrivateState => ({ fleet, salt, sk });

export const witnesses = {
    // The sealing salt — used on-chain to (re)compute hash(cell, salt).
    localSalt: ({
        privateState,
    }: WitnessContext<Ledger, PhantomPrivateState>): [
        PhantomPrivateState,
        Uint8Array,
    ] => [privateState, privateState.salt],

    // The dapp secret key — used on-chain to derive the role public key.
    localSk: ({
        privateState,
    }: WitnessContext<Ledger, PhantomPrivateState>): [
        PhantomPrivateState,
        Uint8Array,
    ] => [privateState, privateState.sk],

    // The honest hit/miss answer for an incoming shot. The on-chain seal
    // check in respondShot() makes lying here cryptographically useless.
    localShotResult: (
        { privateState }: WitnessContext<Ledger, PhantomPrivateState>,
        x: bigint,
    ): [PhantomPrivateState, ShotResult] => {
        const hit = privateState.fleet.includes(x);
        return [privateState, hit ? ShotResult.HIT : ShotResult.MISS];
    },
};
