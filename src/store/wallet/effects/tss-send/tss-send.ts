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
import {broadcastTx, checkBiometricForSending, getTx} from '../send/send';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TSS_SESSION_PREFIX = 'TSS_SIGN_SESSION_';

// exportSession() returns "<sessionId>:<base64SignData>".
// If sessionId contains colons (e.g. "uuid:m-0-0-input1"), BWC's restoreSession
// does split(':') and takes only the first two parts, losing the sign data.
// To avoid this, we strip the sessionId prefix before saving and reconstruct
// with a colon-free placeholder on load so split(':') always yields [id, signData].
const extractSignData = (exported: string, sessionId: string): string => {
  const prefix = sessionId + ':';
  if (exported.startsWith(prefix)) {
    return exported.slice(prefix.length);
  }
  return exported;
};

// BWC's restoreSession does split(':') expecting "<id>:<base64SignData>".
// We pass a colon-free placeholder as id so the split always yields exactly
// [placeholder, signData]. After restore we override tssSign.id with the real
// sessionId so subscribe() contacts the correct BWS session.
const buildSessionForRestore = (signData: string): string => {
  return `placeholder:${signData}`;
};

const saveSigningSession = async (
  sessionId: string,
  exported: string,
  round: number,
): Promise<void> => {
  try {
    const key = TSS_SESSION_PREFIX + sessionId;
    const signData = extractSignData(exported, sessionId);
    await AsyncStorage.setItem(
      key,
      JSON.stringify({signData, round, savedAt: Date.now()}),
    );
    logManager.debug(
      `[TSS Persist] Session saved — sessionId: ${sessionId}, round: ${round}`,
    );
  } catch (e: any) {
    logManager.warn(`[TSS Persist] Failed to save session: ${e?.message}`);
  }
};

const loadSigningSession = async (
  sessionId: string,
): Promise<{exported: string; round: number} | null> => {
  try {
    const key = TSS_SESSION_PREFIX + sessionId;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    logManager.debug(
      `[TSS Persist] Found saved session — sessionId: ${sessionId}, round: ${
        parsed.round
      }, savedAt: ${new Date(parsed.savedAt).toISOString()}`,
    );
    return {
      exported: buildSessionForRestore(parsed.signData),
      round: parsed.round,
    };
  } catch (e: any) {
    logManager.warn(`[TSS Persist] Failed to load session: ${e?.message}`);
    return null;
  }
};

const clearSigningSession = async (sessionId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TSS_SESSION_PREFIX + sessionId);
  } catch (e: any) {
    logManager.warn(`[TSS Persist] Failed to clear session: ${e?.message}`);
  }
};

const BWC = BwcProvider.getInstance();
const TssSign = BWC.getTssSign();

export interface TSSSigningCallbacks {
  onStatusChange: (status: TSSSigningStatus) => void | Promise<void>;
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

export const isTSSWallet = (wallet: Wallet): boolean => {
  return !!wallet.tssKeyId;
};

export const isTSSKey = (key: Key): boolean => {
  return !!key?.wallets?.some(wallet => wallet.tssKeyId) && !key.isReadOnly;
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
  callbacks: TSSSigningCallbacks;
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
    callbacks,
    password,
  } = params;

  const tssSign = new TssSign({
    baseUrl: BASE_BWS_URL,
    credentials: wallet.credentials,
    tssKey: tssKey,
  });

  logManager.debug(
    `[TSS Sign] signInput — sessionId: ${sessionId}, inputIndex: ${inputIndex}`,
  );

  // Check for a previously saved session (e.g. app was closed mid-signing)
  const savedSession = await loadSigningSession(sessionId);

