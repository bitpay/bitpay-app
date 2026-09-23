const mockUpdateSession = jest.fn(() => Promise.resolve());
const mockGetActiveSessions = jest.fn(() => ({}));
const mockRespondSessionRequest = jest.fn(() => Promise.resolve());
const mockEmitSessionEvent = jest.fn(() => Promise.resolve());
const mockDisconnectSession = jest.fn(() => Promise.resolve());
const mockPairingDisconnect = jest.fn(() => Promise.resolve());
const eventHandlers: {[key: string]: (event: any) => Promise<void>} = {};

jest.mock('@env', () => ({
  WALLET_CONNECT_V2_PROJECT_ID: 'project-id',
}));

jest.mock('@reown/walletkit', () => ({
  WalletKit: {
    init: jest.fn(() =>
      Promise.resolve({
        core: {pairing: {disconnect: mockPairingDisconnect}},
        disconnectSession: mockDisconnectSession,
        emitSessionEvent: mockEmitSessionEvent,
        getActiveSessions: mockGetActiveSessions,
        on: jest.fn((event: string, handler: (event: any) => Promise<void>) => {
          eventHandlers[event] = handler;
        }),
        respondSessionRequest: mockRespondSessionRequest,
        updateSession: mockUpdateSession,
      }),
    ),
    WalletKitTypes: {},
  },
  WalletKitTypes: {},
}));

jest.mock('ethers', () => {
  const isAddress = (value: unknown) =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
  const utils = {getAddress: jest.fn((value: string) => value), isAddress};

  return {
    BigNumber: {from: jest.fn()},
    ethers: {BigNumber: {from: jest.fn()}, utils},
    utils,
  };
});

jest.mock('@walletconnect/utils', () => ({
  buildApprovedNamespaces: jest.fn(({supportedNamespaces}: any) => ({
    eip155: {
      accounts: supportedNamespaces.eip155.accounts,
      chains: supportedNamespaces.eip155.chains,
      events: supportedNamespaces.eip155.events,
      methods: supportedNamespaces.eip155.methods,
    },
  })),
  getSdkError: jest.fn((key: string) => ({message: key})),
}));

import {
  getAddressFrom,
  getGasWalletByRequest,
  getSignParamsData,
  isSameAddress,
  walletConnectV2ApproveCallRequest,
  walletConnectV2Init,
  walletConnectV2OnDeleteSession,
  walletConnectV2OnUpdateSession,
} from './wallet-connect-v2.effects';
import {WalletConnectV2ActionTypes} from './wallet-connect-v2.types';

const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
const ACCOUNT_B = '0x2222222222222222222222222222222222222222';
const ACCOUNT_C = '0x3333333333333333333333333333333333333333';
const SOL_A = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const SOL_B = 'AknL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const SOL_CHAIN = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const TOPIC = 'topic-1';

const buildRequest = (method: string, params: any, chainId = 'eip155:1') =>
  ({
    id: 1,
    params: {chainId, request: {method, params}},
    topic: TOPIC,
  } as any);

const buildSession = (namespaceAccounts: string[], accounts?: string[]) =>
  ({
    accounts: accounts ?? namespaceAccounts,
    chains: [
      ...new Set(
        namespaceAccounts.map(account =>
          account.split(':').slice(0, 2).join(':'),
        ),
      ),
    ],
    namespaces: {
      eip155: {
        accounts: namespaceAccounts,
        chains: [
          ...new Set(
            namespaceAccounts.map(account =>
              account.split(':').slice(0, 2).join(':'),
            ),
          ),
        ],
        events: [],
        methods: [],
      },
    },
    pairingTopic: 'pairing-1',
    proposalParams: {optionalNamespaces: {}, requiredNamespaces: {}},
    topic: TOPIC,
  } as any);

const makeStore = (sessions: any[] = [], keys: any = {}) => {
  const state = {
    WALLET: {keys},
    WALLET_CONNECT_V2: {requests: [], sessions},
  };
  const dispatched: any[] = [];
  const getState = () => state as any;
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }

    dispatched.push(action);
    return action;
  });

  return {dispatch, dispatched, getState, state};
};

