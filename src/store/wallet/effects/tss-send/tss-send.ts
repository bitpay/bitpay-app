import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import {
  Key,
  TransactionProposal,
  Wallet,
  TSSSigningStatus,
  TSSSigningProgress,
  TSSCopayerSignStatus,
} from '../../wallet.models';
import {logManager} from '../../../../managers/LogManager';
import {BASE_BWS_URL} from '../../../../constants/config';
import {utils as ethersUtils} from 'ethers';

const BWC = BwcProvider.getInstance();

const {TssSign} = require('bitcore-wallet-client/ts_build/src/lib/tsssign');

export interface TSSSigningCallbacks {
  onStatusChange: (status: TSSSigningStatus) => void;
  onProgressUpdate: (progress: TSSSigningProgress) => void;
  onCopayerStatusChange: (
    copayerId: string,
    status: TSSCopayerSignStatus,
  ) => void;
  onRoundUpdate: (
    round: number,
    type: 'ready' | 'processed' | 'submitted',
  ) => void;
  onError: (error: Error) => void;
  onComplete: (signature: string) => void;
}

export const isTSSKey = (key: Key): boolean => {
  return !!(key.tssSession?.status === 'complete' && key.tssSession?.n > 1);
};

export const requiresTSSSigning = (wallet: Wallet, key: Key): boolean => {
  return isTSSKey(key) && !!wallet.tssKeyId;
};

export const toBwsSignatureFormat = (sig: any, chain: string): string => {
  const strip0x = (h: string) => (h?.startsWith('0x') ? h.slice(2) : h);
  const pad32 = (h: string) => strip0x(h).padStart(64, '0');

  if (!sig) throw new Error('Missing signature');

  if (typeof sig === 'string') {
    const hex = strip0x(sig);
    if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('Signature is not hex');
    return '0x' + hex;
  }

  const isEvm = ['eth', 'matic', 'arb', 'base', 'op'].includes(
    (chain || '').toLowerCase(),
  );
  if (!isEvm) {
    throw new Error(`Unsupported chain for this helper: ${chain}`);
  }

  const r = pad32(sig.r);
  const s = pad32(sig.s);

  let v = Number(sig.v);
  if (v === 0 || v === 1) {
    v = v + 27;
  }
  const vHex = v.toString(16).padStart(2, '0');

  return `0x${r}${s}${vHex}`;
};

export const getTxpMessageHash = (
  wallet: Wallet,
  txp: TransactionProposal,
): Buffer => {
  const Bitcore = BWC.getBitcore();
  const utils = BWC.getUtils();

  const tx = utils.buildTx(txp);

  if (['btc', 'bch', 'ltc', 'doge'].includes(txp.chain?.toLowerCase())) {
    const sighash = tx.inputs[0].getSighash(
      tx,
      Bitcore.crypto.Signature.SIGHASH_ALL,
    );
    return sighash;
  } else if (
    ['eth', 'matic', 'arb', 'base', 'op'].includes(txp.chain?.toLowerCase())
  ) {
    const serialized = tx.uncheckedSerialize()[0];
    const hexString = serialized.startsWith('0x')
      ? serialized.slice(2)
      : serialized;

    const txBuffer = Buffer.from(hexString, 'hex');

    const hashHex = ethersUtils.keccak256('0x' + txBuffer.toString('hex'));
    const hash = Buffer.from(hashHex.slice(2), 'hex');

    logManager.debug(
      `[getTxpMessageHash] Keccak256 hash: ${hash.toString('hex')}`,
    );

    return hash;
  } else {
    const serialized = tx.uncheckedSerialize()[0];
    const hexString = serialized.startsWith('0x')
      ? serialized.slice(2)
      : serialized;
    const txBuffer = Buffer.from(hexString, 'hex');
    return Bitcore.crypto.Hash.sha256(txBuffer);
  }
};

export const getDerivationPath = (
  wallet: Wallet,
  txp: TransactionProposal,
): string => {
  // TSS uses simple paths, not full BIP44 paths
  return 'm/0/0';
};

export const generateSessionId = (txp: TransactionProposal): string => {
  return `sign-${txp.id}`;
};

const restoreKeychain = (tssKey: any): any => {
  if (!tssKey?.keychain) return tssKey;

  const keychain = tssKey.keychain;

  if (keychain.privateKeyShare && !Buffer.isBuffer(keychain.privateKeyShare)) {
    const data = keychain.privateKeyShare.data;
    if (Array.isArray(data)) {
      keychain.privateKeyShare = Buffer.from(data);
    }
  }

  if (
    keychain.reducedPrivateKeyShare &&
    !Buffer.isBuffer(keychain.reducedPrivateKeyShare)
  ) {
    const data = keychain.reducedPrivateKeyShare.data;
    if (Array.isArray(data)) {
      keychain.reducedPrivateKeyShare = Buffer.from(data);
    }
  }

  return tssKey;
};

