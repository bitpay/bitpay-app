import {Effect} from '..';
import {
  EIP155_CHAINS,
  EIP155_SIGNING_METHODS,
  TEIP155Chain,
  WALLETCONNECT_V2_METADATA,
  WALLET_CONNECT_SUPPORTED_CHAINS,
} from '../../constants/WalletConnectV2';
import {BwcProvider} from '../../lib/bwc';
import {LogActions} from '../log';
import {SessionTypes, SignClientTypes} from '@walletconnect/types';
import {sleep} from '../../utils/helper-methods';
import {t} from 'i18next';
import {getSdkError} from '@walletconnect/utils';
import {WalletConnectV2Actions} from '.';
import {utils} from 'ethers';
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResult,
} from '@json-rpc-tools/utils';
import {Key, Wallet} from '../wallet/wallet.models';
import {checkBiometricForSending} from '../wallet/effects/send/send';
import {
  dismissDecryptPasswordModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../app/app.actions';
import {checkEncryptPassword} from '../wallet/utils/wallet';
import {WrongPasswordError} from '../../navigation/wallet/components/ErrorMessages';
import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';
import {ethers, providers} from 'ethers';
import {Core} from '@walletconnect/core';
import {ICore} from '@walletconnect/types';
import {Web3Wallet, IWeb3Wallet} from '@walletconnect/web3wallet';
import {WALLET_CONNECT_V2_PROJECT_ID} from '@env';

const BWC = BwcProvider.getInstance();

let core: ICore;
let web3wallet: IWeb3Wallet;

export const walletConnectV2Init = (): Effect => async dispatch => {
  try {
    core = new Core({
      projectId: WALLET_CONNECT_V2_PROJECT_ID,
    });
    web3wallet = await Web3Wallet.init({
      core,
      metadata: WALLETCONNECT_V2_METADATA,
    });

    const activeSessions = web3wallet.getActiveSessions();
    if (Object.keys(activeSessions).length) {
      dispatch(walletConnectV2SubscribeToEvents());
    }
    dispatch(
      LogActions.info(
        '[WC-V2/walletConnectV2Init]: client initialized successfully',
      ),
    );
  } catch (e) {
    dispatch(
      LogActions.error(
        `[WC-V2/walletConnectV2Init]: an error occurred while initializing client: ${e}`,
      ),
    );
  }
};

export const walletConnectV2OnSessionProposal =
  (
    uri: string,
  ): Effect<Promise<SignClientTypes.EventArguments['session_proposal']>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        let isWaitingForEvent: boolean = true;
        if (!web3wallet) {
          web3wallet = await Web3Wallet.init({
            core,
            metadata: WALLETCONNECT_V2_METADATA,
          });
        }
        await web3wallet.core.pairing.pair({uri});
        web3wallet.on(
          'session_proposal',
          (proposal: SignClientTypes.EventArguments['session_proposal']) => {
            isWaitingForEvent = false;
            dispatch(WalletConnectV2Actions.sessionProposal());
            dispatch(
              LogActions.info(
                `[WC-V2/walletConnectV2OnSessionProposal]: session proposal: ${JSON.stringify(
                  proposal,
                )}`,
              ),
            );
            resolve(proposal);
          },
        );
        await sleep(5000);
        if (isWaitingForEvent) {
          // reject promise if Dapp doesn't respond
          const error = t(
            'Session request failed or rejected. Please try again by refreshing the QR code.',
          );
          dispatch(
            LogActions.error(
              `[WC-V2/walletConnectV2OnSessionProposal]: ${error}`,
            ),
          );
          throw error;
        }
      } catch (e) {
        dispatch(
          LogActions.error(`[WC-V2/walletConnectV2OnSessionProposal]: ${e}`),
        );
        reject(e);
      }
    });
  };

