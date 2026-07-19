// Phantom Fleet — deploy battleship.compact to Midnight PREPROD, headless.
// SPDX-License-Identifier: MIT
//
// Usage:
//   cd scripts/midnight && npm install
//   MN_SEED=<64-hex seed> MN_PROOF_SERVER=https://<your-proof-server> node deploy-preprod.mjs
//
// Prereqs: contract compiled (contract/managed/ committed — see COMPILE.md),
// wallet funded via the preprod faucet (1000 tNIGHT) + tDUST generation.

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pino from 'pino';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { waitForFunds } from '@midnight-ntwrk/testkit-js';

import { PREPROD_CONFIG as config } from './config.mjs';
import { MidnightWalletProvider, syncWallet } from './wallet.mjs';
import { buildProviders } from './providers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const contractDir = path.resolve(here, '..', '..', 'contract');

// Fail fast with a helpful message if the contract was never compiled.
const managedDir = path.join(contractDir, 'managed', 'battleship');
if (!existsSync(managedDir)) {
  console.error(
    '\n✖ Compiled contract artifacts not found at contract/managed/battleship.\n' +
      '  Compile first — see COMPILE.md (GitHub Codespaces, ~15 min), commit,\n' +
      '  pull, then rerun this script.\n',
  );
  process.exit(1);
}

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

const seed = process.env['MN_SEED']?.trim();
if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
  console.error('✖ Set MN_SEED to a 64-char hex seed (any random 32 bytes).');
  process.exit(1);
}

// contract/index.ts is TypeScript — Node 24 strips types natively.
const { CompiledBattleshipContract, zkConfigPath } = await import(
  pathToFileURL(path.join(contractDir, 'index.ts')).href
);

async function main() {
  setNetworkId(config.networkId);

  const env = {
    walletNetworkId: config.networkId,
    networkId: config.networkId,
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    nodeWS: config.nodeWS,
    faucet: config.faucet,
    proofServer: config.proofServer,
  };

  const wallet = await MidnightWalletProvider.build(logger, env, { kind: 'seed', value: seed });
  await wallet.start();
  await syncWallet(logger, wallet.wallet);

  logger.info('Waiting for tNIGHT funds (faucet: %s)…', config.faucet);
  const night = await waitForFunds(wallet.wallet, env, false, wallet.unshieldedKeystore);
  logger.info(`tNIGHT balance: ${night} — DUST generation registered (accrues over time).`);

  const providers = buildProviders(wallet, zkConfigPath, config);

  // A fresh demo fleet + secrets. 17 distinct cells on the 10x10 board.
  const fleet = [0, 1, 2, 3, 4, 10, 11, 12, 13, 22, 23, 24, 34, 35, 36, 44, 45].map(BigInt);
  const privateState = {
    fleet,
    salt: randomBytes(32),
    sk: randomBytes(32),
  };

  logger.info('Deploying Phantom Fleet contract to preprod…');
  const deployed = await deployContract(providers, {
    compiledContract: CompiledBattleshipContract,
    privateStateId: 'phantomFleetPrivateState',
    initialPrivateState: privateState,
    args: fleet,
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log('\n⚓ PHANTOM FLEET DEPLOYED ON MIDNIGHT PREPROD');
  console.log(`   contract address: ${contractAddress}`);
  console.log(`   explorer:           ${config.explorer}/contract/${contractAddress}\n`);

  await wallet.stop();
}

main().catch((err) => {
  console.error('✖ Deploy failed:', err);
  process.exit(1);
});