describe('getAddressFrom', () => {
  it('binds eth_signTypedData_v3 to the account named by the request', () => {
    const request = buildRequest('eth_signTypedData_v3', [
      ACCOUNT_A,
      '{"primaryType":"Permit"}',
    ]);

    expect(getAddressFrom(request)).toBe(ACCOUNT_A);
  });

  it('binds eth_signTypedData regardless of parameter order', () => {
    const request = buildRequest('eth_signTypedData', [
      '{"primaryType":"Permit"}',
      ACCOUNT_A,
    ]);

    expect(getAddressFrom(request)).toBe(ACCOUNT_A);
  });

  it('binds solana_signAndSendTransaction to the fee payer', () => {
    const request = buildRequest('solana_signAndSendTransaction', {
      feePayer: 'sol-fee-payer',
    });

    expect(getAddressFrom(request)).toBe('sol-fee-payer');
  });
});

describe('walletConnectV2OnUpdateSession', () => {
  beforeEach(() => {
    mockUpdateSession.mockClear();
  });

  const persistedSession = (dispatched: any[]) => {
    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );

    return updateSessions.payload.sessions[0];
  };

  it('drops the removed account from the persisted session', async () => {
    const session = buildSession([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:1:${ACCOUNT_B}`,
    ]);
    const {dispatch, dispatched} = makeStore([session]);

    await dispatch(
      walletConnectV2OnUpdateSession({
        action: 'disconnect',
        address: ACCOUNT_B,
        session,
      }),
    );

    const updatedSession = persistedSession(dispatched);

    expect(updatedSession.accounts).toEqual([`eip155:1:${ACCOUNT_A}`]);
    expect(updatedSession.namespaces.eip155.accounts).toEqual([
      `eip155:1:${ACCOUNT_A}`,
    ]);
  });

  it('drops a chain left without accounts', async () => {
    const session = buildSession([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:137:${ACCOUNT_B}`,
    ]);
    const {dispatch, dispatched} = makeStore([session]);

    await dispatch(
      walletConnectV2OnUpdateSession({
        action: 'disconnect',
        address: ACCOUNT_B,
        session,
      }),
    );

    expect(persistedSession(dispatched).chains).toEqual(['eip155:1']);
  });

  it('uses the session stored in state, not the one captured by the caller', async () => {
    const staleSession = buildSession([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:1:${ACCOUNT_B}`,
      `eip155:1:${ACCOUNT_C}`,
    ]);
    const currentSession = buildSession([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:1:${ACCOUNT_C}`,
    ]);
    const {dispatch, dispatched} = makeStore([currentSession]);

    await dispatch(
      walletConnectV2OnUpdateSession({
        action: 'disconnect',
        address: ACCOUNT_C,
        session: staleSession,
      }),
    );

    expect(persistedSession(dispatched).accounts).toEqual([
      `eip155:1:${ACCOUNT_A}`,
    ]);
  });

  it('rejects when the session is no longer in state', async () => {
    const session = buildSession([`eip155:1:${ACCOUNT_A}`]);
    const {dispatch} = makeStore([]);

    await expect(
      dispatch(
        walletConnectV2OnUpdateSession({
          action: 'disconnect',
          address: ACCOUNT_A,
          session,
        }),
      ),
    ).rejects.toThrow('no longer available');
  });

  it('keeps every chain that still has accounts', async () => {
    const session = buildSession([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:137:${ACCOUNT_A}`,
      `eip155:137:${ACCOUNT_B}`,
    ]);
    const {dispatch, dispatched} = makeStore([session]);

    await dispatch(
      walletConnectV2OnUpdateSession({
        action: 'disconnect',
        address: ACCOUNT_B,
        session,
      }),
    );

    expect(persistedSession(dispatched).chains).toEqual([
      'eip155:1',
      'eip155:137',
    ]);
  });

  it('ignores a stale accounts array written by an older version', async () => {
    const session = buildSession(
      [`eip155:1:${ACCOUNT_A}`],
      [`eip155:1:${ACCOUNT_A}`, `eip155:1:${ACCOUNT_B}`],
    );
    const {dispatch, dispatched} = makeStore([session]);

    await dispatch(
      walletConnectV2OnUpdateSession({
        action: 'add_accounts',
        selectedWallets: [
          {
            address: ACCOUNT_C,
            chain: 'eth',
            network: 'livenet',
            supportedChain: 'eip155:1',
          },
        ],
        session,
      }),
    );

    expect(persistedSession(dispatched).accounts).toEqual([
      `eip155:1:${ACCOUNT_A}`,
      `eip155:1:${ACCOUNT_C}`,
    ]);
  });
});

describe('walletConnectV2Init', () => {
  it('reconciles a persisted session against the active namespaces', async () => {
    const session = buildSession(
      [`eip155:1:${ACCOUNT_A}`, `eip155:1:${ACCOUNT_B}`],
      [`eip155:1:${ACCOUNT_A}`, `eip155:1:${ACCOUNT_B}`],
    );
    mockGetActiveSessions.mockReturnValueOnce({
      [TOPIC]: {
        namespaces: {
          eip155: {
            accounts: [`eip155:1:${ACCOUNT_A}`],
            chains: ['eip155:1'],
            events: [],
            methods: [],
          },
        },
        topic: TOPIC,
      },
    } as any);
    const {dispatch, dispatched} = makeStore([session]);

    await dispatch(walletConnectV2Init());

    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );

    expect(updateSessions.payload.sessions[0].accounts).toEqual([
      `eip155:1:${ACCOUNT_A}`,
    ]);
    expect(updateSessions.payload.sessions[0].chains).toEqual(['eip155:1']);
  });
});

describe('isSameAddress', () => {
  it('compares evm addresses without case', () => {
    expect(
      isSameAddress(
        '0xabcdef0123456789abcdef0123456789abcdef01',
        '0xABCDEF0123456789ABCDEF0123456789ABCDEF01',
      ),
    ).toBe(true);
  });

  it('compares base58 addresses exactly', () => {
    expect(isSameAddress(SOL_A, SOL_B)).toBe(false);
  });
});

describe('walletConnectV2ApproveCallRequest', () => {
  const wallet = (receiveAddress: string, chain = 'eth') =>
    ({chain, keyId: 'key-1', network: 'livenet', receiveAddress} as any);

  const typedDataRequest = (account: string, chainId?: string) =>
    buildRequest(
      'eth_signTypedData_v3',
      [account, '{"primaryType":"Permit"}'],
      chainId,
    );

  it('does not run a deferred response when the account is not authorized', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])]);
    const send = jest.fn(() => Promise.resolve({} as any));

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_B),
          wallet(ACCOUNT_B),
          send,
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to sign with an account the request does not name', async () => {
    const {dispatch} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`, `eip155:1:${ACCOUNT_B}`]),
    ]);

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_A),
          wallet(ACCOUNT_B),
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });

  it('refuses to sign with an account removed from the session', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])]);

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_B),
          wallet(ACCOUNT_B),
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });

  it('refuses to sign with a wallet that belongs to another chain', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:137:${ACCOUNT_A}`])]);

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_A, 'eip155:137'),
          wallet(ACCOUNT_A, 'eth'),
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });

  it('refuses to sign for a solana account that only differs in case', async () => {
    const {dispatch} = makeStore([buildSession([`${SOL_CHAIN}:${SOL_B}`])]);
    const request = buildRequest(
      'solana_signMessage',
      {message: 'aGk=', pubkey: SOL_B},
      SOL_CHAIN,
    );

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(request, wallet(SOL_A, 'sol')),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });

  it('refuses to sign on a chain the account is not authorized for', async () => {
    const {dispatch} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`, `eip155:137:${ACCOUNT_B}`]),
    ]);

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_A, 'eip155:137'),
          wallet(ACCOUNT_A, 'matic'),
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });
});

