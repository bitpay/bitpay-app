import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {
  buildKeyObj,
  buildTssKeyObj,
  buildWalletObj,
  mapAbbreviationAndName,
} from '../../utils/wallet';
import {
  successCreateKey,
  successAddWallet,
  successUpdateKey,
  setPendingJoinerSession,
  removePendingJoinerSession,
} from '../../wallet.actions';
import {
  JoinerSessionId,
  Key,
  KeyOptions,
  PendingJoinerSession,
  TSSCopayerInfo,
  Wallet,
} from '../../wallet.models';
import {createWalletWithOpts} from '../create/create';
import {
  subscribePushNotifications,
  subscribeEmailNotifications,
} from '../../../app/app.effects';
import {logManager} from '../../../../managers/LogManager';
import {BASE_BWS_URL} from '../../../../constants/config';
import {Network} from '../../../../constants';
import {setHomeCarouselConfig} from '../../../../store/app/app.actions';
import {createWalletAddress} from '../address/address';
import {BitpaySupportedCoins} from '../../../../constants/currencies';

const BWC = BwcProvider.getInstance();

// Tracks active tssKeyGen instances by keyId to prevent duplicate subscriptions
// and allow cancellation when navigating away from ceremony screens.
const activeCeremonies = new Map<string, any>();

interface CeremonyStats {
  sessionId: string;
  startedAt: number;
  swallowedErrors: number;
  roundsReady: number;
  roundsSubmitted: number;
}
const ceremonyStats = new Map<string, CeremonyStats>();

const initCeremonyStats = (keyId: string, sessionId: string) => {
  ceremonyStats.set(keyId, {
    sessionId,
    startedAt: Date.now(),
    swallowedErrors: 0,
    roundsReady: 0,
    roundsSubmitted: 0,
  });
};

const logCeremonyStats = (keyId: string, label: string) => {
  const stats = ceremonyStats.get(keyId);
  if (!stats) {
    return;
  }
  const elapsedSec = Math.round((Date.now() - stats.startedAt) / 1000);
  // Each poll tick fires a GET to /v1/tss/keygen/{id}/{round} every ~1s.
  // Approximate total GET requests as elapsed seconds; POST requests equal roundsSubmitted.
  const approxGetRequests = elapsedSec;
  logManager.info(
    `[TSS Stats] ${label} | keyId=${keyId} sessionId=${stats.sessionId}` +
      ` | elapsed=${elapsedSec}s approxGETs=${approxGetRequests} POSTs=${stats.roundsSubmitted}` +
      ` | roundsReady=${stats.roundsReady} swallowedErrors=${stats.swallowedErrors}`,
  );
};

const clearCeremonyStats = (keyId: string) => {
  ceremonyStats.delete(keyId);
};

export const cancelTSSCeremony =
  (keyId: string): Effect<void> =>
  () => {
    const tssKeyGen = activeCeremonies.get(keyId);
    if (tssKeyGen) {
      logManager.info(
        `[TSS] cancelTSSCeremony: stopping interval for keyId=${keyId} | active=${activeCeremonies.size}`,
      );
      logCeremonyStats(keyId, 'cancelled');
      tssKeyGen.unsubscribe();
      activeCeremonies.delete(keyId);
      clearCeremonyStats(keyId);
      logManager.info(
        `[TSS] cancelTSSCeremony: done | active=${activeCeremonies.size}`,
      );
    } else {
      logManager.debug(
        `[TSS] cancelTSSCeremony: no active ceremony for keyId=${keyId} (already done or never started)`,
      );
    }
  };

export const startCreateKeyMultisig =
  (opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
          WALLET: {keys},
        } = getState();

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const _wallet = await dispatch(createWalletWithOpts({key: _key, opts}));

        // subscribe new wallet to push notifications
        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(_wallet, brazeEid!));
        }
        // subscribe new wallet to email notifications
        if (
          emailNotifications &&
          emailNotifications.accepted &&
          emailNotifications.email
        ) {
          const prefs = {
            email: emailNotifications.email,
            language: defaultLanguage,
            unit: 'btc', // deprecated
          };
          dispatch(subscribeEmailNotifications(_wallet, prefs));
        }

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(
            _wallet.credentials.coin,
            _wallet.credentials.chain,
            _wallet.credentials.token?.address,
          ),
        );

        // build out app specific props
        const wallet = merge(
          _wallet,
          buildWalletObj({
            ..._wallet.credentials,
            currencyAbbreviation,
            currencyName,
          } as any),
        ) as Wallet;

        const key = buildKeyObj({key: _key, wallets: [wallet]});
        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        reject(err);
      }
    });
  };