  const signature = await new Promise<string>(
    async (resolveSign, rejectSign) => {
      tssSign.on('copayerReady', (copayerId: string) => {
        logManager.debug(`[TSS Sign] Copayer ready: ${copayerId}`);
        callbacks.onCopayerStatusChange(copayerId, 'signed');
      });

      if (savedSession) {
        logManager.debug(
          `[TSS Sign] Restoring saved session — sessionId: ${sessionId}, lastRound: ${savedSession.round}`,
        );
        try {
          await tssSign.restoreSession({session: savedSession.exported});
          tssSign.id = sessionId;
          logManager.debug(
            `[TSS Sign] Session restored successfully — resuming from round ${savedSession.round}`,
          );
          callbacks.onStatusChange('signature_generation');
        } catch (restoreError: any) {
          logManager.warn(
            `[TSS Sign] Failed to restore session, falling back to start() — error: ${restoreError?.message}`,
          );
          await clearSigningSession(sessionId);
          try {
            await tssSign.start({
              id: sessionId,
              messageHash,
              derivationPath,
              password,
            });
          } catch (startError: any) {
            tssSign.unsubscribe();
            const errorMsg = startError?.message || '';
            logManager.error(
              `[TSS Sign] start() error after restore failure — error: ${errorMsg}`,
            );
            if (
              errorMsg.startsWith('TSS_ROUND_ALREADY_DONE') ||
              errorMsg.startsWith('TSS_ROUND_MESSAGE_EXISTS')
            ) {
              const sig = await tssSign.getSignatureFromServer();
              if (sig) {
                resolveSign(toBwsSignatureFormat(sig, txp.chain));
                return;
              }
            }
            rejectSign(
              new Error(
                'TSS session interrupted. Try deleting this proposal and creating a new one.',
              ),
            );
            return;
          }
        }
      } else {
        try {
          await tssSign.start({
            id: sessionId,
            messageHash,
            derivationPath,
            password,
          });
          try {
            const exported = tssSign.exportSession();
            await saveSigningSession(sessionId, exported, 0);
          } catch (exportErr: any) {
            logManager.warn(
              `[TSS Persist] Could not export after start(): ${exportErr?.message}`,
            );
          }
        } catch (startError: any) {
          tssSign.unsubscribe();
          const errorMsg = startError?.message || '';
          logManager.error(
            `[TSS Sign] start() error — sessionId: ${sessionId}, error: ${errorMsg}`,
          );
          if (
            errorMsg.startsWith('TSS_ROUND_ALREADY_DONE') ||
            errorMsg.startsWith('TSS_ROUND_MESSAGE_EXISTS')
          ) {
            // 1) Try to get the completed signature from server
            const sig = await tssSign.getSignatureFromServer();
            if (sig) {
              logManager.debug(
                `[TSS Sign] Input ${inputIndex + 1} recovered from server`,
              );
              resolveSign(toBwsSignatureFormat(sig, txp.chain));
              return;
            }
            // 2) Signature not complete — try to restore saved session and re-subscribe
            const savedForRetry = await loadSigningSession(sessionId);
            if (savedForRetry) {
              try {
                await tssSign.restoreSession({session: savedForRetry.exported});
                tssSign.id = sessionId;
                logManager.debug(
                  `[TSS Sign] Session restored, re-registering listeners and subscribing`,
                );
              } catch (restoreErr: any) {
                logManager.warn(
                  `[TSS Sign] Restore failed after ROUND_MESSAGE_EXISTS: ${restoreErr?.message}`,
                );
                await clearSigningSession(sessionId);
                rejectSign(
                  new Error(
                    'TSS session interrupted. Try deleting this proposal and creating a new one.',
                  ),
                );
                return;
              }
            } else {
              rejectSign(
                new Error(
                  'TSS session interrupted. Try deleting this proposal and creating a new one.',
                ),
              );
              return;
            }
          } else {
            rejectSign(startError);
            return;
          }
        }
      }

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

          // Persist after roundprocessed (before submission attempt) so that if the
          // app closes or submission fails, we have the post-computation state saved.
          // This gives the best chance of restoring from the correct round on next open.
          try {
            const exported = tssSign.exportSession();
            saveSigningSession(sessionId, exported, round);
          } catch (exportErr: any) {
            logManager.debug(
              `[TSS Sign] exportSession skipped at roundprocessed: ${exportErr?.message}`,
            );
          }
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
            const sig = tssSign.getSignature();
            logManager.debug(
              `[TSS Sign] Input ${
                inputIndex + 1
              } Signature from getSignature():`,
              sig ? JSON.stringify(sig) : null,
            );

            clearSigningSession(sessionId);
            const bwsSig = toBwsSignatureFormat(sig, txp.chain);
            resolveSign(bwsSig);
          } catch (err: any) {
            rejectSign(
              new Error(`Failed to convert signature: ${err.message}`),
            );
          }
        })
        .on('error', async (error: Error) => {
          logManager.error(
            `[TSS Sign] Input ${inputIndex + 1} Error: ${error.message}`,
          );

          const errorMsg = error.message || '';
          if (
            errorMsg.startsWith('TSS_ROUND_ALREADY_DONE') ||
            errorMsg.startsWith('TSS_ROUND_MESSAGE_EXISTS')
          ) {
            // The server already has this round (duplicate submission or race condition).
            // The local DKLS computation may still be running and could complete — do NOT
            // reject here. Try to recover from server; if not ready, let the flow continue.
            const sig = await tssSign.getSignatureFromServer();
            if (sig) {
              logManager.debug(
                `[TSS Sign] Recovered signature from server after error event`,
              );
              tssSign.unsubscribe();
              clearSigningSession(sessionId);
              resolveSign(toBwsSignatureFormat(sig, txp.chain));
            }
            return;
          }

          tssSign.unsubscribe();
          clearSigningSession(sessionId);
          rejectSign(error);
        });

      tssSign.subscribe();
    },
  );

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
    password?: string | undefined;
  }): Effect<Promise<TransactionProposal>> =>
  async (dispatch, getState): Promise<TransactionProposal> => {
    const {key, wallet, txp, callbacks, password} = opts;

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
            callbacks,
            password,
          });
          signatures.push(signature);
        }

        callbacks.onComplete(signatures[0]);
        callbacks.onStatusChange('broadcasting');

        logManager.debug(
          `[TSS Sign] All ${signatures.length} signature(s) collected, pushing to BWS`,
        );

        // All signing participants push signatures — not just the creator.
        // This handles the case where a read-only wallet creates the txp
        // and the actual signers (who are not the creator) must push.
        // ignore errors here
        let signedTXP: TransactionProposal | null = null;
        try {
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
        } catch (error) {
          logManager.error(
            `[TSS Sign] Error pushing signatures: ${
              error instanceof Error ? error.message : JSON.stringify(error)
            }`,
          );
        }

        logManager.debug('[TSS Sign] TSS signing completed successfully');

        resolve(signedTXP ?? txp);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`[TSS Sign] Error: ${errorStr}`);
        reject(err);
      }
    });
  };