describe('getGasWalletByRequest', () => {
  const evmWallet = (receiveAddress: string) => ({
    chain: 'eth',
    network: 'livenet',
    receiveAddress,
  });

  it('selects the wallet named by the request, not the last authorized one', () => {
    const {dispatch} = makeStore(
      [buildSession([`eip155:1:${ACCOUNT_A}`, `eip155:1:${ACCOUNT_B}`])],
      {'key-1': {wallets: [evmWallet(ACCOUNT_A), evmWallet(ACCOUNT_B)]}},
    );

    const wallet = dispatch(
      getGasWalletByRequest(
        buildRequest('eth_signTypedData_v3', [
          ACCOUNT_A,
          '{"primaryType":"Permit"}',
        ]),
      ),
    );

    expect(wallet.receiveAddress).toBe(ACCOUNT_A);
  });

  it('returns nothing when the requested account is no longer authorized', () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])], {
      'key-1': {wallets: [evmWallet(ACCOUNT_A), evmWallet(ACCOUNT_B)]},
    });

    const wallet = dispatch(
      getGasWalletByRequest(
        buildRequest('eth_signTypedData_v3', [
          ACCOUNT_B,
          '{"primaryType":"Permit"}',
        ]),
      ),
    );

    expect(wallet).toBeUndefined();
  });

  it('does not match a solana account that only differs in case', () => {
    const {dispatch} = makeStore([buildSession([`${SOL_CHAIN}:${SOL_B}`])], {
      'key-1': {
        wallets: [{chain: 'sol', network: 'livenet', receiveAddress: SOL_B}],
      },
    });

    const wallet = dispatch(
      getGasWalletByRequest(
        buildRequest('solana_signMessage', {pubkey: SOL_A}, SOL_CHAIN),
      ),
    );

    expect(wallet).toBeUndefined();
  });
});

