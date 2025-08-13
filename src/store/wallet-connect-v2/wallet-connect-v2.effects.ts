import {Effect} from '..';
import {
  WC_SUPPORTED_CHAINS,
  EIP155_SIGNING_METHODS,
  EIP155_METHODS_NOT_INTERACTION_NEEDED,
  WcSupportedChain,
  WALLETCONNECT_V2_METADATA,
  WALLET_CONNECT_SUPPORTED_CHAINS,
  WC_EVENTS,
  SOLANA_SIGNING_METHODS,
} from '../../constants/WalletConnectV2';
import {BwcProvider} from '../../lib/bwc';
import {LogActions} from '../log';
import {
  AuthTypes,
  ProposalTypes,
  SessionTypes,
  Verify,
} from '@walletconnect/types';
import {
  processOtherMethodsRequest,
  processSolanaSwapRequest,
  processSwapRequest,
  sleep,
} from '../../utils/helper-methods';
import {BuildApprovedNamespacesParams, getSdkError} from '@walletconnect/utils';
import {WalletConnectV2Actions} from '.';
import {utils} from 'ethers';
import {
  formatJsonRpcError,
  formatJsonRpcResult,
  JsonRpcResult,
} from '@json-rpc-tools/utils';
import {Key, Wallet} from '../wallet/wallet.models';
import {
  checkBiometricForSending,
  getEstimateGas,
} from '../wallet/effects/send/send';
import {
  dismissDecryptPasswordModal,
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showDecryptPasswordModal,
} from '../app/app.actions';
import {
  checkEncryptPassword,
  findWalletByAddress,
} from '../wallet/utils/wallet';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../navigation/wallet/components/ErrorMessages';
import {WCV2RequestType, WCV2SessionType} from './wallet-connect-v2.models';
import {ethers, providers} from 'ethers';
import {Core} from '@walletconnect/core';
import {WalletKit, IWalletKit, WalletKitTypes} from '@reown/walletkit';
import {WALLET_CONNECT_V2_PROJECT_ID} from '@env';
import {startInAppNotification} from '../app/app.effects';
import {navigationRef} from '../../Root';
import {sessionProposal} from './wallet-connect-v2.actions';
import {buildApprovedNamespaces} from '@walletconnect/utils';
import {getFeeLevelsUsingBwcClient} from '../wallet/effects/fee/fee';
import {AppActions} from '../app';
import {t} from 'i18next';
import {BottomNotificationConfig} from '../../components/modal/bottom-notification/BottomNotification';
import bs58 from 'bs58';
import {IsSVMChain} from '../wallet/utils/currency';
import {
  getBase64Encoder,
  getTransactionDecoder,
  getCompiledTransactionMessageDecoder,
  getBase58Encoder,
  createKeyPairFromPrivateKeyBytes,
  signTransaction,
  getBase64EncodedWireTransaction,
  partiallySignTransaction,
  signBytes,
  getBase58Decoder,
  ReadonlyUint8Array,
} from '@solana/kit';

const BWC = BwcProvider.getInstance();

let core = new Core({
  projectId: WALLET_CONNECT_V2_PROJECT_ID,
});
let web3wallet: IWalletKit;

const checkCredentials = () => {
  return WALLET_CONNECT_V2_PROJECT_ID && WALLETCONNECT_V2_METADATA;
};

export const formatAuthMessage = ({
  authPayload,
  iss,
}: {
  authPayload: AuthTypes.PayloadParams;
  iss: string;
}) => {
  const message = web3wallet.formatAuthMessage({
    request: authPayload,
    iss,
  });
  return message;
};

