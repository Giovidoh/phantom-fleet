// Phantom Fleet — Midnight network configuration (preprod).
// SPDX-License-Identifier: MIT

export const PREPROD_CONFIG = {
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  // No public proof server exists for dApps. Point MN_PROOF_SERVER at your own:
  // a cloud-hosted midnightntwrk/proof-server (Railway/Render from its
  // Dockerfile — see scripts/midnight/README.md, option B).
  proofServer: process.env['MN_PROOF_SERVER'] ?? 'http://127.0.0.1:6300',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  explorer: 'https://preprod.midnightexplorer.com',
};
