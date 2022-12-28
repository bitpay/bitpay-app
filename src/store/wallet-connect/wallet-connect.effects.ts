import WalletConnect from '@walletconnect/client';
import {WalletConnectActions} from '.';
import {
  IWCConnector,
  IWCRequest,
  IWCSession,
  IWCCustomData,
} from './wallet-connect.models';
import {Effect} from '..';
import {sleep} from '../../utils/helper-methods';
import {Key, Wallet} from '../wallet/wallet.models';
import {BwcProvider} from '../../lib/bwc';
import {
  personalSign,
  signTypedDataLegacy,
  signTypedData_v4,
} from 'eth-sig-util';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
} from '../app/app.actions';
import {WrongPasswordError} from '../../navigation/wallet/components/ErrorMessages';
import {LogActions} from '../log';
import {t} from 'i18next';
import {checkBiometricForSending} from '../wallet/effects/send/send';
import {IsERCToken} from '../wallet/utils/currency';
import {EVM_BLOCKCHAIN_ID, PROTOCOL_NAME} from '../../constants/config';
import {startOnGoingProcessModal} from '../app/app.effects';
import {addWallet, getDecryptPassword} from '../wallet/effects';
import {
  BitpaySupportedEvmCoins,
  SUPPORTED_EVM_COINS,
} from '../../constants/currencies';
import {createWalletAddress} from '../wallet/effects/address/address';
import {getTokenContractInfo} from '../wallet/effects/status/status';
import {findWalletById} from '../wallet/utils/wallet';

const BWC = BwcProvider.getInstance();

export const walletConnectInit = (): Effect => async (dispatch, getState) => {
  try {
    const {sessions: _sessions, requests: _requests} =
      getState().WALLET_CONNECT;
    const keys = Object.values(getState().WALLET.keys);
    const keyIds = keys.map(({id}) => id);
    const sessions = _sessions.filter(s => keyIds.includes(s.customData.keyId));

    const connectors: IWCConnector[] =
      sessions &&
      (await Promise.all(
        Object.values(sessions).map(s => {
          return {
            connector: new WalletConnect({session: s.session}),
            customData: s.customData,
          };
        }),
      ));

    const peerIds = connectors.map(({connector}) => connector.peerId);
    const requests = _requests.filter(r => peerIds.includes(r.peerId));

    // remove sessions & pending requests if the user deletes the corresponding key or connection
    dispatch(WalletConnectActions.updateStore(sessions, requests));
    dispatch(
      LogActions.info('[WC/walletConnectInit]: initialized successfully'),
    );
    dispatch(WalletConnectActions.successInitRequest(connectors || []));
    dispatch(walletConnectSubscribeToEvents());
  } catch (err: unknown) {
    let errorStr;
    if (err instanceof Error) {
      errorStr = err.message;
    } else {
      errorStr = JSON.stringify(err);
    }
    dispatch(
      LogActions.error(
        '[WC/walletConnectInit]: an error occurred while initializing.',
      ),
    );
    dispatch(LogActions.error(errorStr));
    dispatch(WalletConnectActions.failedInitRquest());
  }
};

export const walletConnectOnSessionRequest =
  (uri: string): Effect<Promise<{peer: any; peerId: any}>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const connector = new WalletConnect({uri});
      let isWaitingForEvent: boolean = true;
      connector.on('session_request', (error: any, payload: any) => {
        isWaitingForEvent = false;
        if (error) {
          reject(error);
        }
        const {pending} = getState().WALLET_CONNECT;
        dispatch(WalletConnectActions.sessionRequest([...pending, connector]));
        dispatch(
          LogActions.info(
            `[WC/walletConnectOnSessionRequest]: session request: ${JSON.stringify(
              payload.params[0],
            )}`,
          ),
        );
        resolve(payload.params[0]);
      });

      await sleep(5000);
      if (isWaitingForEvent) {
        // reject promise if Dapp doesn't respond
        const error = t(
          'Session request failed or rejected. Please try again by refreshing the QR code.',
        );
        dispatch(
          LogActions.error(`[WC/walletConnectOnSessionRequest]: ${error}`),
        );
        reject(error);
      }
    });
  };