export const addWalletMultisig =
  ({key, opts}: {key: Key; opts: Partial<KeyOptions>}): Effect =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
        } = getState();
        const newWallet = (await dispatch(
          createWalletWithOpts({
            key: key.methods!,
            opts,
          }),
        )) as Wallet;

        // subscribe new wallet to push notifications
        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(newWallet, brazeEid!));
        }
        // subscribe new wallet to email notifications
        if (
          emailNotifications &&
          emailNotifications.accepted &&
          emailNotifications.email
        ) {
          const prefs = {
            email: emailNotifications.email,
            language: defaultLanguage,
            unit: 'btc', // deprecated
          };
          dispatch(subscribeEmailNotifications(newWallet, prefs));
        }

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(
            newWallet.credentials.coin,
            newWallet.credentials.chain,
            newWallet.credentials.token?.address,
          ),
        );

        key.wallets.push(
          merge(
            newWallet,
            buildWalletObj({
              ...newWallet.credentials,
              currencyAbbreviation,
              currencyName,
            } as any),
          ) as Wallet,
        );

        dispatch(successAddWallet({key}));

        resolve(newWallet);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`Error adding multisig wallet: ${errorStr}`);
        reject(err);
      }
    });
  };

export const encodeJoinerSessionId = (data: JoinerSessionId): string => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

export const decodeJoinerSessionId = (code: string): JoinerSessionId => {
  return JSON.parse(Buffer.from(code, 'base64').toString('utf8'));
};

const getPubKeyFromKey = (partyKey: any): string => {
  const credentials = partyKey.createCredentials(null, {
    chain: 'BTC', // Doesn't matter for requestPubKey
    network: 'livenet',
    account: 0,
    n: 1,
  });
  return credentials.requestPubKey;
};

export const startCreateTSSKey =
  (opts: {
    coin: string;
    chain: string;
    network: string;
    m: number;
    n: number;
    password?: string;
    myName: string;
    walletName: string;
  }): Effect<Promise<{key: Key}>> =>
  async (dispatch, getState): Promise<{key: Key}> => {
    try {
      const {
        coin,
        chain: _chain,
        network,
        m,
        n,
        password,
        walletName,
        myName,
      } = opts;
      const chain = _chain === 'pol' ? 'matic' : _chain.toLowerCase(); // for creating a polygon wallet, we use matic as symbol
      const {
        WALLET: {tokenOptionsByAddress},
      } = getState();

      const partyKey = BWC.createKey({seedType: 'new'});
      logManager.debug('[TSS] Created party key for creator');

      const tssKeyGen = BWC.createKeyGen({
        coin,
        chain,
        network: network as Network,
        baseUrl: BASE_BWS_URL,
        key: partyKey,
      });

      logManager.info('[TSS] POST /v1/tss/keygen — newKey() start');
      const _newKeyStart = Date.now();
      await tssKeyGen.newKey({
        m: m,
        n: n,
        password: password,
      });

      const sessionId = tssKeyGen.id;
      const sessionExport = tssKeyGen.exportSession();
      logManager.info(
        `[TSS] POST /v1/tss/keygen — newKey() done in ${
          Date.now() - _newKeyStart
        }ms | sessionId=${sessionId}`,
      );

      const {currencyAbbreviation, currencyName} = dispatch(
        mapAbbreviationAndName(coin, chain, undefined),
      );

      const walletClient = BWC.getClient();
      const credentials = partyKey.createCredentials(null, {
        coin,
        chain,
        network,
        n: 1, // TODO: review if this should be opts.n
        account: 0,
      });
      walletClient.fromObj(credentials);

      const placeholderWallet = merge(
        walletClient,
        buildWalletObj(
          {
            ...walletClient.credentials,
            currencyAbbreviation,
            currencyName,
            tssMetadata: {id: sessionId, m, n, partyId: 0},
          } as any,
          tokenOptionsByAddress,
        ),
      ) as Wallet;

      placeholderWallet.pendingTssSession = true;

      const key = buildKeyObj({
        key: partyKey,
        wallets: [placeholderWallet],
        keyName: 'My TSSKey',
        backupComplete: false,
      });

      placeholderWallet.id = `pending-tss-${key.id}-${chain}`;

      const copayers: TSSCopayerInfo[] = [];
      for (let i = 1; i < n; i++) {
        copayers.push({
          partyId: i,
          pubKey: '',
          name: `Co-Signer ${i}`,
          status: 'pending',
        });
      }

      key.tssSession = {
        id: sessionId,
        partyKey: partyKey.toObj(),
        sessionExport,
        coin,
        chain,
        network,
        m,
        n,
        password,
        myName,
        walletName,
        createdAt: Date.now(),
        isCreator: true,
        partyId: 0,
        status: 'collecting_copayers',
        copayers,
        creatorPubKey: credentials.requestPubKey,
      };

      dispatch(successCreateKey({key}));
      dispatch(setHomeCarouselConfig({id: key.id, show: true}));

      logManager.debug(`[TSS] Creator key saved with session ID: ${sessionId}`);

      return {key};
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`Error creating TSS key: ${errorStr}`);
      throw err;
    }
  };

