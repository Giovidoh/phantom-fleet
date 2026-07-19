// Phantom Fleet — headless Midnight wallet (plain-JS port of the official
// midnightntwrk/example-battleship src/wallet.ts pattern).
// SPDX-License-Identifier: MIT

import {
  DustSecretKey,
  LedgerParameters,
  ZswapSecretKeys,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { FluentWalletBuilder } from '@midnight-ntwrk/testkit-js';
import * as Rx from 'rxjs';

export class MidnightWalletProvider {
  constructor(logger, wallet, zswapSecretKeys, dustSecretKey, unshieldedKeystore) {
    this.logger = logger;
    this.wallet = wallet;
    this.zswapSecretKeys = zswapSecretKeys;
    this.dustSecretKey = dustSecretKey;
    this.unshieldedKeystore = unshieldedKeystore;
  }

  getCoinPublicKey() {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey() {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(tx, ttl = ttlOneHour()) {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl },
    );
    return await this.wallet.finalizeRecipe(recipe);
  }

  submitTx(tx) {
    return this.wallet.submitTransaction(tx);
  }

  async start() {
    this.logger.info('Starting wallet…');
    await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
  }

  async stop() {
    return this.wallet.stop();
  }

  // secret: { kind: 'seed', value: '<64-hex chars>' } | { kind: 'mnemonic', value: '…' }
  static async build(logger, env, secret) {
    const dustOptions = {
      ledgerParams: LedgerParameters.initialParameters(),
      // Lowered overhead — required on remote networks (per official example).
      additionalFeeOverhead: 1_000n,
      feeBlocksMargin: 5,
    };

    const base = FluentWalletBuilder.forEnvironment(env).withDustOptions(dustOptions);
    const builder =
      secret.kind === 'mnemonic' ? base.withMnemonic(secret.value) : base.withSeed(secret.value);

    const { wallet, seeds, keystore } = await builder.buildWithoutStarting();
    logger.info(`Wallet built from ${secret.kind}; master seed: ${seeds.masterSeed.slice(0, 8)}…`);

    return new MidnightWalletProvider(
      logger,
      wallet,
      ZswapSecretKeys.fromSeed(seeds.shielded),
      DustSecretKey.fromSeed(seeds.dust),
      keystore,
    );
  }
}

function complete(progress) {
  return (
    progress &&
    typeof progress === 'object' &&
    typeof progress.isStrictlyComplete === 'function' &&
    progress.isStrictlyComplete()
  );
}

export async function syncWallet(logger, wallet, timeout = 3_600_000) {
  logger.info('Syncing wallet (can take a while on preprod)…');
  return Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.filter(
        (state) =>
          complete(state.shielded.state.progress) &&
          complete(state.dust.state.progress) &&
          complete(state.unshielded.progress),
      ),
      Rx.tap(() => logger.info('Wallet sync complete.')),
      Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms`)),
      }),
    ),
  );
}
