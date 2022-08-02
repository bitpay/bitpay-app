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
  dismissDecryptPasswordModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../app/app.actions';
import {checkEncryptPassword} from '../wallet/utils/wallet';
import {WrongPasswordError} from '../../navigation/wallet/components/ErrorMessages';
import {t} from 'i18next';
import {checkBiometricForSending} from '../wallet/effects/send/send';
import {useLogger} from '../../utils/hooks';

const BWC = BwcProvider.getInstance();

export const walletConnectInit = (): Effect => async (dispatch, getState) => {
  const logger = useLogger();
  try {
    logger.info('walletConnectInit: starting...');
    const {sessions} = getState().WALLET_CONNECT;
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
    logger.info('walletConnectInit: initialized successfully');
    dispatch(WalletConnectActions.successInitRequest(connectors || []));
    dispatch(walletConnectSubscribeToEvents());
  } catch (e: unknown) {
    const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error(
      `walletConnectInit: an error occurred while initializing: ${errorStr}`,
    );
    dispatch(WalletConnectActions.failedInitRquest());
  }
};

export const walletConnectOnSessionRequest =
  (uri: string): Effect<Promise<{peer: any; peerId: any}>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const logger = useLogger();
      const connector = new WalletConnect({uri});
      let isWaitingForEvent: boolean = true;
      connector.on('session_request', (error: any, payload: any) => {
        isWaitingForEvent = false;
        if (error) {
          reject(error);
        }
        const {pending} = getState().WALLET_CONNECT;
        dispatch(WalletConnectActions.sessionRequest([...pending, connector]));
        logger.info(
          `walletConnectOnSessionRequest: session request: ${JSON.stringify(
            payload.params[0],
          )}`,
        );
        resolve(payload.params[0]);
      });

      await sleep(5000);
      if (isWaitingForEvent) {
        // reject promise if Dapp doesn't respond
        const error = t(
          'Session request failed or rejected. Please try again by refreshing the QR code.',
        );
        logger.error(`walletConnectOnSessionRequest: ${error}`);
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
      const logger = useLogger();
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
        logger.info('walletConnectApproveSessionRequest: session approval');
        resolve();
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectApproveSessionRequest: an error occurred while approving session: ${errorStr}`,
        );
        reject(e);
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

    useLogger().info('walletConnectRejectSessionRequest: session rejection');
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

      wcConnector.connector.on('call_request', (error: any, payload: any) => {
        if (error) {
          throw error;
        }
        useLogger().info(
          `walletConnectSubscribeToEvent: new pending request: ${JSON.stringify(
            payload,
          )}`,
        );
        const updatedRequests: IWCRequest[] = [
          ...getState().WALLET_CONNECT.requests,
        ];

        updatedRequests.push({
          peerId,
          payload: payload,
          createdOn: Date.now(),
        });

        dispatch(WalletConnectActions.callRequest(updatedRequests));
      });

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
      const logger = useLogger();
      const {connectors} = getState().WALLET_CONNECT;
      await Promise.all(
        connectors.map(async c => {
          try {
            if (c.connector.peerId === peerId) {
              await c.connector.killSession();
              logger.info('walletConnectKillSession: session killed');
              resolve();
            }
          } catch (e: unknown) {
            const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
            logger.error(
              `walletConnectKillSession: an error occurred while killing session: ${errorStr}`,
            ),
              reject(e);
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
      const logger = useLogger();
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
        logger.info('walletConnectApproveCallRequest: call request approval');
        resolve();
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectApproveCallRequest: an error occurred while approving call request: ${errorStr}`,
        ),
          reject(e);
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
      const logger = useLogger();
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
        logger.info('walletConnectRejectCallRequest: call request rejection');
        resolve();
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectRejectCallRequest: an error occurred while rejecting call request: ${errorStr}`,
        );
        reject(e);
      }
    });
  };

const getPrivKey =
  (keyId: string): Effect<Promise<any>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const logger = useLogger();
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
          password = await new Promise<string>((_resolve, _reject) => {
            dispatch(
              showDecryptPasswordModal({
                onSubmitHandler: async (_password: string) => {
                  if (checkEncryptPassword(key, _password)) {
                    dispatch(dismissDecryptPasswordModal());
                    await sleep(500);
                    _resolve(_password);
                  } else {
                    dispatch(dismissDecryptPasswordModal());
                    await sleep(500);
                    dispatch(showBottomNotificationModal(WrongPasswordError()));
                    _reject('invalid password');
                  }
                },
                onCancelHandler: () => {
                  _reject('password canceled');
                },
              }),
            );
          });
        }

        const xPrivKey = password
          ? key.methods.get(password).xPrivKey
          : key.properties.xPrivKey;
        const bitcore = BWC.getBitcore();
        const xpriv = new bitcore.HDPrivateKey(xPrivKey);
        const priv = xpriv.deriveChild("m/44'/60'/0'/0/0").privateKey;
        logger.info('getPrivKey: got the private key successfully');
        resolve(priv);
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `getPrivKey: an error occurred while getting private key: ${errorStr}`,
        );
        reject(e);
      }
    });
  };

export const walletConnectSignTypedDataLegacy =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      const logger = useLogger();
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = signTypedDataLegacy(
          Buffer.from(priv.toString(), 'hex'),
          {
            data,
          },
        );
        logger.info('walletConnectSignTypedDataLegacy: signed message');
        resolve(result);
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectSignTypedDataLegacy: an error occurred while signing message: ${errorStr}`,
        );
        reject(e);
      }
    });
  };

export const walletConnectSignTypedData =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      const logger = useLogger();
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = signTypedData_v4(Buffer.from(priv.toString(), 'hex'), {
          data,
        });
        logger.info('walletConnectSignTypedData: signed message');
        resolve(result);
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectSignTypedData: an error occurred while signing message: ${errorStr}`,
        );
        reject(e);
      }
    });
  };

export const walletConnectPersonalSign =
  (data: any, wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, _getState) => {
    return new Promise(async (resolve, reject) => {
      const logger = useLogger();
      try {
        const priv = (await dispatch<any>(getPrivKey(wallet.keyId))) as any;
        const result = personalSign(Buffer.from(priv.toString(), 'hex'), {
          data,
        });
        logger.info('walletConnectPersonalSign: signed message');
        resolve(result);
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `walletConnectPersonalSign: an error occurred while signing message: ${errorStr}`,
        );
        reject(e);
      }
    });
  };