export const addCoSignerToTSS =
  (opts: {
    keyId: string;
    joinerSessionId: string;
    partyId: number;
  }): Effect<Promise<{joinCode: string}>> =>
  async (dispatch, getState): Promise<{joinCode: string}> => {
    try {
      const {WALLET} = getState();
      const key = WALLET.keys[opts.keyId];

      if (!key?.tssSession) {
        throw new Error('Key not found or no TSS session');
      }

      if (!key.tssSession.isCreator) {
        throw new Error('Only creator can add co-signers');
      }

      const joinerData = decodeJoinerSessionId(opts.joinerSessionId);
      logManager.debug(`[TSS] Adding co-signer party ${opts.partyId}`);

      const existingCopayers = key.tssSession.copayers || [];
      const isDuplicate = existingCopayers.some(
        c => c.status === 'invited' && c.pubKey === joinerData.pubKey,
      );
      if (isDuplicate) {
        throw new Error('This co-signer has already been invited');
      }

      const partyKey = BWC.createKey({
        seedType: 'object',
        seedData: key.tssSession.partyKey,
      });

      const tssKeyGen = BWC.createKeyGen({
        coin: key.tssSession.coin,
        chain: key.tssSession.chain,
        network: key.tssSession.network,
        baseUrl: BASE_BWS_URL,
        key: partyKey,
      });

      await tssKeyGen.restoreSession({session: key.tssSession.sessionExport});
      logManager.debug(`[TSS] Session restored with ID: ${tssKeyGen.id}`);

      const joinCode = tssKeyGen.createJoinCode({
        partyId: opts.partyId,
        partyPubKey: joinerData.pubKey,
        opts: {encoding: 'base64'},
      });

      logManager.debug(`[TSS] Created joinCode for party ${opts.partyId}`);

      const updatedCopayers = [...(key.tssSession.copayers || [])];
      const copayerIndex = updatedCopayers.findIndex(
        c => c.partyId === opts.partyId,
      );

      if (copayerIndex >= 0) {
        updatedCopayers[copayerIndex] = {
          ...updatedCopayers[copayerIndex],
          pubKey: joinerData.pubKey,
          name: joinerData.name || `Co-Signer ${opts.partyId}`,
          joinCode,
          status: 'invited',
        };
      }

      const allInvited = updatedCopayers.every(c => c.status === 'invited');
      const newStatus = allInvited ? 'ready_to_start' : 'collecting_copayers';

      const updatedKey: Key = {
        ...key,
        tssSession: {
          ...key.tssSession,
          copayers: updatedCopayers,
          status: newStatus,
        },
      };

      dispatch(successUpdateKey({key: updatedKey}));

      return {joinCode};
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`Error adding co-signer: ${errorStr}`);
      throw err;
    }
  };

