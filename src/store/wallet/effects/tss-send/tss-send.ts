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
import {IsUtxoChain} from '../../utils/currency';
import {
  checkEncryptedKeysForEddsaMigration,
  sleep,
  toggleTSSModal,
} from '../../../../utils/helper-methods';
import {
  dismissDecryptPasswordModal,
  showDecryptPasswordModal,
} from '../../../../store/app/app.actions';
import {checkEncryptPassword} from '../../utils/wallet';
import {checkBiometricForSending} from '../send/send';

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
  return !!(
    key?.properties?.keychain?.privateKeyShare ||
    key?.properties?.keychain?.reducedPrivateKeyShare ||
    key?.properties?.keychain?.commonKeyChain
  );
};

export const requiresTSSSigning = (wallet: Wallet, key: Key): boolean => {
  return isTSSKey(key) && !!wallet.tssKeyId;
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

export const toBwsSignatureFormat = (sig: any, chain: string): string => {
  const CWC = BWC.getCore();
  const transformed = CWC.Transactions.transformSignatureObject({
    chain: chain.toUpperCase(),
    obj: sig,
  });
  logManager.debug(
    `[transformSignatureObject] ${chain} signature: ${transformed}`,
  );
  return transformed;
};

export const generateSessionId = (
  txp: TransactionProposal,
  derivationPath: string,
  i: number,
): string => {
  return `${txp.id}:${derivationPath.replace(/\//g, '-')}-input${i}`;
};

const signInput = async (params: {
  tssKey: any;
  wallet: Wallet;
  txp: TransactionProposal;
  messageHash: Buffer;
  derivationPath: string;
  sessionId: string;
  inputIndex: number;
  totalInputs: number;
  callbacks: TSSSigningCallbacks;
  timeout: number;
  password?: string | undefined;
}): Promise<string> => {
  const {
    tssKey,
    wallet,
    txp,
    messageHash,
    derivationPath,
    sessionId,
    inputIndex,
    totalInputs,
    callbacks,
    timeout,
    password,
  } = params;

  const tssSign = new TssSign({
    baseUrl: BASE_BWS_URL,
    credentials: wallet.credentials,
    tssKey: tssKey,
  });

  try {
    await tssSign.start({
      id: sessionId,
      messageHash,
      derivationPath,
      password,
    });
  } catch (startError: any) {
    if (startError.message?.startsWith('TSS_ROUND_ALREADY_DONE')) {
      const sig = await tssSign.getSignatureFromServer();
      if (sig) {
        logManager.debug(
          `[TSS Sign] Input ${inputIndex + 1} recovered from server`,
        );
        return toBwsSignatureFormat(sig, txp.chain);
      }
      throw new Error(
        'TSS session interrupted. Try deleting this proposal and creating a new one.',
      );
    }
    throw startError;
  }

  const signature = await new Promise<string>((resolveSign, rejectSign) => {
    let timeoutId: NodeJS.Timeout | null = null;

    timeoutId = setTimeout(() => {
      tssSign.unsubscribe();
      rejectSign(new Error(`Timeout signing input ${inputIndex + 1}`));
    }, timeout);

    tssSign
      .on('roundready', (round: number) => {
        logManager.debug(
          `[TSS Sign] Input ${inputIndex + 1} Round ${round} ready`,
        );
        callbacks.onRoundUpdate(round, 'ready');

        if (round === 1 && inputIndex === 0) {
          callbacks.onStatusChange('signature_generation');
        }

        callbacks.onProgressUpdate({
          currentRound: round,
          totalRounds: 4,
          status: 'processing',
        });
      })
      .on('roundprocessed', (round: number) => {
        logManager.debug(
          `[TSS Sign] Input ${inputIndex + 1} Round ${round} processed`,
        );
        callbacks.onRoundUpdate(round, 'processed');
      })
      .on('roundsubmitted', (round: number) => {
        logManager.debug(
          `[TSS Sign] Input ${inputIndex + 1} Round ${round} submitted`,
        );
        callbacks.onRoundUpdate(round, 'submitted');
      })
      .on('complete', () => {
        logManager.debug(`[TSS Sign] Input ${inputIndex + 1} complete`);
        try {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          const sig = tssSign.getSignature();
          logManager.debug(
            `[TSS Sign] Input ${inputIndex + 1} Signature from getSignature():`,
            sig,
          );

          const bwsSig = toBwsSignatureFormat(sig, txp.chain);
          resolveSign(bwsSig);
        } catch (err: any) {
          rejectSign(new Error(`Failed to convert signature: ${err.message}`));
        }
      })
      .on('error', (error: Error) => {
        logManager.error(
          `[TSS Sign] Input ${inputIndex + 1} Error: ${error.message}`,
        );
        rejectSign(error);
      });

    tssSign.subscribe();
  });

  tssSign.unsubscribe();
  logManager.debug(`[TSS Sign] Input ${inputIndex + 1} signed successfully`);

  return signature;
};

export const startTSSSigning =
  (opts: {
    key: Key;
    wallet: Wallet;
    txp: TransactionProposal;
    callbacks: TSSSigningCallbacks;
    timeout?: number;
    joiner?: boolean;
    password?: string | undefined;
  }): Effect<Promise<TransactionProposal>> =>
  async (dispatch, getState): Promise<TransactionProposal> => {
    const {
      key,
      wallet,
      txp,
      callbacks,
      timeout = 300000,
      joiner,
      password,
    } = opts;

    return new Promise(async (resolve, reject) => {
      try {
        logManager.debug('[TSS Sign] Starting TSS signing process');
        callbacks.onStatusChange('initializing');

        if (!isTSSKey(key)) {
          throw new Error('Key is not a TSS key');
        }

        const tssKey = restoreKeychain(key.methods);
        if (!tssKey) {
          throw new Error('TSS key methods not available');
        }

        const Bitcore = BWC.getBitcore();
        const CWC = BWC.getCore();
        const utils = BWC.getUtils();

        const chain = wallet.credentials.chain;
        const network = wallet.credentials.network;
        const isUtxo = IsUtxoChain(chain);

        const inputPaths =
          isUtxo && txp.inputPaths?.length ? txp.inputPaths : ['m/0/0'];

        const tx = utils.buildTx(txp);
        const txHex = tx.uncheckedSerialize();
        const rawTx = Array.isArray(txHex) ? txHex[0] : txHex;
        // TODO: need to remove for BCH
        // const SIGHASH_TYPE =
        //   Bitcore.crypto.Signature.SIGHASH_ALL |
        //   Bitcore.crypto.Signature.SIGHASH_FORKID;

        const xPubKey = new Bitcore.HDPublicKey(
          wallet.credentials.clientDerivedPublicKey,
        );

        logManager.debug(`[TSS Sign] Chain: ${chain}, isUtxo: ${isUtxo}`);
        logManager.debug(
          `[TSS Sign] Total inputs to sign: ${inputPaths.length}`,
        );

        callbacks.onStatusChange('waiting_for_cosigners');

        const signatures: string[] = [];

        for (let i = 0; i < inputPaths.length; i++) {
          const derivationPath = inputPaths[i];
          const pubKey = xPubKey
            .deriveChild(derivationPath)
            .publicKey.toString();

          logManager.debug(
            `[TSS Sign] Signing input ${i + 1}/${
              inputPaths.length
            } with path: ${derivationPath}`,
          );
          const sighashHex = CWC.Transactions.getSighash({
            chain,
            network,
            tx: rawTx,
            index: i,
            utxos: txp.inputs,
            pubKey,
            // sigtype: SIGHASH_TYPE,
          });
          const messageHash = Buffer.from(sighashHex, 'hex');
          const sessionId = generateSessionId(txp, derivationPath!, i + 1);
          logManager.debug(`Session ID for input ${i + 1}: ${sessionId}`);
          const signature = await signInput({
            tssKey,
            wallet,
            txp,
            messageHash,
            derivationPath: derivationPath!,
            sessionId,
            inputIndex: i,
            totalInputs: inputPaths.length,
            callbacks,
            timeout,
            password,
          });
          signatures.push(signature);
        }

        callbacks.onComplete(signatures[0]);
        callbacks.onStatusChange('broadcasting');

        logManager.debug(
          `[TSS Sign] All ${signatures.length} signature(s) collected, pushing to BWS`,
        );

        let signedTXP: TransactionProposal | null = null;
        if (!joiner) {
          signedTXP = await new Promise<TransactionProposal>(
            (resolvePush, rejectPush) => {
              wallet.pushSignatures(
                txp,
                signatures,
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

        logManager.debug('[TSS Sign] TSS signing completed successfully');
        callbacks.onStatusChange('complete');

        resolve(signedTXP ?? txp);
      } catch (err) {
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
    setShowTSSProgressModal: (show: boolean) => void;
  }): Effect<Promise<TransactionProposal>> =>
  async (dispatch, getState): Promise<TransactionProposal> => {
    const {APP} = getState();
    const {key, wallet, txp, callbacks, setShowTSSProgressModal} = opts;
    let password: string | undefined;

    if (APP.biometricLockActive) {
      try {
        await toggleTSSModal(setShowTSSProgressModal, false);
        await dispatch(checkBiometricForSending());
      } catch (error) {
        throw error;
      }
      await toggleTSSModal(setShowTSSProgressModal, true);
    }

    logManager.debug(`[TSS Join] Joining signing session for txp: ${txp.id}`);
    if (key.isPrivKeyEncrypted) {
      try {
        await toggleTSSModal(setShowTSSProgressModal, false);
        password = await new Promise<string>(async (_resolve, _reject) => {
          await sleep(500);
          dispatch(
            showDecryptPasswordModal({
              onSubmitHandler: async (_password: string) => {
                dispatch(dismissDecryptPasswordModal());
                await sleep(500);
                if (checkEncryptPassword(key, _password)) {
                  dispatch(checkEncryptedKeysForEddsaMigration(key, _password));
                  _resolve(_password);
                } else {
                  _reject('invalid password');
                }
              },
              onCancelHandler: () => {
                _reject('password canceled');
              },
            }),
          );
        });
      } catch (error) {
        throw error;
      }
      await toggleTSSModal(setShowTSSProgressModal, true);
    }
    // The joiner flow is the same as initiator - they both use startTSSSigning
    return dispatch(
      startTSSSigning({
        key,
        wallet,
        txp,
        callbacks,
        joiner: true,
        password,
      }),
    );
  };