describe('getSignParamsData', () => {
  it('returns the parameter that is not an address', () => {
    expect(getSignParamsData([ACCOUNT_A, '{"a":1}'])).toBe('{"a":1}');
    expect(getSignParamsData(['{"a":1}', ACCOUNT_A])).toBe('{"a":1}');
  });

  it('returns undefined when every parameter is an address', () => {
    expect(getSignParamsData([ACCOUNT_A])).toBeUndefined();
  });
});

describe('walletConnectV2OnDeleteSession', () => {
  beforeEach(() => {
    mockDisconnectSession.mockClear();
    mockPairingDisconnect.mockClear();
  });

  it('removes the session from state and disconnects its pairing', async () => {
    const {dispatch, dispatched} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);

    await dispatch(walletConnectV2OnDeleteSession(TOPIC, 'pairing-1'));

    expect(mockDisconnectSession).toHaveBeenCalledWith(
      expect.objectContaining({topic: TOPIC}),
    );
    expect(mockPairingDisconnect).toHaveBeenCalledWith({topic: 'pairing-1'});

    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );
    expect(updateSessions.payload.sessions).toEqual([]);
  });

  it('still drops the session from state when the sdk disconnect fails', async () => {
    mockDisconnectSession.mockRejectedValueOnce(new Error('no such session'));
    const {dispatch, dispatched} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);

    await dispatch(walletConnectV2OnDeleteSession(TOPIC));

    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );
    expect(updateSessions.payload.sessions).toEqual([]);
  });
});

describe('session_request listener', () => {
  const emitRequest = async (event: any) => {
    const {dispatch, dispatched} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);
    await dispatch(walletConnectV2Init());
    await eventHandlers.session_request(event);

    return dispatched;
  };

  beforeEach(() => {
    mockRespondSessionRequest.mockClear();
    mockEmitSessionEvent.mockClear();
  });

  it('answers an unsupported method instead of dropping it silently', async () => {
    const dispatched = await emitRequest(
      buildRequest('eth_sendRawTransaction', ['0xdeadbeef']),
    );

    expect(mockRespondSessionRequest).toHaveBeenCalledWith(
      expect.objectContaining({topic: TOPIC}),
    );
    expect(
      dispatched.some(
        ({type}) => type === WalletConnectV2ActionTypes.SESSION_REQUEST,
      ),
    ).toBe(false);
  });

  it('answers an unsupported chain instead of dropping it silently', async () => {
    const dispatched = await emitRequest(
      buildRequest('personal_sign', ['0x6869', ACCOUNT_A], 'eip155:9999'),
    );

    expect(mockRespondSessionRequest).toHaveBeenCalled();
    expect(
      dispatched.some(
        ({type}) => type === WalletConnectV2ActionTypes.SESSION_REQUEST,
      ),
    ).toBe(false);
  });

  it('announces the account of the requested chain on auto approval', async () => {
    await emitRequest(
      buildRequest('wallet_addEthereumChain', [{chainId: '0x1'}]),
    );

    expect(mockEmitSessionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: {
          data: [`eip155:1:${ACCOUNT_A}`],
          name: 'accountsChanged',
        },
      }),
    );
  });

  it('does not announce an account belonging to another chain', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:137:${ACCOUNT_A}`])]);
    await dispatch(walletConnectV2Init());
    await eventHandlers.session_request(
      buildRequest('wallet_addEthereumChain', [{chainId: '0x1'}]),
    );

    expect(mockEmitSessionEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({name: 'accountsChanged'}),
      }),
    );
  });
});