export const startTSSCeremony =
  (keyId: string, onRoundReady?: () => void): Effect<Promise<Key>> =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
          WALLET: {tokenOptionsByAddress, keys},
        } = getState();

        const key = keys[keyId];
        if (!key?.tssSession) {
          throw new Error('Key not found or no TSS session');
        }

        if (
          key.tssSession.status !== 'ready_to_start' &&
          key.tssSession.status !== 'ceremony_in_progress'
        ) {
          throw new Error('Not all co-signers have been invited');
        }

        if (activeCeremonies.has(keyId)) {
          logManager.debug(
            `[TSS Ceremony] Already running for keyId: ${keyId}, skipping duplicate`,
          );
          reject(new Error('CEREMONY_ALREADY_RUNNING'));
          return;
        }

        activeCeremonies.set(keyId, {unsubscribe: () => {}});

        const {
          coin,
          chain,
          network,
          myName,
          walletName,
          sessionExport,
          partyKey,
        } = key.tssSession;

        const restoredPartyKey = BWC.createKey({
          seedType: 'object',
          seedData: partyKey,
        });

        const tssKeyGen = BWC.createKeyGen({
          coin,
          chain,
          network,
          baseUrl: BASE_BWS_URL,
          key: restoredPartyKey,
        });

        await tssKeyGen.restoreSession({session: sessionExport});
        logManager.debug(`[TSS Ceremony] Session restored: ${tssKeyGen.id}`);

        if (!activeCeremonies.has(keyId)) {
          tssKeyGen.unsubscribe?.();
          reject(new Error('CEREMONY_CANCELLED'));
          return;
        }

        activeCeremonies.set(keyId, tssKeyGen);
        initCeremonyStats(keyId, tssKeyGen.id);
        logManager.info(
          `[TSS Ceremony] Registered keyId=${keyId} sessionId=${tssKeyGen.id} | active ceremonies=${activeCeremonies.size}`,
        );

        dispatch(
          successUpdateKey({
            key: {
              ...key,
              tssSession: {...key.tssSession, status: 'ceremony_in_progress'},
            },
          }),
        );

        let walletFromBWS: any;
        const Bitcore = BWC.getBitcore();
        const walletPrivKey = new Bitcore.PrivateKey().toString();

        await new Promise<void>((resolve, reject) => {
          tssKeyGen
            .on('roundready', (r: number) => {
              const stats = ceremonyStats.get(keyId);
              if (stats) {
                stats.roundsReady++;
              }
              logManager.debug(`[TSS Ceremony roundready] round=${r}`);
              logCeremonyStats(keyId, `roundready r=${r}`);
              if (r === 2) {
                onRoundReady?.();
              }
            })
            .on('roundprocessed', (r: number) =>
              logManager.debug(`[TSS Ceremony roundprocessed] round=${r}`),
            )
            .on('roundsubmitted', (r: number) => {
              const stats = ceremonyStats.get(keyId);
              if (stats) {
                stats.roundsSubmitted++;
              }
              logManager.debug(`[TSS Ceremony roundsubmitted] round=${r}`);
              logCeremonyStats(keyId, `roundsubmitted r=${r}`);
              try {
                const currentKey = getState().WALLET.keys[keyId];
                dispatch(
                  successUpdateKey({
                    key: {
                      ...currentKey,
                      tssSession: {
                        ...currentKey.tssSession!,
                        sessionExport: tssKeyGen.exportSession(),
                      },
                    },
                  }),
                );
              } catch (e) {}
            })
            .on('wallet', (w: any) => {
              logManager.debug(`[TSS Ceremony wallet] ${w?.id}`);
              walletFromBWS = w;
            })
            .on('error', (e: Error) => {
              if (
                e.message.includes('TSS_ROUND_MESSAGE_EXISTS') ||
                e.message.includes('TSS_ROUND_ALREADY_DONE')
              ) {
                const stats = ceremonyStats.get(keyId);
                if (stats) {
                  stats.swallowedErrors++;
                }
                logManager.warn(
                  `[TSS Ceremony] Swallowed reconnection error #${stats?.swallowedErrors}: ${e.message} | sessionId=${tssKeyGen.id}`,
                );
                logCeremonyStats(keyId, 'swallowed error');
                return;
              }
              logCeremonyStats(keyId, 'fatal error');
              logManager.error(
                `[TSS Ceremony] Fatal error: ${e.message} | sessionId=${tssKeyGen.id}`,
              );
              activeCeremonies.delete(keyId);
              clearCeremonyStats(keyId);
              tssKeyGen.unsubscribe();
              reject(e);
            })
            .on('complete', () => {
              logManager.debug(`[TSS Ceremony complete]`);
              resolve();
            });

          logManager.info(
            `[TSS Ceremony] Starting subscribe() poll | sessionId=${tssKeyGen.id} | active=${activeCeremonies.size}`,
          );
          tssKeyGen.subscribe({
            walletName,
            copayerName: myName,
            createWalletOpts: {
              network,
              coin,
              chain,
              walletPrivKey,
            },
          });
        });

        if (!walletFromBWS) {
          throw new Error('Failed to get TSS wallet');
        }
        logManager.debug(`[TSS BWS wallet]:`, walletFromBWS);

        const _tssKey = tssKeyGen.getTssKey();
        if (!_tssKey) {
          throw new Error('Failed to get TSS key');
        }

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(coin, chain, undefined),
        );

        const credentials = _tssKey.createCredentials(null, {
          coin,
          chain,
          network,
          account: 0,
          walletPrivKey,
        });

        credentials.addWalletInfo(
          walletFromBWS.id,
          walletFromBWS.name,
          walletFromBWS.m,
          walletFromBWS.n,
          myName,
          {
            tssKeyId: walletFromBWS.tssKeyId,
            useNativeSegwit: ['P2WPKH', 'P2WSH', 'P2TR'].includes(
              walletFromBWS.addressType,
            ),
            segwitVersion: walletFromBWS.addressType === 'P2TR' ? 1 : 0,
            allowOverwrite: true,
          },
        );

        credentials.addPublicKeyRing(walletFromBWS.publicKeyRing);

        const finalWalletClient = BWC.getClient();
        finalWalletClient.fromObj(credentials.toObj());

        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(finalWalletClient, brazeEid!));
        }
        if (emailNotifications?.accepted && emailNotifications?.email) {
          dispatch(
            subscribeEmailNotifications(finalWalletClient, {
              email: emailNotifications.email,
              language: defaultLanguage,
              unit: 'btc',
            }),
          );
        }

        const walletAddress = (await dispatch<any>(
          createWalletAddress({wallet: finalWalletClient, newAddress: true}),
        )) as string;
        logManager.info(
          `[TSS Ceremony] New address generated: ${walletAddress}`,
        );

        const refreshWalletWithRetry = async (
          maxRetries: number = 5,
          delayMs: number = 1000,
        ) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await new Promise<void>(resolveRefresh => {
              finalWalletClient.getStatus(
                {
                  includeExtendedInfo: true,
                },
                (err: Error, status: any) => {
                  if (err) {
                    logManager.warn(
                      `[TSS Ceremony] Attempt ${attempt}/${maxRetries} - Could not refresh wallet status: ${err.message}`,
                    );
                    resolveRefresh();
                  } else {
                    logManager.debug(
                      `[TSS Ceremony] Attempt ${attempt}/${maxRetries} - Status returned for wallet: ${status.wallet?.id}`,
                    );
                    logManager.debug(
                      `[TSS Ceremony] Copayers count: ${
                        status.wallet?.copayers?.length || 0
                      }`,
                    );

                    if (
                      status.wallet?.id === walletFromBWS.id &&
                      status.wallet?.copayers?.length >= key.tssSession.n
                    ) {
                      walletFromBWS = status.wallet;
                      if (status.wallet?.publicKeyRing) {
                        credentials.addPublicKeyRing(
                          status.wallet.publicKeyRing,
                        );
                        finalWalletClient.fromObj(credentials.toObj());
                      }
                      Object.assign(finalWalletClient, status.wallet);
                      logManager.debug(
                        `[TSS Ceremony] Successfully refreshed wallet with ${status.wallet.copayers.length} copayers`,
                      );
                    }
                    resolveRefresh();
                  }
                },
              );
            });

            const currentCopayersCount =
              finalWalletClient.credentials?.publicKeyRing?.length || 0;

            if (currentCopayersCount >= key.tssSession.n) {
              logManager.debug(
                `[TSS Ceremony] All ${key.tssSession.n} copayers found after ${attempt} attempt(s)`,
              );
              break;
            }

            if (attempt < maxRetries) {
              logManager.debug(
                `[TSS Ceremony] Only ${currentCopayersCount}/${key.tssSession.n} copayers found, retrying in ${delayMs}ms...`,
              );
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              logManager.warn(
                `[TSS Ceremony] Max retries reached. Only ${currentCopayersCount}/${key.tssSession.n} copayers found. Continuing anyway...`,
              );
            }
          }
        };

        await refreshWalletWithRetry(5, 1000);

        const finalWallet = merge(
          finalWalletClient,
          walletFromBWS,
          buildWalletObj(
            {
              ...credentials.toObj(),
              currencyAbbreviation,
              currencyName,
              tssMetadata: _tssKey.metadata,
            } as any,
            tokenOptionsByAddress,
          ),
        ) as Wallet;

        delete finalWallet.pendingTssSession;

        const finalKey = buildTssKeyObj({
          tssKey: _tssKey,
          wallets: [finalWallet],
          keyName: 'My TSSKey',
        });

        finalKey.tssSession = {
          ...key.tssSession,
          status: 'complete',
          sessionExport: undefined,
        };

        dispatch(successUpdateKey({key: finalKey}));
        logCeremonyStats(keyId, 'complete');
        activeCeremonies.delete(keyId);
        clearCeremonyStats(keyId);
        tssKeyGen.unsubscribe();
        logManager.info(
          `[TSS Ceremony] Complete! Wallet ID: ${walletFromBWS.id} | active=${activeCeremonies.size}`,
        );
        resolve(finalKey);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logCeremonyStats(keyId, 'caught error');
        logManager.error(
          `[TSS Ceremony] Caught error, cleaning up: ${errorStr}`,
        );
        activeCeremonies.get(keyId)?.unsubscribe();
        activeCeremonies.delete(keyId);
        clearCeremonyStats(keyId);
        reject(err);
      }
    });
  };