export const startTSSSigning =
  (opts: {
    key: Key;
    wallet: Wallet;
    txp: TransactionProposal;
    callbacks: TSSSigningCallbacks;
    timeout?: number;
    joiner?: boolean;
  }): Effect<Promise<TransactionProposal>> =>
  async (dispatch, getState): Promise<TransactionProposal> => {
    const {key, wallet, txp, callbacks, timeout = 300000, joiner} = opts;

    return new Promise(async (resolve, reject) => {
      let tssSign: any = null;
      let timeoutId: NodeJS.Timeout | null = null;

      try {
        logManager.debug('[TSS Sign] Starting TSS signing process');
        callbacks.onStatusChange('initializing');

        if (!isTSSKey(key)) {
          throw new Error('Key is not a TSS key');
        }

        const tssKey = restoreKeychain(key.methods);

        logManager.debug(
          `[TSS Sign] privateKeyShare isBuffer: ${Buffer.isBuffer(
            tssKey?.keychain?.privateKeyShare,
          )}`,
        );
        logManager.debug(
          `[TSS Sign] privateKeyShare length: ${tssKey?.keychain?.privateKeyShare?.length}`,
        );

        if (!tssKey) {
          throw new Error('TSS key methods not available');
        }

        const messageHash = getTxpMessageHash(wallet, txp);
        const derivationPath = getDerivationPath(wallet, txp);

        logManager.debug(
          `[TSS Sign] Message hash: ${messageHash.toString('hex')}`,
        );
        logManager.debug(`[TSS Sign] Derivation path: ${derivationPath}`);

        tssSign = new TssSign({
          baseUrl: BASE_BWS_URL,
          credentials: wallet.credentials,
          tssKey: tssKey,
        });

        const sessionId = generateSessionId(txp);
        logManager.debug(`[TSS Sign] Session ID: ${sessionId}`);

        callbacks.onStatusChange('waiting_for_cosigners');

        try {
          await tssSign.start({
            id: sessionId,
            messageHash,
            derivationPath,
          });
          logManager.debug('[TSS Sign] Signing session started successfully');
        } catch (startError: any) {
          logManager.warn(
            `[TSS Sign] Initial start warning: ${startError.message}`,
          );
        }

        logManager.debug('[TSS Sign] Waiting for co-signers...');

        timeoutId = setTimeout(() => {
          if (tssSign) {
            tssSign.unsubscribe();
          }
          reject(
            new Error(
              'TSS signing timeout - co-signers did not respond in time',
            ),
          );
        }, timeout);

        const signPromise = new Promise<string>((resolveSign, rejectSign) => {
          tssSign
            .on('roundready', (round: number) => {
              logManager.debug(`[TSS Sign] Round ${round} ready`);
              callbacks.onRoundUpdate(round, 'ready');

              if (round === 1) {
                callbacks.onStatusChange('signature_generation');
              }

              callbacks.onProgressUpdate({
                currentRound: round,
                totalRounds: 4,
                status: 'processing',
              });
            })
            .on('roundprocessed', (round: number) => {
              logManager.debug(`[TSS Sign] Round ${round} processed`);
              callbacks.onRoundUpdate(round, 'processed');
            })
            .on('roundsubmitted', (round: number) => {
              logManager.debug(`[TSS Sign] Round ${round} submitted`);
              callbacks.onRoundUpdate(round, 'submitted');
            })
            // TODO BWC
            // .on('copayersigned', (copayerId: string) => {
            //   logManager.debug(`[TSS Sign] Copayer signed: ${copayerId}`);
            //   callbacks.onCopayerStatusChange(copayerId, 'signed');
            // })
            .on('signature', signature => {
              logManager.debug(`[TSS Sign] Signature received`);
              try {
                const bwsSig = toBwsSignatureFormat(signature, txp.chain);
                resolveSign(bwsSig);
              } catch (err) {
                rejectSign(
                  new Error(
                    `Failed to convert/verify signature: ${err.message}`,
                  ),
                );
              }
            })
            .on('complete', () => {
              logManager.debug('[TSS Sign] Signing complete');
            })
            .on('error', (error: Error) => {
              logManager.error(`[TSS Sign] Error: ${error.message}`);
              rejectSign(error);
            });

          tssSign.subscribe({
            timeout: 250,
          });
        });

        const signature = await signPromise;

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        callbacks.onComplete(signature);
        callbacks.onStatusChange('broadcasting');

        logManager.debug('[TSS Sign] Pushing signature to txp');

        let signedTXP: TransactionProposal | null = null;
        if (!joiner) {
          signedTXP = await new Promise<TransactionProposal>(
            (resolvePush, rejectPush) => {
              wallet.pushSignatures(
                txp,
                [signature],
                (err: Error, result: TransactionProposal) => {
                  if (err) {
                    rejectPush(err);
                  } else {
                    resolvePush(result);
                  }
                },
                null,
              );
            },
          );
        }

        if (tssSign) {
          tssSign.unsubscribe();
        }

        logManager.debug('[TSS Sign] TSS signing completed successfully');
        callbacks.onStatusChange('complete');

        resolve(signedTXP ?? txp);
      } catch (err) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (tssSign) {
          try {
            tssSign.unsubscribe();
          } catch (e) {}
        }
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`[TSS Sign] Error: ${errorStr}`);
        callbacks.onError(err instanceof Error ? err : new Error(errorStr));
        reject(err);
      }
    });
  };

export const joinTSSSigningSession =
  (opts: {
    key: Key;
    wallet: Wallet;
    txp: TransactionProposal;
    callbacks: TSSSigningCallbacks;
  }): Effect<Promise<TransactionProposal>> =>
  async (dispatch, getState): Promise<TransactionProposal> => {
    const {key, wallet, txp, callbacks} = opts;

    logManager.debug(`[TSS Join] Joining signing session for txp: ${txp.id}`);

    // The joiner flow is the same as initiator - they both use startTSSSigning
    // with the same deterministic sessionId
    return dispatch(
      startTSSSigning({
        key,
        wallet,
        txp,
        callbacks,
        joiner: true,
      }),
    );
  };