export const walletConnectV2ApproveSessionProposal =
  (
    id: number,
    relayProtocol: string,
    namespaces: SessionTypes.Namespaces,
    pairingTopic: string,
  ): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = await web3wallet.approveSession({
          id,
          relayProtocol,
          namespaces,
        });
        dispatch(
          WalletConnectV2Actions.approveSessionProposal({
            ...session,
            pairingTopic,
          }),
        );
        dispatch(walletConnectV2SubscribeToEvents());
        resolve();
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC-V2/walletConnectV2ApproveSessionProposal]: an error occurred while approving session.',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectV2RejectSessionProposal =
  (id: number): Effect =>
  async dispatch => {
    try {
      await web3wallet.rejectSession({
        id,
        reason: getSdkError('USER_REJECTED_METHODS'),
      });

      dispatch(
        LogActions.info(
          '[WC-V2/walletConnectV2RejectSessionProposal]: session proposal rejection',
        ),
      );
    } catch (e) {
      dispatch(
        LogActions.error(
          '[WC-V2/walletConnectV2RejectSessionProposal]: an error occurred while rejecting session.',
        ),
      );
    }
  };

export const walletConnectV2SubscribeToEvents =
  (): Effect => (dispatch, getState) => {
    web3wallet.on('session_request', (event: any) => {
      dispatch(
        LogActions.info(
          `[WC-V2/walletConnectV2SubscribeToEvents]: new pending request: ${JSON.stringify(
            event,
          )}`,
        ),
      );
      if (
        Object.keys(WALLET_CONNECT_SUPPORTED_CHAINS).includes(
          event.params.chainId,
        )
      ) {
        dispatch(
          WalletConnectV2Actions.sesionRequest({
            ...event,
            createdOn: Date.now(),
          }),
        );
      }
    });
    web3wallet.on('session_delete', async data => {
      const {topic} = data;
      const session: WCV2SessionType | undefined =
        getState().WALLET_CONNECT_V2.sessions.find(
          (session: WCV2SessionType) => session.topic === topic,
        );
      const {pairingTopic} = session || {};
      if (pairingTopic) {
        dispatch(walletConnectV2OnDeleteSession(topic, pairingTopic));
      }
      dispatch(WalletConnectV2DeleteSessions(topic));
      dispatch(WalletConnectV2UpdateRequests({topic}));
      dispatch(
        LogActions.info(
          `[WC-V2/walletConnectV2SubscribeToEvents]: session disconnected: ${topic}`,
        ),
      );
    });
  };