export const generateJoinerSessionId =
  (opts?: {
    name?: string;
  }): Effect<Promise<{sessionId: string; partyKey: any}>> =>
  async (dispatch, getState): Promise<{sessionId: string; partyKey: any}> => {
    try {
      const partyKey = BWC.createKey({seedType: 'new'});

      const pubKey = getPubKeyFromKey(partyKey);

      const sessionIdData: JoinerSessionId = {
        pubKey,
        name: opts?.name,
      };
      const sessionId = encodeJoinerSessionId(sessionIdData);

      const pendingSession: PendingJoinerSession = {
        sessionId,
        partyKey: partyKey.toObj(),
        copayerName: opts?.name,
        createdAt: Date.now(),
      };
      dispatch(setPendingJoinerSession(pendingSession));

      logManager.debug(`[TSS Join] Generated and persisted session ID`);

      return {
        sessionId,
        partyKey: partyKey.toObj(),
      };
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`Error generating joiner session ID: ${errorStr}`);
      throw err;
    }
  };

export const clearPendingJoinerSession = (): Effect<void> => dispatch => {
  dispatch(removePendingJoinerSession());
  logManager.debug(`[TSS Join] Cleared pending joiner session`);
};

export const validateJoinCode =
  (joinCode: string, partyKey: any): Effect<void> =>
  () => {
    const BWC = BwcProvider.getInstance();
    const restoredKey = BWC.createKey({
      seedType: 'object',
      seedData: partyKey,
    });
    const tempTssKeyGen = BWC.createKeyGen({
      coin: 'btc',
      chain: 'btc',
      network: 'livenet',
      baseUrl: BASE_BWS_URL,
      key: restoredKey,
    });
    tempTssKeyGen.checkJoinCode({
      code: joinCode,
      opts: {encoding: 'base64'},
    });
  };