export const pollTxpUntilBroadcast = async (
  wallet: Wallet,
  txpId: string,
): Promise<TransactionProposal> => {
  const delays = [0, 1000, 2000, 3000, 5000, 5000, 5000];
  for (const delay of delays) {
    await sleep(delay);
    try {
      const updatedTxp = await getTx(wallet, txpId);
      if (updatedTxp.status === 'broadcasted') {
        return updatedTxp;
      }
    } catch (_) {}
  }
  throw new Error(
    'It seems there was a problem broadcasting the transaction. Please try creating a new one.',
  );
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
    // Both creator and joiner use startTSSSigning.
    try {
      const signedTx = await dispatch(
        startTSSSigning({
          key,
          wallet,
          txp,
          callbacks,
          password,
        }),
      );
      try {
        const broadcastedTx = await broadcastTx(wallet, signedTx);
        logManager.debug('[TSS Join] Broadcast complete');
        await callbacks.onStatusChange('complete');
        return broadcastedTx as TransactionProposal;
      } catch (_) {
        // Another participant may have broadcasted already — poll for it.
        logManager.debug(
          '[TSS Join] Broadcast failed, polling for broadcasted status',
        );
        const broadcastedTxp = await pollTxpUntilBroadcast(wallet, txp.id);
        await callbacks.onStatusChange('complete');
        return broadcastedTxp;
      }
    } catch (err) {
      callbacks.onStatusChange('error');
      throw err;
    }
  };