export const walletConnectApproveSessionRequest =
  (
    peerId: string,
    response: {accounts: string[]; chainId: number},
    customData: IWCCustomData,
  ): Effect<Promise<void>> =>
  (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      try {
        const {connectors, pending, sessions} = getState().WALLET_CONNECT;
        let updatedConnectors: IWCConnector[] = [...connectors];
        let updatedPending: WalletConnect[] = [];
        let updatedSessions: IWCSession[] = [...sessions];

        pending.forEach((connector: WalletConnect) => {
          if (connector.peerId === peerId) {
            connector.approveSession({
              accounts: response.accounts,
              chainId: response.chainId,
            });
            updatedConnectors.push({connector, customData});
            updatedSessions.push({session: connector.session, customData});
          } else {
            updatedPending.push(connector);
          }
        });
        dispatch(
          WalletConnectActions.approveSessionRequest(
            updatedConnectors,
            updatedPending,
            updatedSessions,
          ),
        );
        dispatch(walletConnectSubscribeToEvents(peerId));
        dispatch(
          LogActions.info(
            '[WC/walletConnectApproveSessionRequest]: session approval',
          ),
        );
        resolve();
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectApproveSessionRequest]: an error occurred while approving session.',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectRejectSessionRequest =
  (peerId: string): Effect =>
  async (dispatch, getState) => {
    const {pending} = getState().WALLET_CONNECT;

    const connector: WalletConnect = pending.filter(
      (pendingConnector: WalletConnect) => pendingConnector.peerId === peerId,
    )[0];

    connector.rejectSession();

    const updatedPending: WalletConnect[] = pending.filter(
      (connector: WalletConnect) => connector.peerId !== peerId,
    );

    dispatch(
      LogActions.info(
        '[WC/walletConnectRejectSessionRequest]: session rejection',
      ),
    );
    dispatch(WalletConnectActions.rejectSessionRequest(updatedPending));
  };

export const walletConnectSubscribeToEvents =
  (peerId?: string): Effect =>
  (dispatch, getState) => {
    if (!peerId) {
      const {connectors} = getState().WALLET_CONNECT;
      connectors.forEach((c: IWCConnector) => {
        return dispatch(walletConnectSubscribeToEvents(c.connector.peerId));
      });
    } else {
      const {connectors} = getState().WALLET_CONNECT;
      const wcConnector: IWCConnector = connectors.filter(
        (c: IWCConnector) => c.connector.peerId === peerId,
      )[0];

      const {keys} = getState().WALLET;
      const {keyId, walletId} = wcConnector.customData;
      const wallet = findWalletById(keys[keyId].wallets, walletId);

      wcConnector.connector.on(
        'call_request',
        async (error: any, payload: any) => {
          if (error) {
            throw error;
          }
          dispatch(
            LogActions.info(
              `[WC/call_request]: new pending request: ${JSON.stringify(
                payload,
              )}`,
            ),
          );
          let chain;
          if (wallet && payload?.params[0]) {
            chain = await dispatch(
              walletConnectGetChain(wallet, payload.params[0].to),
            );
          }

          if (!chain) {
            chain = Object.keys(EVM_BLOCKCHAIN_ID).find(
              key => EVM_BLOCKCHAIN_ID[key] === wcConnector?.connector.chainId,
            );
          }

          const updatedRequests: IWCRequest[] = [
            ...getState().WALLET_CONNECT.requests,
            ...[
              {
                peerId,
                chain,
                payload,
                createdOn: Date.now(),
              },
            ],
          ];
          dispatch(WalletConnectActions.callRequest(updatedRequests));
        },
      );

      wcConnector.connector.on('disconnect', async (error: any) => {
        if (error) {
          throw error;
        }

        const {connectors, sessions, requests} = getState().WALLET_CONNECT;
        if (sessions.find(s => s.session.peerId === peerId)) {
          const updatedSessions: IWCSession[] = sessions.filter(
            s => s.session.peerId !== peerId,
          );
          const updatedConnectors: IWCConnector[] = connectors.filter(
            c => c.connector.peerId,
          );
          const updatedRequests: IWCRequest[] = requests.filter(
            r => r.peerId !== peerId,
          );
          dispatch(
            WalletConnectActions.sessionDisconnected(
              updatedConnectors,
              updatedSessions,
              updatedRequests,
            ),
          );
        }
      });
    }
  };

export const walletConnectKillSession =
  (peerId: string): Effect<Promise<void>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {connectors} = getState().WALLET_CONNECT;
      await Promise.all(
        connectors.map(async c => {
          try {
            if (c.connector.peerId === peerId) {
              await c.connector.killSession();
              dispatch(
                LogActions.info(
                  '[WC/walletConnectKillSession]: session killed',
                ),
              );
              resolve();
            }
          } catch (err) {
            dispatch(
              LogActions.error(
                '[WC/walletConnectKillSession]: an error occurred while killing session',
              ),
            );
            dispatch(LogActions.error(JSON.stringify(err)));
            reject(err);
          }
        }),
      );
    });
  };