export const joinTSSWithCode =
  (opts: {
    joinCode?: string;
    partyKey?: any;
    myName?: string;
    keyId?: string;
    onRoundReady?: () => void;
    onKeyCreated?: (keyId: string) => void;
  }): Effect<Promise<Key>> =>
  async (dispatch, getState): Promise<Key> => {
    let _activeKeyId: string | undefined;
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
          WALLET: {tokenOptionsByAddress, keys},
        } = getState();

        const isResume = !!opts.keyId;
        let key: Key;
        let partyKey: any;
        let tssKeyGen: any;
        let coin: string;
        let chain: string;
        let network: 'livenet' | 'testnet' | 'regtest';
        let myName: string;
        let copayerName: string;

        if (isResume) {
          const existingKey = keys[opts.keyId!];
          if (!existingKey?.tssSession) {
            throw new Error('Key not found or no TSS session');
          }
          if (existingKey.tssSession.status !== 'ceremony_in_progress') {
            throw new Error('TSS session is not in ceremony_in_progress state');
          }

          if (activeCeremonies.has(opts.keyId!)) {
            logManager.debug(
              `[TSS Join] Already running for keyId: ${opts.keyId}, skipping duplicate`,
            );
            reject(new Error('CEREMONY_ALREADY_RUNNING'));
            return;
          }

          key = existingKey;
          coin = existingKey.tssSession.coin;
          chain = existingKey.tssSession.chain;
          network = existingKey.tssSession.network;
          myName = existingKey.tssSession.myName;
          copayerName = myName;

          partyKey = BWC.createKey({
            seedType: 'object',
            seedData: existingKey.tssSession.partyKey,
          });

          tssKeyGen = BWC.createKeyGen({
            coin,
            chain,
            network,
            baseUrl: BASE_BWS_URL,
            key: partyKey,
          });

          _activeKeyId = opts.keyId!;
          activeCeremonies.set(_activeKeyId, {unsubscribe: () => {}});

          await tssKeyGen.restoreSession({
            session: existingKey.tssSession.sessionExport,
          });
          logManager.debug(`[TSS Join] Session restored: ${tssKeyGen.id}`);

          if (!activeCeremonies.has(_activeKeyId)) {
            tssKeyGen.unsubscribe?.();
            reject(new Error('CEREMONY_CANCELLED'));
            return;
          }
        } else {
          if (!opts.joinCode || !opts.partyKey || !opts.myName) {
            throw new Error(
              'joinCode, partyKey, and myName are required for initial join',
            );
          }

          myName = opts.myName;
          copayerName = myName;

          partyKey = BWC.createKey({
            seedType: 'object',
            seedData: opts.partyKey,
          });

          logManager.debug('[TSS Join] Party key restored');

          const tempTssKeyGen = BWC.createKeyGen({
            coin: 'btc',
            chain: 'btc',
            network: 'livenet',
            baseUrl: BASE_BWS_URL,
            key: partyKey,
          });

          const decoded = tempTssKeyGen.checkJoinCode({
            code: opts.joinCode,
            opts: {encoding: 'base64'},
          });
          logManager.debug(
            `[TSS Join] Decoded joinCode: ${JSON.stringify(decoded)}`,
          );

          chain = decoded.chain.toLowerCase();
          coin = BitpaySupportedCoins[chain].coin;
          network = decoded.network as 'livenet' | 'testnet' | 'regtest';

          tssKeyGen = BWC.createKeyGen({
            coin,
            chain,
            network: network,
            baseUrl: BASE_BWS_URL,
            key: partyKey,
          });

          activeCeremonies.set(opts.joinCode!, {unsubscribe: () => {}});

          logManager.info('[TSS Join] POST /v1/tss/keygen — joinKey() start');
          const _joinKeyStart = Date.now();
          await tssKeyGen.joinKey({
            code: opts.joinCode,
            opts: {encoding: 'base64'},
          });
          logManager.info(
            `[TSS Join] POST /v1/tss/keygen — joinKey() done in ${
              Date.now() - _joinKeyStart
            }ms | sessionId=${tssKeyGen.id}`,
          );

          if (!activeCeremonies.has(opts.joinCode!)) {
            tssKeyGen.unsubscribe?.();
            reject(new Error('CEREMONY_CANCELLED'));
            return;
          }
          activeCeremonies.delete(opts.joinCode!);

          const m = tssKeyGen.m;
          const n = tssKeyGen.n;

          const {
            currencyAbbreviation: placeholderCurrencyAbbreviation,
            currencyName: placeholderCurrencyName,
          } = dispatch(mapAbbreviationAndName(coin, chain, undefined));

          const walletClient = BWC.getClient();
          const tempCredentials = partyKey.createCredentials(null, {
            coin,
            chain,
            network,
            n: 1,
            account: 0,
          });
          walletClient.fromObj(tempCredentials);

          const placeholderWallet = merge(
            walletClient,
            buildWalletObj(
              {
                ...walletClient.credentials,
                currencyAbbreviation: placeholderCurrencyAbbreviation,
                currencyName: placeholderCurrencyName,
                tssMetadata: {
                  id: tssKeyGen.id,
                  m,
                  n,
                  partyId: tssKeyGen.partyId,
                },
              } as any,
              tokenOptionsByAddress,
            ),
          ) as Wallet;

          placeholderWallet.pendingTssSession = true;

          key = buildKeyObj({
            key: partyKey,
            wallets: [placeholderWallet],
            keyName: 'My TSSKey',
            backupComplete: false,
          });

          placeholderWallet.id = `pending-tss-${key.id}-${chain}`;

          key.tssSession = {
            id: tssKeyGen.id,
            partyKey: partyKey.toObj(),
            sessionExport: tssKeyGen.exportSession(),
            coin,
            chain,
            network,
            m,
            n,
            myName,
            createdAt: Date.now(),
            isCreator: false,
            partyId: tssKeyGen.partyId || 1,
            status: 'ceremony_in_progress',
          };

          dispatch(successCreateKey({key}));
          dispatch(setHomeCarouselConfig({id: key.id, show: true}));
        }

        const tssSession = key.tssSession;
        if (!tssSession) {
          throw new Error('tssSession is missing from key');
        }

        _activeKeyId = key.id;
        activeCeremonies.set(key.id, tssKeyGen);
        initCeremonyStats(key.id, tssKeyGen.id);
        logManager.info(
          `[TSS Join] Registered keyId=${key.id} sessionId=${tssKeyGen.id} | active ceremonies=${activeCeremonies.size}`,
        );
        opts.onKeyCreated?.(key.id);

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(coin, chain, undefined),
        );

        let walletFromBWS: any;

        await new Promise<void>((resolve, reject) => {
          tssKeyGen
            .on('roundready', (r: number) => {
              const stats = ceremonyStats.get(key.id);
              if (stats) {
                stats.roundsReady++;
              }
              logManager.debug(`[TSS Join roundready] round=${r}`);
              logCeremonyStats(key.id, `roundready r=${r}`);
              if (r === 2) {
                opts.onRoundReady?.();
              }
            })
            .on('roundprocessed', (r: number) =>
              logManager.debug(`[TSS Join roundprocessed] round=${r}`),
            )
            .on('roundsubmitted', (r: number) => {
              const stats = ceremonyStats.get(key.id);
              if (stats) {
                stats.roundsSubmitted++;
              }
              logManager.debug(`[TSS Join roundsubmitted] round=${r}`);
              logCeremonyStats(key.id, `roundsubmitted r=${r}`);
              try {
                const currentKey = getState().WALLET.keys[key.id];
                if (currentKey?.tssSession) {
                  dispatch(
                    successUpdateKey({
                      key: {
                        ...currentKey,
                        tssSession: {
                          ...currentKey.tssSession,
                          sessionExport: tssKeyGen.exportSession(),
                        },
                      },
                    }),
                  );
                }
              } catch (e) {}
            })
            .on('wallet', (w: any) => {
              logManager.debug(`[TSS Join wallet] ${w?.id}`);
              walletFromBWS = w;
            })
            .on('error', (e: Error) => {
              const stats = ceremonyStats.get(key.id);
              if (e.message.includes('Copayer ID already registered')) {
                if (stats) {
                  stats.swallowedErrors++;
                }
                logManager.warn(
                  `[TSS Join] Swallowed reconnection error #${stats?.swallowedErrors}: Copayer already registered | sessionId=${tssKeyGen.id}`,
                );
                logCeremonyStats(key.id, 'swallowed error');
                return;
              }
              if (
                e.message.includes('TSS_ROUND_MESSAGE_EXISTS') ||
                e.message.includes('TSS_ROUND_ALREADY_DONE')
              ) {
                if (stats) {
                  stats.swallowedErrors++;
                }
                logManager.warn(
                  `[TSS Join] Swallowed reconnection error #${stats?.swallowedErrors}: ${e.message} | sessionId=${tssKeyGen.id}`,
                );
                logCeremonyStats(key.id, 'swallowed error');
                return;
              }
              logCeremonyStats(key.id, 'fatal error');
              logManager.error(
                `[TSS Join] Fatal error: ${e.message} | sessionId=${tssKeyGen.id}`,
              );
              activeCeremonies.delete(key.id);
              clearCeremonyStats(key.id);
              tssKeyGen.unsubscribe();
              reject(e);
            })
            .on('complete', () => {
              logManager.debug(`[TSS Join complete]`);
              resolve();
            });

          logManager.info(
            `[TSS Join] Starting subscribe() poll | sessionId=${tssKeyGen.id} | active=${activeCeremonies.size}`,
          );
          tssKeyGen.subscribe({
            copayerName: myName,
            createWalletOpts: {
              network,
              coin,
              chain,
            },
          });
        });

        if (!walletFromBWS) {
          throw new Error('Failed to get TSS wallet');
        }
        logManager.debug(`[TSS BWS wallet]:`, walletFromBWS);

        const _tssKey = tssKeyGen.getTssKey();
        if (!_tssKey) {
          throw new Error('Failed to get TSS key');
        }

        const credentials = _tssKey.createCredentials(null, {
          coin,
          chain,
          network,
          account: 0,
        });

        logManager.debug(
          `[TSS Join] TssKey copayerId: ${credentials.copayerId}`,
        );
        logManager.debug(`[TSS Join] TssKey xPubKey: ${credentials.xPubKey}`);

        const finalWalletClient = BWC.getClient();
        finalWalletClient.fromObj(credentials.toObj());

        const refreshWalletWithRetry = async (
          maxRetries: number = 5,
          delayMs: number = 1000,
        ) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await new Promise<void>(resolveRefresh => {
              finalWalletClient.getStatus(
                {
                  includeExtendedInfo: true,
                },
                (err: Error, status: any) => {
                  if (err) {
                    logManager.warn(
                      `[TSS Ceremony] Attempt ${attempt}/${maxRetries} - Could not refresh wallet status: ${err.message}`,
                    );
                    resolveRefresh();
                  } else {
                    logManager.debug(
                      `[TSS Ceremony] Attempt ${attempt}/${maxRetries} - Status returned for wallet: ${status.wallet?.id}`,
                    );
                    logManager.debug(
                      `[TSS Ceremony] Copayers count: ${
                        status.wallet?.copayers?.length || 0
                      }`,
                    );

                    if (
                      status.wallet?.id === walletFromBWS.id &&
                      status.wallet?.copayers?.length >= tssSession.n
                    ) {
                      walletFromBWS = status.wallet;
                      credentials.addWalletInfo(
                        walletFromBWS.id,
                        walletFromBWS.name,
                        walletFromBWS.m,
                        walletFromBWS.n,
                        copayerName,
                        {
                          tssKeyId: walletFromBWS.tssKeyId,
                          useNativeSegwit: ['P2WPKH', 'P2WSH', 'P2TR'].includes(
                            walletFromBWS.addressType,
                          ),
                          segwitVersion:
                            walletFromBWS.addressType === 'P2TR' ? 1 : 0,
                          allowOverwrite: true,
                        },
                      );
                      if (status.wallet?.publicKeyRing) {
                        credentials.addPublicKeyRing(
                          status.wallet.publicKeyRing,
                        );
                      }
                      if (status.customData.walletPrivateKey) {
                        credentials.addWalletPrivateKey(
                          status.customData.walletPrivateKey,
                        );
                      }
                      finalWalletClient.fromObj(credentials.toObj());
                      Object.assign(finalWalletClient, status.wallet);
                      logManager.debug(
                        `[TSS Ceremony] Successfully refreshed wallet with ${status.wallet.copayers.length} copayers`,
                      );
                    }
                    resolveRefresh();
                  }
                },
              );
            });

            const currentCopayersCount =
              finalWalletClient.credentials?.publicKeyRing?.length || 0;

            if (currentCopayersCount >= tssSession.n) {
              logManager.debug(
                `[TSS Ceremony] All ${tssSession.n} copayers found after ${attempt} attempt(s)`,
              );
              break;
            }

            if (attempt < maxRetries) {
              logManager.debug(
                `[TSS Ceremony] Only ${currentCopayersCount}/${tssSession.n} copayers found, retrying in ${delayMs}ms...`,
              );
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              logManager.warn(
                `[TSS Ceremony] Max retries reached. Only ${currentCopayersCount}/${tssSession.n} copayers found. Continuing anyway...`,
              );
            }
          }
        };

        await refreshWalletWithRetry(5, 1000);

        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(finalWalletClient, brazeEid!));
        }
        if (emailNotifications?.accepted && emailNotifications?.email) {
          dispatch(
            subscribeEmailNotifications(finalWalletClient, {
              email: emailNotifications.email,
              language: defaultLanguage,
              unit: 'btc',
            }),
          );
        }

        const walletAddress = (await dispatch<any>(
          createWalletAddress({wallet: finalWalletClient, newAddress: false}),
        )) as string;
        logManager.info(`[TSS Join] Address retrieved: ${walletAddress}`);

        const finalWallet = merge(
          finalWalletClient,
          walletFromBWS,
          buildWalletObj(
            {
              ...credentials.toObj(),
              currencyAbbreviation,
              currencyName,
              tssMetadata: _tssKey.metadata,
            } as any,
            tokenOptionsByAddress,
          ),
        ) as Wallet;

        delete finalWallet.pendingTssSession;

        const finalKey = buildTssKeyObj({
          tssKey: _tssKey,
          wallets: [finalWallet],
          keyName: 'My TSSKey',
        });

        finalKey.tssSession = {
          ...tssSession,
          status: 'complete',
          sessionExport: undefined,
        };

        dispatch(successUpdateKey({key: finalKey}));
        logCeremonyStats(finalKey.id, 'complete');
        activeCeremonies.delete(finalKey.id);
        clearCeremonyStats(finalKey.id);
        tssKeyGen.unsubscribe();
        logManager.info(
          `[TSS Join] Complete! Wallet ID: ${walletFromBWS.id} | active=${activeCeremonies.size}`,
        );
        resolve(finalKey);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        const _sentinelKey = _activeKeyId ?? opts.joinCode;
        if (_sentinelKey) {
          activeCeremonies.get(_sentinelKey)?.unsubscribe();
          activeCeremonies.delete(_sentinelKey);
          logManager.info(
            `[TSS Join] Removed from registry | active=${activeCeremonies.size}`,
          );
        }
        if (_activeKeyId) {
          logCeremonyStats(_activeKeyId, 'caught error');
          clearCeremonyStats(_activeKeyId);
        }
        logManager.error(
          `[TSS Join] Caught error, cleaning up: ${errorStr} | activeKeyId=${_activeKeyId}`,
        );
        reject(err);
      }
    });
  };