export const walletConnectV2ApproveCallRequest =
  (request: WCV2RequestType, wallet: Wallet): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      const {topic, id} = request;
      try {
        const response = await dispatch(approveEIP155Request(request, wallet));
        await web3wallet.respondSessionRequest({
          topic,
          response,
        });
        dispatch(WalletConnectV2UpdateRequests({id}));
        dispatch(
          LogActions.info(
            '[WC-V2/walletConnectV2ApproveCallRequest]: call request approval',
          ),
        );
        await sleep(500);
        resolve();
      } catch (err) {
        dispatch(WalletConnectV2UpdateRequests({id}));
        dispatch(
          LogActions.error(
            '[WC-V2/walletConnectV2ApproveCallRequest]: an error occurred while approving call request',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectV2RejectCallRequest =
  (request: WCV2RequestType): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      const {id, topic} = request;
      try {
        const response = formatJsonRpcError(
          id,
          getSdkError('USER_REJECTED_METHODS').message,
        );
        await web3wallet.respondSessionRequest({
          topic,
          response,
        });
        dispatch(WalletConnectV2UpdateRequests({id}));
        dispatch(
          LogActions.info(
            '[WC-V2/walletConnectV2RejectCallRequest]: call request rejection',
          ),
        );
        resolve();
      } catch (err) {
        dispatch(WalletConnectV2UpdateRequests({id}));
        dispatch(
          LogActions.error(
            '[WC-V2/walletConnectV2RejectCallRequest]: an error occurred while rejecting call request',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

export const walletConnectV2OnDeleteSession =
  (topic: string, pairingTopic: string): Effect =>
  async dispatch => {
    try {
      if (!web3wallet) {
        web3wallet = await Web3Wallet.init({
          core,
          metadata: WALLETCONNECT_V2_METADATA,
        });
      }
      await web3wallet.disconnectSession({
        topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
      await web3wallet.core.pairing.disconnect({
        topic: pairingTopic,
      });
      dispatch(WalletConnectV2DeleteSessions(topic));
      dispatch(WalletConnectV2UpdateRequests({topic}));
      dispatch(
        LogActions.info(
          '[WC-V2/walletConnectV2OnDeleteSession]: session disconnected',
        ),
      );
    } catch (err) {
      dispatch(WalletConnectV2DeleteSessions(topic));
      dispatch(
        LogActions.error(
          '[WC-V2/walletConnectV2OnDeleteSession]: an error occurred while deleting session',
        ),
      );
      dispatch(LogActions.error(JSON.stringify(err)));
    }
  };

export const walletConnectV2OnUpdateSession =
  ({
    session,
    address,
    selectedWallets,
    action,
  }: {
    session: WCV2SessionType;
    address?: string;
    selectedWallets?: any;
    action: string;
  }): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!web3wallet) {
          web3wallet = await Web3Wallet.init({
            core,
            metadata: WALLETCONNECT_V2_METADATA,
          });
        }

        const namespaces: SessionTypes.Namespaces = {};
        const {
          namespaces: _namespaces,
          topic,
          pairingTopic,
          requiredNamespaces,
        } = session;
        let hasAccounts: boolean = false;

        if (action === 'disconnect' && address) {
          Object.keys(_namespaces).forEach(key => {
            const accounts: string[] = _namespaces[key].accounts.filter(
              account => !account.includes(address),
            );
            if (accounts.length > 0) {
              hasAccounts = true;
            }
            namespaces[key] = {
              accounts: [...new Set(accounts)],
              methods: _namespaces[key].methods,
              events: _namespaces[key].events,
            };
          });
        } else if (action === 'add_accounts' && session) {
          hasAccounts = true;
          requiredNamespaces &&
            Object.keys(requiredNamespaces).forEach(key => {
              const accounts: string[] = [];
              requiredNamespaces[key].chains?.map((chain: string) => {
                selectedWallets.forEach((selectedWallet: any) => {
                  accounts.push(`${chain}:${selectedWallet.address}`);
                });
              });
              namespaces[key] = {
                accounts: [
                  ...new Set([..._namespaces[key].accounts, ...accounts]),
                ],
                methods: requiredNamespaces[key].methods,
                events: requiredNamespaces[key].events,
              };
            });
        }

        if (!hasAccounts) {
          dispatch(
            LogActions.info(
              "[WC-V2/walletConnectV2OnUpdateSession]: session disconnected. Namespaces accounts don't satisfy requiredNamespaces",
            ),
          );
          dispatch(walletConnectV2OnDeleteSession(topic, pairingTopic));
          resolve();
        } else {
          await web3wallet.updateSession({
            topic,
            namespaces,
          });
          dispatch(
            LogActions.info(
              '[WC-V2/walletConnectV2OnUpdateSession]: session updated',
            ),
          );
          dispatch(WalletConnectV2UpdateSession({...session, ...{namespaces}}));
          resolve();
        }
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC-V2/walletConnectV2OnUpdateSession]: an error occurred while updating session',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

const approveEIP155Request =
  (
    requestEvent: WCV2RequestType,
    wallet: Wallet,
  ): Effect<Promise<JsonRpcResult<string>>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const privKey = (await dispatch<any>(getPrivKey(wallet))) as any;
        const signer = new ethers.Wallet(
          Buffer.from(privKey.toString(), 'hex'),
        );
        const {params, id} = requestEvent;
        const {chainId, request} = params;
        switch (request.method) {
          case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          case EIP155_SIGNING_METHODS.ETH_SIGN:
            const message = getSignParamsMessage(request.params);
            const signedMessage = await signer.signMessage(message);
            resolve(formatJsonRpcResult(id, signedMessage));
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
          case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
            const {
              domain,
              types,
              message: data,
            } = getSignTypedDataParamsData(request.params);
            // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
            delete types.EIP712Domain;
            const signedData = await signer._signTypedData(domain, types, data);
            resolve(formatJsonRpcResult(id, signedData));
          case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
            const provider = new providers.JsonRpcProvider(
              EIP155_CHAINS[chainId as TEIP155Chain].rpc,
            );
            const sendTransaction = request.params[0];
            const connectedWallet = signer.connect(provider);
            const {hash} = await connectedWallet.sendTransaction(
              sendTransaction,
            );
            resolve(formatJsonRpcResult(id, hash));

          case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
            const signTransaction = request.params[0];
            const signature = await signer.signTransaction(signTransaction);
            resolve(formatJsonRpcResult(id, signature));

          default:
            throw new Error(getSdkError('INVALID_METHOD').message);
        }
      } catch (err) {
        reject(err);
      }
    });
  };

export const getAddressFrom = (request: WCV2RequestType): string => {
  let addressFrom: string = '';
  const {params: _params} = request;
  if (_params) {
    const {method, params} = _params.request;
    switch (method) {
      case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        addressFrom = params[1];
        break;
      case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        addressFrom = params[0].from;
        break;
      case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
        addressFrom = params[0].from;
        break;
      case EIP155_SIGNING_METHODS.ETH_SIGN:
        addressFrom = params[0];
        break;
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        addressFrom = params[0];
        break;
      default:
        break;
    }
  }
  return addressFrom;
};

const getPrivKey =
  (wallet: Wallet): Effect<Promise<any>> =>
  (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {keys} = getState().WALLET;
        const {biometricLockActive} = getState().APP;
        const key: Key = keys[wallet.keyId];

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
          ? key.methods!.get(password).xPrivKey
          : key.properties!.xPrivKey;
        const bitcore = BWC.getBitcore();
        const xpriv = new bitcore.HDPrivateKey(xPrivKey, wallet.network);
        const priv = xpriv.deriveChild(
          `${wallet.getRootPath()}/0/0`,
        ).privateKey;
        dispatch(
          LogActions.info(
            '[WC-V2/getPrivKey]: got the private key successfully',
          ),
        );
        resolve(priv);
      } catch (err) {
        dispatch(
          LogActions.error(
            '[WC-V2/getPrivKey]: an error occurred while getting private key',
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        reject(err);
      }
    });
  };

const convertHexToUtf8 = (value: string) => {
  if (utils.isHexString(value)) {
    return utils.toUtf8String(value);
  }

  return value;
};

const getSignParamsMessage = (params: string[]) => {
  const message = params.filter(p => !utils.isAddress(p))[0];

  return convertHexToUtf8(message);
};

const getSignTypedDataParamsData = (params: string[]) => {
  const data = params.filter(p => !utils.isAddress(p))[0];

  if (typeof data === 'string') {
    return JSON.parse(data);
  }

  return data;
};

const WalletConnectV2UpdateRequests =
  ({id, topic}: {id?: number; topic?: string}): Effect =>
  (dispatch, getState) => {
    const updatedRequests: WCV2RequestType[] =
      getState().WALLET_CONNECT_V2.requests.filter((request: WCV2RequestType) =>
        id ? request.id !== id : request.topic !== topic,
      );
    dispatch(WalletConnectV2Actions.updateRequests(updatedRequests));
  };

const WalletConnectV2DeleteSessions =
  (topic: string): Effect =>
  (dispatch, getState) => {
    const updatedSessions: WCV2SessionType[] =
      getState().WALLET_CONNECT_V2.sessions.filter(
        (session: WCV2SessionType) => session.topic !== topic,
      );
    dispatch(WalletConnectV2Actions.updateSessions(updatedSessions));
  };

const WalletConnectV2UpdateSession =
  (updatedSession: WCV2SessionType): Effect =>
  (dispatch, getState) => {
    const allSessions: WCV2SessionType[] =
      getState().WALLET_CONNECT_V2.sessions;
    allSessions.forEach((session, index) => {
      if (session.topic === updatedSession.topic) {
        allSessions[index] = updatedSession;
      }
    });
    dispatch(WalletConnectV2Actions.updateSessions([...new Set(allSessions)]));
  };