export const walletConnectApproveCallRequest =
  (
    peerId: string,
    response: {id: number | undefined; result: any},
  ): Effect<Promise<void>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const wcConnector: IWCConnector =
          getState().WALLET_CONNECT.connectors.filter(
            (c: IWCConnector) => c.connector.peerId === peerId,
          )[0];
        await wcConnector.connector.approveRequest(response);

        const updatedRequests: IWCRequest[] =
          getState().WALLET_CONNECT.requests.filter(
            (request: IWCRequest) => request.payload.id !== response.id,
          );
        await dispatch(
          WalletConnectActions.approveCallRequest(updatedRequests),
        );
        dispatch(
          LogActions.info(
            '[WC/walletConnectApproveCallRequest]: call request approval',
          ),
        );
        resolve();
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectApproveCallRequest]: an error occurred while approving call request',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectRejectCallRequest =
  (
    peerId: string,
    response: {id: number | undefined; error: {message: string}},
  ): Effect<Promise<void>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const wcConnector: IWCConnector =
          getState().WALLET_CONNECT.connectors.filter(
            (c: IWCConnector) => c.connector.peerId === peerId,
          )[0];
        await wcConnector.connector.rejectRequest(response);

        const updatedRequests: IWCRequest[] =
          getState().WALLET_CONNECT.requests.filter(
            (request: IWCRequest) =>
              request.payload && request.payload.id !== response.id,
          );
        await dispatch(WalletConnectActions.rejectCallRequest(updatedRequests));
        dispatch(
          LogActions.info(
            '[WC/walletConnectRejectCallRequest]: call request rejection',
          ),
        );
        resolve();
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectRejectCallRequest]: an error occurred while rejecting call request',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

const getPrivKey =
  (keyId: string): Effect<Promise<any>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {keys} = getState().WALLET;
        const {biometricLockActive} = getState().APP;
        const key: Key = keys[keyId];

        let password: string | undefined;

        if (biometricLockActive) {
          try {
            await dispatch(checkBiometricForSending());
          } catch (error) {
            return reject(error);
          }
        }

        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(key));
        }

        const xPrivKey = password
          ? key.methods!.get(password).xPrivKey
          : key.properties!.xPrivKey;
        const bitcore = BWC.getBitcore();
        const xpriv = new bitcore.HDPrivateKey(xPrivKey);
        const priv = xpriv.deriveChild("m/44'/60'/0'/0/0").privateKey;
        dispatch(
          LogActions.info('[WC/getPrivKey]: got the private key successfully'),
        );
        resolve(priv);
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/getPrivKey]: an error occurred while getting private key',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectSignTypedDataLegacy =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = signTypedDataLegacy(
          Buffer.from(priv.toString(), 'hex'),
          {
            data,
          },
        );
        dispatch(
          LogActions.info(
            '[WC/walletConnectSignTypedDataLegacy]: signed message',
          ),
        );
        resolve(result);
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectSignTypedDataLegacy]: an error occurred while signing message',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectSignTypedData =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = signTypedData_v4(Buffer.from(priv.toString(), 'hex'), {
          data,
        });
        dispatch(
          LogActions.info('[WC/walletConnectSignTypedData]: signed message'),
        );
        resolve(result);
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectSignTypedData]: an error occurred while signing message',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectPersonalSign =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = personalSign(Buffer.from(priv.toString(), 'hex'), {
          data,
        });
        dispatch(
          LogActions.info('[WC/walletConnectPersonalSign]: signed message'),
        );
        resolve(result);
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC/walletConnectPersonalSign]: an error occurred while signing message',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectUpdateSession =
  (wallet: Wallet, chainId: string, peerId: string): Effect<Promise<any>> =>
  (dispatch, getState) => {
    return new Promise((resolve, reject) => {
      try {
        const {connectors: _connectors, sessions: _sessions} =
          getState().WALLET_CONNECT;
        const {keys} = getState().WALLET;
        const _chainId = parseInt(chainId, 16);
        const chain = Object.keys(EVM_BLOCKCHAIN_ID).find(
          key => EVM_BLOCKCHAIN_ID[key] === _chainId,
        );

        const newLinkedWallet = keys[wallet.keyId].wallets.find(
          w =>
            !IsERCToken(w.currencyAbbreviation, w.chain) &&
            w.receiveAddress === wallet.receiveAddress &&
            w.chain === chain,
        );

        if (newLinkedWallet) {
          let sessionToUpdate: IWCSession;

          const sessions = _sessions.map((s: IWCSession) => {
            if (
              s?.customData.walletId === wallet.id &&
              s?.session.peerId === peerId
            ) {
              s.session.chainId = _chainId;
              s.customData.walletId = newLinkedWallet.id;
              sessionToUpdate = s;
            }
            return s;
          });

          const connectors = _connectors.map((c: IWCConnector) => {
            if (
              c?.customData.walletId === sessionToUpdate?.customData.walletId &&
              sessionToUpdate?.session.peerId === peerId
            ) {
              c.connector.chainId = _chainId;
              c.customData.walletId = newLinkedWallet.id;
              c.connector.updateSession(sessionToUpdate.session);
            }
            return c;
          });

          dispatch(WalletConnectActions.updateSession(connectors, sessions));
          dispatch(
            LogActions.info('[WC/walletConnectUpdateSession]: session update'),
          );
          resolve(newLinkedWallet);
        } else {
          const chainName = chain ? PROTOCOL_NAME[chain][wallet.network] : null;
          dispatch(
            showBottomNotificationModal({
              type: 'info',
              title: t('WCSwitchNetworkTitle', {chain: chainName}),
              message: t('WCAddWalletMsg', {
                chain: chain?.toUpperCase(),
              }),
              enableBackdropDismiss: true,
              actions: [
                {
                  text: t('Add Wallet'),
                  action: async () => {
                    try {
                      dispatch(dismissBottomNotificationModal());
                      await sleep(500);
                      await dispatch(addNewLinkedWallet(wallet, chain!));
                      await sleep(500);
                      resolve(
                        dispatch(
                          walletConnectUpdateSession(wallet, chainId, peerId),
                        ),
                      );
                    } catch (err) {
                      reject(err);
                    }
                  },
                  primary: true,
                },
                {
                  text: t('Cancel'),
                  action: () => resolve(null),
                  primary: false,
                },
              ],
            }),
          );
        }
      } catch (err) {
        reject(err);
      }
    });
  };

