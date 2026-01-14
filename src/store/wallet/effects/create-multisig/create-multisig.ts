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
import {TssKeyGen} from 'bitcore-wallet-client/ts_build/src/lib/tsskey';
import {BASE_BWS_URL} from '../../../../constants/config';
import {Network} from '../../../../constants';
import {setHomeCarouselConfig} from '../../../../store/app/app.actions';
import {createWalletAddress} from '../address/address';
import {BitpaySupportedCoins} from '../../../../constants/currencies';

const BWC = BwcProvider.getInstance();

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
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`Error create key multisig: ${errorStr}`);
        reject();
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

      const BWCKey = BWC.getKey();

      const partyKey = new BWCKey({seedType: 'new'});
      logManager.debug('[TSS] Created party key for creator');

      const tssKeyGen = new TssKeyGen({
        coin,
        chain,
        network: network as Network,
        baseUrl: BASE_BWS_URL,
        key: partyKey,
      });

      logManager.debug('[TSS] Calling newKey() to create session on server...');
      await tssKeyGen.newKey({
        m: m,
        n: n,
        password: password,
      });

      const sessionId = tssKeyGen.id;
      const sessionExport = tssKeyGen.exportSession();
      logManager.debug(`[TSS] Session created with ID: ${sessionId}`);

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
          } as any,
          tokenOptionsByAddress,
        ),
      ) as Wallet;

      placeholderWallet.pendingTssSession = true;

      const key = buildKeyObj({
        key: partyKey,
        wallets: [placeholderWallet],
        keyName: 'My TSSKey',
        backupComplete: true,
      });

      placeholderWallet.id = `pending-tss-${key.id}-${chain}`;

      const copayers: TSSCopayerInfo[] = [];
      for (let i = 1; i < n; i++) {
        copayers.push({
          partyId: i,
          pubKey: '',
          name: `Co-signer ${i}`,
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

      const BWCKey = BWC.getKey();
      const partyKey = new BWCKey({
        seedType: 'object',
        seedData: key.tssSession.partyKey,
      });

      const tssKeyGen = new TssKeyGen({
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
          name: joinerData.name || `Co-signer ${opts.partyId}`,
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
  (keyId: string): Effect<Promise<Key>> =>
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

        if (key.tssSession.status !== 'ready_to_start') {
          throw new Error('Not all co-signers have been invited');
        }

        const {
          coin,
          chain,
          network,
          myName,
          walletName,
          sessionExport,
          partyKey,
        } = key.tssSession;

        const BWCKey = BWC.getKey();
        const restoredPartyKey = new BWCKey({
          seedType: 'object',
          seedData: partyKey,
        });

        const tssKeyGen = new TssKeyGen({
          coin,
          chain,
          network,
          baseUrl: BASE_BWS_URL,
          key: restoredPartyKey,
        });

        await tssKeyGen.restoreSession({session: sessionExport});
        logManager.debug(`[TSS Ceremony] Session restored: ${tssKeyGen.id}`);

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
              logManager.debug(`[TSS Ceremony roundready] ${r}`);
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
            .on('roundprocessed', (r: number) =>
              logManager.debug(`[TSS Ceremony roundprocessed] ${r}`),
            )
            .on('roundsubmitted', (r: number) =>
              logManager.debug(`[TSS Ceremony roundsubmitted] ${r}`),
            )
            .on('wallet', (w: any) => {
              logManager.debug(`[TSS Ceremony wallet] ${w?.id}`);
              walletFromBWS = w;
            })
            .on('error', (e: Error) => {
              logManager.error(`[TSS Ceremony error] ${e.message}`);
              reject(e);
            })
            .on('complete', () => {
              logManager.debug(`[TSS Ceremony complete]`);
              resolve();
            });

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
        tssKeyGen.unsubscribe();

        logManager.debug(
          `[TSS Ceremony] Complete! Wallet ID: ${walletFromBWS.id}`,
        );
        resolve(finalKey);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`[TSS Ceremony] Error: ${errorStr}`);
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
      const Key = BWC.getKey();

      const partyKey = new Key({seedType: 'new'});

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

export const joinTSSWithCode =
  (opts: {
    joinCode: string;
    partyKey: any;
    myName: string;
  }): Effect<Promise<Key>> =>
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
          WALLET: {tokenOptionsByAddress},
        } = getState();

        const BWCKey = BWC.getKey();
        const {myName} = opts;
        const copayerName = myName;

        const partyKey = new BWCKey({
          seedType: 'object',
          seedData: opts.partyKey,
        });

        logManager.debug('[TSS Join] Party key restored');

        const tempTssKeyGen = new TssKeyGen({
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

        const chain = decoded.chain.toLowerCase();
        const coin = BitpaySupportedCoins[chain].coin;
        const network = decoded.network as 'livenet' | 'testnet' | 'regtest';

        const tssKeyGen = new TssKeyGen({
          coin,
          chain,
          network: network,
          baseUrl: BASE_BWS_URL,
          key: partyKey,
        });

        logManager.debug('[TSS Join] Calling joinKey...');
        await tssKeyGen.joinKey({
          code: opts.joinCode,
          opts: {encoding: 'base64'},
        });
        logManager.debug(`[TSS Join] Joined session: ${tssKeyGen.id}`);

        const m = tssKeyGen.m;
        const n = tssKeyGen.n;

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(coin, chain, undefined),
        );

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
              currencyAbbreviation,
              currencyName,
            } as any,
            tokenOptionsByAddress,
          ),
        ) as Wallet;

        placeholderWallet.pendingTssSession = true;

        const key = buildKeyObj({
          key: partyKey,
          wallets: [placeholderWallet],
          keyName: 'My TSSKey',
          backupComplete: true,
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

        let walletFromBWS: any;

        await new Promise<void>((resolve, reject) => {
          tssKeyGen
            .on('roundready', (r: number) => {
              logManager.debug(`[TSS Join roundready] ${r}`);
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
            .on('roundprocessed', (r: number) =>
              logManager.debug(`[TSS Join roundprocessed] ${r}`),
            )
            .on('roundsubmitted', (r: number) =>
              logManager.debug(`[TSS Join roundsubmitted] ${r}`),
            )
            .on('wallet', (w: any) => {
              logManager.debug(`[TSS Join wallet] ${w?.id}`);
              walletFromBWS = w;
            })
            .on('error', (e: Error) => {
              if (e.message.includes('Copayer ID already registered')) {
                logManager.debug(
                  '[TSS Join] Copayer already registered, this is a reconnection',
                );
                return;
              }
              logManager.error(`[TSS Join error] ${e.message}`);
              reject(e);
            })
            .on('complete', () => {
              logManager.debug(`[TSS Join complete]`);
              resolve();
            });

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
                      status.wallet?.copayers?.length >= key.tssSession!.n
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

            if (currentCopayersCount >= key.tssSession!.n) {
              logManager.debug(
                `[TSS Ceremony] All ${
                  key.tssSession!.n
                } copayers found after ${attempt} attempt(s)`,
              );
              break;
            }

            if (attempt < maxRetries) {
              logManager.debug(
                `[TSS Ceremony] Only ${currentCopayersCount}/${
                  key.tssSession!.n
                } copayers found, retrying in ${delayMs}ms...`,
              );
              await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
              logManager.warn(
                `[TSS Ceremony] Max retries reached. Only ${currentCopayersCount}/${
                  key.tssSession!.n
                } copayers found. Continuing anyway...`,
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
          createWalletAddress({wallet: finalWalletClient, newAddress: true}),
        )) as string;
        logManager.info(`[TSS Join] New address generated: ${walletAddress}`);

        const finalWallet = merge(
          finalWalletClient,
          walletFromBWS,
          buildWalletObj(
            {
              ...credentials.toObj(),
              currencyAbbreviation,
              currencyName,
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
        tssKeyGen.unsubscribe();

        logManager.debug(`[TSS Join] Complete! Wallet ID: ${walletFromBWS.id}`);
        resolve(finalKey);
      } catch (err) {
        const errorStr =
          err instanceof Error ? err.message : JSON.stringify(err);
        logManager.error(`[TSS Join - joinTSSWithCode] Error: ${errorStr}`);
        reject(err);
      }
    });
  };
