// Phantom Fleet — make one on-chain call against the deployed contract.
// SPDX-License-Identifier: MIT
//
// Usage:
//   MN_SEED=<64-hex> MN_CONTRACT=<address> MN_PROOF_SERVER=https://<...> node call-new-game.mjs
//
// What it proves: a real ZK-proven state transition on Midnight preprod —
// a second player joins the deployed game with a sealed 17-cell fleet
// (joinGame). Prints the tx id + explorer link for judges.

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pino from 'pino';
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import { PREPROD_CONFIG as config } from './config.mjs';
import { MidnightWalletProvider, syncWallet } from './wallet.mjs';
import { buildProviders } from './providers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const contractDir = path.resolve(here, '..', '..', 'contract');

if (!existsSync(path.join(contractDir, 'managed', 'battleship'))) {
  console.error('✖ Compiled artifacts missing — run COMPILE.md first.');
  process.exit(1);
}

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });

const seed = process.env['MN_SEED']?.trim();
const contractAddress = process.env['MN_CONTRACT']?.trim();
if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
  console.error('✖ Set MN_SEED (64-char hex). NOTE: this must be a DIFFERENT wallet from the deployer.');
  process.exit(1);
}
if (!contractAddress) {
  console.error('✖ Set MN_CONTRACT to the deployed contract address (from deploy-preprod.mjs output).');
  process.exit(1);
}

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

  const providers = buildProviders(wallet, zkConfigPath, config);
  providers.privateStateProvider.setContractAddress(contractAddress);

  // Player 2's fleet — also 17 distinct cells, sealed with THEIR salt.
  const fleet = [55, 56, 57, 58, 59, 66, 67, 68, 69, 77, 78, 79, 88, 89, 90, 98, 99].map(BigInt);
  await providers.privateStateProvider.set('phantomFleetPrivateState', {
    fleet,
    salt: randomBytes(32),
    sk: randomBytes(32),
  });

  logger.info('Calling joinGame on %s…', contractAddress);
  const txData = await submitCallTx(providers, {
    compiledContract: CompiledBattleshipContract,
    contractAddress,
    privateStateId: 'phantomFleetPrivateState',
    circuitId: 'joinGame',
    args: fleet,
  });

  const txId = txData?.public?.txId ?? JSON.stringify(txData?.public ?? txData);
  console.log('\n⚓ ON-CHAIN CALL CONFIRMED (joinGame, fleet sealed in ZK)');
  console.log(`   tx:       ${txId}`);
  console.log(`   explorer: ${config.explorer}/tx/${txId}\n`);

  await wallet.stop();
}

main().catch((err) => {
  console.error('✖ Call failed:', err);
  process.exit(1);
});