const addNewLinkedWallet =
  (wallet: Wallet, chain: string): Effect<Promise<any>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {keys} = getState().WALLET;
        const key: Key = keys[wallet.keyId];
        let password: string | undefined;

        if (key.isPrivKeyEncrypted) {
          password = await dispatch(getDecryptPassword(key));
        }
        await dispatch(startOnGoingProcessModal('ADDING_WALLET'));

        const evmCoin = BitpaySupportedEvmCoins[chain];
        const _wallet = (await dispatch<any>(
          addWallet({
            key,
            currency: {
              chain,
              currencyAbbreviation: evmCoin.coin,
              isToken: false,
            },
            options: {
              password,
              network: wallet.network,
              account: wallet.credentials.account,
            },
            context: 'WalletConnect',
          }),
        )) as any;
        (await dispatch<any>(createWalletAddress({wallet: _wallet}))) as string;
        dispatch(dismissOnGoingProcessModal());
        await sleep(500);
        resolve(null);
      } catch (err: any) {
        if (err && err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        } else {
          dispatch(dismissOnGoingProcessModal());
          await sleep(500);
          dispatch(showBottomNotificationModal(err && err.message));
        }
        reject(err);
      }
    });
  };

const walletConnectGetChain =
  (wallet: Wallet, tokenAddress: string): Effect<Promise<string | undefined>> =>
  dispatch => {
    return new Promise(async resolve => {
      let contractAddressChain;
      try {
        dispatch(LogActions.info('[walletConnectGetChain]: starting'));
        for await (const chain of SUPPORTED_EVM_COINS) {
          try {
            const opts = {
              tokenAddress,
              chain,
              network: wallet.network,
            };
            const tokenContractInfo = await getTokenContractInfo(wallet, opts);
            if (Object.keys(tokenContractInfo).length > 0) {
              contractAddressChain = chain;
            }
          } catch (err) {
            dispatch(
              LogActions.debug(
                `[walletConnectGetChain]: contract address not found in ${chain}`,
              ),
            );
          }
        }
        dispatch(
          LogActions.info('[walletConnectGetChain]: get chain successfully'),
        );
        resolve(contractAddressChain);
      } catch (e) {
        let errorStr;
        if (e instanceof Error) {
          errorStr = e.message;
        } else {
          errorStr = JSON.stringify(e);
        }
        dispatch(
          LogActions.error(`[walletConnectGetChain] failed: ${errorStr}`),
        );
        resolve(undefined);
      }
    });
  };