export const walletConnectV2approveSessionAuthenticateProposal =
  (
    id: number,
    pairingTopic: string,
    proposalParams: AuthTypes.AuthRequestEventArgs,
    auths: AuthTypes.Cacao[],
    accounts: string[],
    chains: string[],
    verifyContext: Verify.Context | undefined,
  ): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.debug(
            '[WC-V2/walletConnectV2approveSessionAuthenticateProposal]: approving session authenticate proposal with proposal',
          ),
        );
        const {session} = await web3wallet.approveSessionAuthenticate({
          id,
          auths,
        });
        if (!session) {
          throw new Error('Session is undefined');
        }
        dispatch(
          WalletConnectV2Actions.approveSessionProposal({
            ...session,
            pairingTopic,
            proposalParams,
            accounts,
            chains,
            verifyContext,
          }),
        );
        dispatch(sessionProposal());
        resolve();
      } catch (err) {
        await web3wallet.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED'),
        });
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/walletConnectV2ApproveSessionProposal]: an error occurred while approving session: ${errMsg}`,
          ),
        );
        reject(err);
      }
    });
  };

export const walletConnectV2Init = (): Effect => async (dispatch, getState) => {
  try {
    dispatch(LogActions.info('walletConnectV2Init: starting...'));

    if (!checkCredentials()) {
      dispatch(LogActions.error('walletConnectV2Init: credentials not found'));
      return;
    }

    web3wallet = await WalletKit.init({
      core,
      metadata: WALLETCONNECT_V2_METADATA,
    });
    dispatch(walletConnectV2SubscribeToEvents());

    // remove inactive connections if they exist
    const activeSessions = web3wallet.getActiveSessions();
    const sessions: WCV2SessionType[] | undefined =
      getState().WALLET_CONNECT_V2.sessions;

    Object.values(activeSessions).forEach(activeSession => {
      if (
        sessions.length &&
        !sessions.some(s => s.topic === activeSession.topic)
      ) {
        dispatch(walletConnectV2OnDeleteSession(activeSession.topic));
      }
    });

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
  (uri: string): Effect<Promise<void>> =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!web3wallet) {
          web3wallet = await WalletKit.init({
            core,
            metadata: WALLETCONNECT_V2_METADATA,
          });
        }
        await web3wallet.pair({uri});
        resolve();
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
    proposalParams: ProposalTypes.Struct,
    accounts: string[],
    chains: string[],
    verifyContext: Verify.Context | undefined,
  ): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.debug(
            `[WC-V2/walletConnectV2ApproveSessionProposal]: approving session with namesapces: ${JSON.stringify(
              namespaces,
            )}`,
          ),
        );
        const session = await web3wallet.approveSession({
          id,
          relayProtocol,
          namespaces,
        });
        dispatch(
          WalletConnectV2Actions.approveSessionProposal({
            ...session,
            pairingTopic,
            proposalParams,
            accounts,
            chains,
            verifyContext,
          }),
        );
        dispatch(sessionProposal());
        resolve();
      } catch (err) {
        await web3wallet.rejectSession({
          id,
          reason: getSdkError('USER_REJECTED'),
        });
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/walletConnectV2ApproveSessionProposal]: an error occurred while approving session: ${errMsg}`,
          ),
        );
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
      dispatch(sessionProposal());
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
    web3wallet.on(
      'session_proposal',
      (proposal: WalletKitTypes.EventArguments['session_proposal']) => {
        dispatch(WalletConnectV2Actions.sessionProposal(proposal));
        dispatch(AppActions.showWalletConnectStartModal());
        dispatch(
          LogActions.info(
            `[WC-V2/walletConnectV2OnSessionProposal]: session proposal: ${JSON.stringify(
              proposal,
            )}`,
          ),
        );
      },
    );
    web3wallet.on(
      'session_request',
      async (event: WalletKitTypes.EventArguments['session_request']) => {
        dispatch(
          LogActions.info(
            `[WC-V2/walletConnectV2SubscribeToEvents]: new pending request: ${JSON.stringify(
              event,
            )}`,
          ),
        );

        const isChainSupported = Object.keys(
          WALLET_CONNECT_SUPPORTED_CHAINS,
        ).includes(event.params.chainId);
        const isMethodSupported = Object.values({
          ...EIP155_SIGNING_METHODS,
          ...SOLANA_SIGNING_METHODS,
        }).includes(event.params.request.method);

        if (!isChainSupported || !isMethodSupported) {
          return;
        }

        // If method doesn't require user interaction, auto-approve
        if (
          EIP155_METHODS_NOT_INTERACTION_NEEDED.includes(
            event.params.request.method,
          )
        ) {
          await handleAutoApproval(event);
          return;
        }

        // Process the request that requires user interaction
        await handleUserInteraction(event);
      },
    );

    const handleAutoApproval = async (
      event: WalletKitTypes.EventArguments['session_request'],
    ) => {
      const chainId = event?.params?.chainId;

      if (!chainId) {
        return;
      }

      await web3wallet.respondSessionRequest({
        topic: event.topic,
        response: formatJsonRpcResult(event.id, null),
      });

      try {
        if (WC_SUPPORTED_CHAINS[chainId as WcSupportedChain]) {
          await emitSessionEvents(event, chainId);
        } else {
          throw new Error(`The requested chain (${chainId}) is not supported.`);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/handleAutoApproval]: an error occurred while emiting session event: ${errMsg}`,
          ),
        );
        const bottomNotificationConfig: BottomNotificationConfig =
          CustomErrorMessage({
            errMsg: `An error occurred while emiting session event: ${errMsg}`,
            title: t('Uh oh, something went wrong'),
          });
        dispatch(showBottomNotificationModal(bottomNotificationConfig));
      }
    };

    const handleUserInteraction = async (
      event: WalletKitTypes.EventArguments['session_request'],
    ) => {
      const {name: currentRouteName} =
        (navigationRef.current?.getCurrentRoute() as any) || {};

      try {
        let processedRequestData = {};

        if (
          event.params.request.method ===
          EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION
        ) {
          processedRequestData = await dispatch(processSwapRequest(event));
        } else if (
          [
            SOLANA_SIGNING_METHODS.SIGN_TRANSACTION,
            SOLANA_SIGNING_METHODS.SIGN_AND_SEND_TRANSACTION,
          ].includes(event.params.request.method)
        ) {
          processedRequestData = await dispatch(
            processSolanaSwapRequest(event),
          );
        } else {
          processedRequestData = await dispatch(
            processOtherMethodsRequest(event),
          );
        }

        dispatch(
          WalletConnectV2Actions.sessionRequest({
            ...event,
            ...processedRequestData,
            createdOn: Date.now(),
          }),
        );

        if (currentRouteName !== 'WalletConnectHome') {
          await sleep(1000);
          dispatch(
            startInAppNotification(
              'NEW_PENDING_REQUEST',
              event,
              'notification',
            ),
          );
        }
      } catch (error) {
        console.error(`Error processing request ID ${event.id}:`, error);
      }
    };

    const parseAndFormatChainId = (chainId: string) => {
      const parsedChainId = chainId.startsWith('0x')
        ? parseInt(chainId, 16)
        : parseInt(chainId, 10);
      return `eip155:${parsedChainId}`;
    };

    const emitSessionEvents = async (
      event: WalletKitTypes.EventArguments['session_request'],
      eip155ChainId: string,
    ) => {
      const chainChanged = {
        topic: event.topic,
        event: {
          name: 'chainChanged',
          data: parseInt(eip155ChainId.split(':')[1], 10),
        },
        chainId: eip155ChainId,
      };

      const session: WCV2SessionType | undefined =
        getState().WALLET_CONNECT_V2.sessions.find(
          (session: WCV2SessionType) => session.topic === event.topic,
        );

      const address = session?.accounts[0].split(':')[2];
      const accountsChanged = {
        topic: event.topic,
        event: {name: 'accountsChanged', data: [`${eip155ChainId}:${address}`]},
        chainId: eip155ChainId,
      };

      await web3wallet.emitSessionEvent(chainChanged);
      await web3wallet.emitSessionEvent(accountsChanged);
    };

    web3wallet.on(
      'session_delete',
      async (data: WalletKitTypes.EventArguments['session_delete']) => {
        try {
          const {topic} = data;
          const session: WCV2SessionType | undefined =
            getState().WALLET_CONNECT_V2.sessions.find(
              (session: WCV2SessionType) => session.topic === topic,
            );
          const {pairingTopic} = session || {};
          if (pairingTopic) {
            await web3wallet.core.pairing.disconnect({
              topic: pairingTopic,
            });
          }
          dispatch(WalletConnectV2DeleteSessions(topic));
          dispatch(WalletConnectV2UpdateRequests({topic}));
          dispatch(
            LogActions.info(
              `[WC-V2/walletConnectV2SubscribeToEvents]: session disconnected: ${topic}`,
            ),
          );
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(
            LogActions.error(
              `[WC-V2/walletConnectV2SubscribeToEvents]: an error occurred while disconnecting session: ${errMsg}`,
            ),
          );
        }
      },
    );
    web3wallet.on(
      'session_authenticate',
      async (
        proposal: WalletKitTypes.EventArguments['session_authenticate'],
      ) => {
        dispatch(WalletConnectV2Actions.sessionProposal(proposal));
        dispatch(AppActions.showWalletConnectStartModal());
        try {
          dispatch(
            LogActions.info(
              `[WC-V2/walletConnectV2SubscribeToEvents] auth request: ${JSON.stringify(
                proposal,
              )}`,
            ),
          );
        } catch (error) {}
      },
    );
    web3wallet.on(
      'session_request_expire',
      async (
        event: WalletKitTypes.EventArguments['session_request_expire'],
      ) => {
        try {
          dispatch(
            LogActions.info(
              `[WC-V2/walletConnectV2SubscribeToEvents] session_request_expire: ${JSON.stringify(
                event,
              )}`,
            ),
          );
          const requests: WCV2RequestType[] | undefined =
            getState().WALLET_CONNECT_V2.requests;
          const request = requests.find(({id}) => id === event.id);
          if (request) {
            await dispatch(walletConnectV2RejectCallRequest(request));
          }
        } catch (error) {}
      },
    );
  };

export const walletConnectV2ApproveCallRequest =
  (
    request: WCV2RequestType,
    wallet: Wallet,
    response?: JsonRpcResult<string>,
  ): Effect<Promise<void>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      const {topic, id} = request;
      try {
        if (!response) {
          response = await dispatch(approveWCRequest(request, wallet));
          dispatch(
            LogActions.info(
              `[WC-V2/walletConnectV2ApproveCallRequest]: approve response: ${JSON.stringify(
                response,
              )}`,
            ),
          );
        }
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
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/walletConnectV2ApproveCallRequest]: an error occurred while approving call request: ${errMsg}`,
          ),
        );
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
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/walletConnectV2RejectCallRequest]: an error occurred while rejecting call request: ${errMsg}`,
          ),
        );
        reject(err);
      }
    });
  };

export const walletConnectV2OnDeleteSession =
  (topic: string, pairingTopic?: string): Effect<Promise<void>> =>
  async dispatch => {
    return new Promise(async resolve => {
      try {
        if (!web3wallet) {
          web3wallet = await WalletKit.init({
            core,
            metadata: WALLETCONNECT_V2_METADATA,
          });
        }
        await web3wallet.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        });

        if (pairingTopic) {
          await web3wallet.core.pairing.disconnect({
            topic: pairingTopic,
          });
        }
        dispatch(WalletConnectV2DeleteSessions(topic));
        dispatch(WalletConnectV2UpdateRequests({topic}));
        dispatch(
          LogActions.info(
            '[WC-V2/walletConnectV2OnDeleteSession]: session disconnected',
          ),
        );
        resolve();
      } catch (err) {
        dispatch(WalletConnectV2DeleteSessions(topic));
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.warn(
            `[WC-V2/walletConnectV2OnDeleteSession]: an error occurred while deleting session: ${errMsg}`,
          ),
        );
        resolve();
      }
    });
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
    selectedWallets?: {
      chain: string;
      address: string;
      network: string;
      supportedChain: string;
    }[];
    action: string;
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      if (!web3wallet) {
        web3wallet = await WalletKit.init({
          core,
          metadata: WALLETCONNECT_V2_METADATA,
        });
      }

      let namespaces: SessionTypes.Namespaces = {};
      const {
        namespaces: _namespaces,
        topic,
        pairingTopic,
        requiredNamespaces,
        optionalNamespaces,
      } = session;
      let {accounts: _accounts = [], chains: _chains} = session;
      let hasAccounts: boolean = false;

      if (action === 'disconnect' && address) {
        if (_accounts.length === 0 || _chains.length === 0) {
          Object.keys(requiredNamespaces || {})
            .concat(Object.keys(optionalNamespaces || {}))
            .forEach(key => {
              _accounts = [
                ...new Set([..._namespaces[key].accounts, ..._accounts]),
              ];
              _chains = [
                ...new Set([...(_namespaces[key].chains || []), ..._chains]),
              ];
            });
        }

        const accounts: string[] = _accounts.filter(
          account => !account.includes(address),
        );
        let chains = accounts.length > 0 ? _chains : []; // reset chains if no accounts
        hasAccounts = accounts.length > 0;

        namespaces = buildApprovedNamespaces({
          proposal: session.proposalParams,
          supportedNamespaces: {
            eip155: {
              chains,
              methods: Object.values(EIP155_SIGNING_METHODS),
              events: WC_EVENTS,
              accounts,
            },
          },
        } as BuildApprovedNamespacesParams);
      } else if (action === 'add_accounts' && session) {
        hasAccounts = true;
        if (_accounts.length === 0 || _chains.length === 0) {
          Object.keys(requiredNamespaces || {})
            .concat(Object.keys(optionalNamespaces || {}))
            .forEach(key => {
              _accounts = [
                ...new Set([..._namespaces[key].accounts, ..._accounts]),
              ];
              _chains = [
                ...new Set([...(_namespaces[key].chains || []), ..._chains]),
              ];
            });
        }
        const accounts: string[] = [];
        const chains: string[] = [];
        (selectedWallets || []).forEach(selectedWallet => {
          accounts.push(
            `${selectedWallet.supportedChain}:${selectedWallet.address}`,
          );
          chains.push(selectedWallet.supportedChain);
        });
        namespaces = buildApprovedNamespaces({
          proposal: session.proposalParams,
          supportedNamespaces: {
            eip155: {
              chains: [...new Set([..._chains, ...chains])],
              methods: Object.values(EIP155_SIGNING_METHODS),
              events: WC_EVENTS,
              accounts: [...new Set([..._accounts, ...accounts])],
            },
          },
        } as BuildApprovedNamespacesParams);
      }

      if (!hasAccounts) {
        dispatch(
          LogActions.info(
            "[WC-V2/walletConnectV2OnUpdateSession]: session disconnected. Namespaces accounts don't satisfy requiredNamespaces",
          ),
        );
        await dispatch(walletConnectV2OnDeleteSession(topic, pairingTopic));
        Promise.resolve();
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
        Promise.resolve();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `[WC-V2/walletConnectV2OnUpdateSession]: an error occurred while updating session: ${errMsg}`,
        ),
      );
      if (
        errMsg.includes('No accounts provided for chain') ||
        errMsg.includes('Non conforming namespaces')
      ) {
        throw new Error(
          "Removing this account will invalidate the session's required namespaces. Please disconnect the entire session and reconnect.",
        );
      }
      throw err;
    }
  };

const approveWCRequest =
  (
    requestEvent: WCV2RequestType,
    wallet: Wallet,
  ): Effect<Promise<JsonRpcResult<string>>> =>
  dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const privKey = (await dispatch<any>(getPrivKey(wallet))) as string;
        const privKeyBuffer = Buffer.from(privKey, 'hex');
        const signer = new ethers.Wallet(privKeyBuffer);
        const {params, id} = requestEvent;
        const {chainId, request} = params;
        const cwcSolTransaction = await BWC.getCore().Transactions.get({
          chain: 'SOL',
        });
        switch (request.method) {
          case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
          case EIP155_SIGNING_METHODS.ETH_SIGN:
            const eth_message = getSignParamsMessage(request.params);
            const eth_signedMessage = await signer.signMessage(eth_message);
            resolve(formatJsonRpcResult(id, eth_signedMessage));
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
            break;
          // deprecated - using bws for sending transaction
          case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
            const provider = new providers.JsonRpcProvider(
              WC_SUPPORTED_CHAINS[chainId as WcSupportedChain].rpc,
            );
            const sendTransaction = request.params[0];
            if (sendTransaction.gas) {
              sendTransaction.gasLimit = sendTransaction.gas;
              delete sendTransaction.gas;
            }
            if (!sendTransaction.gasLimit) {
              sendTransaction.gasLimit = await getEstimateGas({
                wallet: wallet as Wallet,
                network: wallet.network,
                value: sendTransaction.amount || 0,
                from: sendTransaction.from,
                to: sendTransaction.to,
                data: sendTransaction.data,
                chain: WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain,
              });
            }
            if (sendTransaction.chainId) {
              delete sendTransaction.chainId;
            }
            if (sendTransaction.type) {
              delete sendTransaction.type;
            }

            if (
              !sendTransaction.maxFeePerGas &&
              !sendTransaction.maxPriorityFeePerGas
            ) {
              if (!sendTransaction.gasPrice) {
                const feeLevels = await getFeeLevelsUsingBwcClient(
                  WALLET_CONNECT_SUPPORTED_CHAINS[chainId]?.chain,
                  wallet.network,
                );
                const urgentFee = feeLevels.find(
                  ({level}) => level === 'urgent',
                );
                if (urgentFee?.feePerKb) {
                  sendTransaction.gasPrice = urgentFee?.feePerKb;
                }
              }
            } else {
              sendTransaction.type = 2;
            }
            dispatch(
              LogActions.info(
                `[WC-V2/approveWCRequest]: ETH_SEND_TRANSACTION: ${JSON.stringify(
                  sendTransaction,
                )}`,
              ),
            );
            const connectedWallet = signer.connect(provider);
            const {hash} = await connectedWallet.sendTransaction(
              sendTransaction,
            );
            resolve(formatJsonRpcResult(id, hash));
            break;

          case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
            const signTransaction = request.params[0];
            const signature = await signer.signTransaction(signTransaction);
            resolve(formatJsonRpcResult(id, signature));
            break;

          case SOLANA_SIGNING_METHODS.SIGN_MESSAGE:
            const sol_signedMessage = await cwcSolTransaction.signMessage({
              messageBytes: bs58.decode(request.params.message),
              key: {privKey: bs58.encode(privKeyBuffer)},
            });
            resolve(
              formatJsonRpcResult<any>(id, {signature: sol_signedMessage}),
            );
            break;

          case SOLANA_SIGNING_METHODS.SIGN_TRANSACTION:
          case SOLANA_SIGNING_METHODS.SIGN_AND_SEND_TRANSACTION:
            const {transaction: base64Tx} = request.params;
            const versionedTx = getTransactionDecoder().decode(
              getBase64Encoder().encode(base64Tx),
            );
            const decodedMessage =
              getCompiledTransactionMessageDecoder().decode(
                versionedTx.messageBytes,
              );
            const signerCount = decodedMessage?.header?.numSignerAccounts ?? 1;
            let signedTxBase64: string;
            if (signerCount > 1) {
              signedTxBase64 = await cwcSolTransaction.signPartially({
                tx: base64Tx,
                key: {privKey: bs58.encode(privKeyBuffer)},
              });
            } else {
              signedTxBase64 = await cwcSolTransaction.sign({
                tx: base64Tx,
                key: {privKey: bs58.encode(privKeyBuffer)},
              });
            }
            const signedTransaction = getTransactionDecoder().decode(
              getBase64Encoder().encode(signedTxBase64),
            );
            resolve(
              formatJsonRpcResult<any>(id, {
                transaction: signedTxBase64,
                signature: bs58.encode(
                  // @ts-ignore
                  signedTransaction.signatures[wallet.receiveAddress],
                ),
              }),
            );
            break;

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
      case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
        addressFrom = params[0];
        break;
      case SOLANA_SIGNING_METHODS.SIGN_MESSAGE:
        addressFrom = params?.pubkey;
        break;
      case SOLANA_SIGNING_METHODS.SIGN_TRANSACTION:
        addressFrom = params?.feePayer || params?.pubkey;
        break;
      default:
        break;
    }
  }
  return addressFrom;
};

export const getPrivKey =
  (wallet: Wallet): Effect<Promise<string>> =>
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
          try {
            password = await new Promise<string>(async (_resolve, _reject) => {
              dispatch(dismissOnGoingProcessModal()); // dismiss any previous modal
              await sleep(500);
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
                      dispatch(
                        showBottomNotificationModal(WrongPasswordError()),
                      );
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
            return reject(error);
          }
        }

        let xPrivKeyHex: string | undefined;
        let priv: any;
        const bitcore = BWC.getBitcore();
        if (IsSVMChain(wallet.chain)) {
          xPrivKeyHex = password
            ? key.methods!.get(password, 'EDDSA').xPrivKey
            : key.properties!.xPrivKeyEDDSA;
          const keyPair = BWC.getCore().Deriver.derivePrivateKeyWithPath(
            wallet.chain,
            wallet.network,
            xPrivKeyHex,
            wallet.getRootPath(),
            '',
          );
          const privKeyHex = Buffer.from(
            bs58.decode(keyPair.privKey!),
          ).toString('hex');
          priv = privKeyHex;
        } else {
          xPrivKeyHex = password
            ? key.methods!.get(password).xPrivKey
            : key.properties!.xPrivKey;
          const xpriv = new bitcore.HDPrivateKey(xPrivKeyHex, wallet.network);
          priv = xpriv
            .deriveChild(`${wallet.getRootPath()}/0/0`)
            .privateKey.toString();
        }
        dispatch(
          LogActions.info(
            '[WC-V2/getPrivKey]: got the private key successfully',
          ),
        );
        resolve(priv);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(
            `[WC-V2/getPrivKey]: an error occurred while getting private key: ${errMsg}`,
          ),
        );
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

export const getGasWalletByRequest =
  (
    request: WalletKitTypes.EventArguments['session_request'],
  ): Effect<Wallet | undefined> =>
  (_dispatch, getState) => {
    const sessionV2: WCV2SessionType | undefined =
      getState().WALLET_CONNECT_V2.sessions.find(
        session => session.topic === request?.topic,
      );
    const {namespaces} = sessionV2 || {};
    const keys = getState().WALLET.keys;

    let wallet: Wallet | undefined;

    for (const key in namespaces) {
      if (namespaces.hasOwnProperty(key)) {
        const {accounts} = namespaces[key];
        accounts.forEach(account => {
          const index = account.indexOf(':', account.indexOf(':') + 1);
          const address = account.substring(index + 1);
          const chain =
            request?.params.chainId &&
            WC_SUPPORTED_CHAINS[request.params.chainId]?.chainName;
          const network =
            request?.params.chainId &&
            WC_SUPPORTED_CHAINS[request.params.chainId]?.network;
          wallet = findWalletByAddress(address, chain, network, keys);
          if (wallet) {
            return wallet;
          }
        });
      }
    }
    return wallet;
  };
