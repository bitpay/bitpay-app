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

export const walletConnectInit = (): Effect => async (dispatch, getState) => {
  try {
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
    dispatch(WalletConnectActions.successInitRequest(connectors || []));
    dispatch(walletConnectSubscribeToEvents());
  } catch (e) {
    console.log(e);
    dispatch(WalletConnectActions.failedInitRquest());
  }
};

export const walletConnectOnSessionRequest =
  (uri: string): Effect =>
  (dispatch, getState): Promise<{peer: any; peerId: any}> => {
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
        resolve(payload.params[0]);
      });

      await sleep(5000);
      if (isWaitingForEvent) {
        // reject promise if Dapp doesn't respond
        reject(
          'Session request failed or rejected. Please try again by refreshing the QR code.',
        );
      }
    });
  };

export const walletConnectApproveSessionRequest =
  (
    peerId: string,
    response: {accounts: string[]; chainId: number},
    customData: IWCCustomData,
  ): Effect =>
  (dispatch, getState): Promise<void> => {
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
        resolve();
      } catch (e) {
        console.log(e);
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
        const updatedRequests: IWCRequest[] = [
          ...getState().WALLET_CONNECT.requests,
        ];

        updatedRequests.push({
          peerId,
          payload: payload,
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
  (peerId: string): Effect =>
  async (_dispatch, getState) => {
    const {connectors} = getState().WALLET_CONNECT;
    await Promise.all(
      connectors.map(async c => {
        try {
          if (c.connector.peerId === peerId) {
            await c.connector.killSession();
          }
        } catch (e) {
          console.log(e);
        }
      }),
    );
  };

export const walletConnectApproveCallRequest =
  (peerId: string, response: {id: number | undefined; result: any}): Effect =>
  async (dispatch, getState) => {
    try {
      const wcConnector: IWCConnector =
        getState().WALLET_CONNECT.connectors.filter((c: IWCConnector) => {
          c.connector.peerId === peerId;
        })[0];

      await wcConnector.connector.approveRequest(response);

      const updatedRequests: IWCRequest[] =
        getState().WALLET_CONNECT.requests.filter(
          (request: IWCRequest) => request.payload.id !== response.id,
        );
      await dispatch(WalletConnectActions.approveCallRequest(updatedRequests));
    } catch (e) {
      console.log(e);
    }
  };

export const walletConnectRejectCallRequest =
  (
    peerId: string,
    response: {id: number | undefined; error: {message: string}},
  ): Effect =>
  async (dispatch, getState) => {
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
    } catch (e) {
      console.log(e);
    }
  };
