import WalletConnect from '@walletconnect/client';
import {WalletConnectActions} from '.';
import {IWalletConnectRequest} from './wallet-connect.reducer';
import {IWalletConnectSessionDict, wcConnector} from './wallet-connect.models';
import {Effect} from '..';

export const walletConnectInit = (): Effect => async (dispatch, getState) => {
  try {
    const {sessions} = getState().WALLET_CONNECT;
    const connectors =
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
    return new Promise((resolve, reject) => {
      const connector = new WalletConnect({uri});
      connector.on('session_request', (error: any, payload: any) => {
        if (error) {
          reject(error);
        }
        const {pending} = getState().WALLET_CONNECT;
        dispatch(WalletConnectActions.sessionRequest([...pending, connector]));
        resolve(payload.params[0]);
      });
    });
  };

export const walletConnectApproveSessionRequest =
  (
    peerId: string,
    response: {accounts: string[]; chainId: number},
    customData: {keyId: string; walletId: string},
  ): Effect =>
  (dispatch, getState): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const {connectors, pending, sessions} = getState().WALLET_CONNECT;
        let updatedConnectors = [...connectors];
        let updatedPending: WalletConnect[] = [];
        let updatedSessions = [...sessions];

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

    const connector = pending.filter(
      (pendingConnector: WalletConnect) => pendingConnector.peerId === peerId,
    )[0];

    connector.rejectSession();

    const updatedPending = pending.filter(
      (connector: WalletConnect) => connector.peerId !== peerId,
    );

    dispatch(WalletConnectActions.rejectSessionRequest(updatedPending));
  };

export const walletConnectSubscribeToEvents =
  (peerId?: string): Effect =>
  (dispatch, getState) => {
    if (!peerId) {
      const {connectors} = getState().WALLET_CONNECT;
      connectors.forEach((c: wcConnector) => {
        return dispatch(walletConnectSubscribeToEvents(c.connector.peerId));
      });
    } else {
      const {connectors} = getState().WALLET_CONNECT;
      const wcConnector = connectors.filter(
        (c: wcConnector) => c.connector.peerId === peerId,
      )[0];

      wcConnector.connector.on('call_request', (error: any, payload: any) => {
        if (error) {
          throw error;
        }
        const updatedRequests = [...getState().WALLET_CONNECT.requests];

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
          const updatedSessions = sessions.filter(
            s => s.session.peerId !== peerId,
          );
          const updatedConnectors = connectors.filter(c => c.connector.peerId);
          const updatedRequests = requests.filter(r => r.peerId !== peerId);
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
      const wcConnector = getState().WALLET_CONNECT.connectors.filter(
        (c: wcConnector) => {
          c.connector.peerId === peerId;
        },
      )[0];

      await wcConnector.connector.approveRequest(response);

      const updatedRequests = getState().WALLET_CONNECT.requests.filter(
        (request: IWalletConnectRequest) => request.payload.id !== response.id,
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
      const wcConnector = getState().WALLET_CONNECT.connectors.filter(
        (c: wcConnector) => c.connector.peerId === peerId,
      )[0];
      await wcConnector.connector.rejectRequest(response);

      const updatedRequests = getState().WALLET_CONNECT.requests.filter(
        (request: IWalletConnectRequest) =>
          request.payload && request.payload.id !== response.id,
      );
      await dispatch(WalletConnectActions.rejectCallRequest(updatedRequests));
    } catch (e) {
      console.log(e);
    }
  };
