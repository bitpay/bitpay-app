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
  // test/setup.js stubs isAddress as always true; these tests need the real predicates
  const {utils} = jest.requireActual('ethers');

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
  getSignedMessage,
  getSignedTypedData,
  getSignedTypes,
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

beforeEach(async () => {
  const {dispatch} = makeStore();
  await dispatch(walletConnectV2Init());
});

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

describe('getSignedMessage', () => {
  it('refuses a message parameter that is not a string', () => {
    expect(() =>
      getSignedMessage(buildRequest('personal_sign', [[255, 0], ACCOUNT_A])),
    ).toThrow();
  });

  it('reads the eth_sign message from the second parameter', () => {
    expect(
      getSignedMessage(buildRequest('eth_sign', [ACCOUNT_A, 'approve 1 ETH'])),
    ).toBe('approve 1 ETH');
  });

  it('reads the personal_sign message from the first parameter', () => {
    expect(
      getSignedMessage(
        buildRequest('personal_sign', ['approve 1 ETH', ACCOUNT_A]),
      ),
    ).toBe('approve 1 ETH');
  });

  it('does not sign the account when its checksum does not validate', () => {
    const badChecksum = '0x6A6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a6a';

    expect(
      getSignedMessage(
        buildRequest('eth_sign', [badChecksum, 'approve 1 ETH']),
      ),
    ).toBe('approve 1 ETH');
  });
});

describe('getSignedTypedData', () => {
  const buildTypedData = (payload: any) =>
    buildRequest('eth_signTypedData_v4', [ACCOUNT_A, JSON.stringify(payload)]);

  const PERMIT = {
    domain: {chainId: 1},
    message: {owner: ACCOUNT_A},
    types: {
      EIP712Domain: [{name: 'chainId', type: 'uint256'}],
      Permit: [{name: 'owner', type: 'address'}],
    },
  };

  it('never hands back the domain type that ethers rejects', () => {
    expect(getSignedTypedData(buildTypedData(PERMIT))).toEqual({
      domain: {chainId: 1},
      message: {owner: ACCOUNT_A},
      types: {Permit: [{name: 'owner', type: 'address'}]},
    });
  });

  it('keeps only the descriptor fields that reach the signature', () => {
    const signed = getSignedTypedData(
      buildTypedData({
        ...PERMIT,
        types: {
          Permit: [{memo: 'approve 1 wei', name: 'owner', type: 'address'}],
        },
      }),
    );

    expect(signed.types).toEqual({Permit: [{name: 'owner', type: 'address'}]});
  });

  it('treats a null domain as the empty domain that gets signed', () => {
    expect(
      getSignedTypedData(buildTypedData({...PERMIT, domain: null})).domain,
    ).toEqual({});
  });

  it('treats an absent domain as the empty domain that gets signed', () => {
    const {domain} = PERMIT;

    expect(
      getSignedTypedData(buildTypedData({...PERMIT, domain: undefined})),
    ).toEqual({
      domain: {},
      message: {owner: ACCOUNT_A},
      types: {Permit: [{name: 'owner', type: 'address'}]},
    });
    expect(domain).toEqual({chainId: 1});
  });
});

describe('getSignedTypes', () => {
  it('drops the domain type that ethers rejects', () => {
    expect(
      getSignedTypes({EIP712Domain: [{name: 'name'}], Permit: []}),
    ).toEqual({Permit: []});
  });

  it('does not mutate the payload it receives', () => {
    const types = {EIP712Domain: [{name: 'name'}], Permit: []};

    getSignedTypes(types);

    expect(types.EIP712Domain).toBeDefined();
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
    expect(
      updateSessions.payload.sessions[0].namespaces.eip155.accounts,
    ).toEqual([`eip155:1:${ACCOUNT_A}`]);
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

  it('refuses to sign a request that names no account at all', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])]);
    const send = jest.fn(() => Promise.resolve({} as any));

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          buildRequest('personal_sign', ['0x6869']),
          wallet(ACCOUNT_A),
          send,
        ),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to sign with a wallet on the wrong network', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])]);

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(typedDataRequest(ACCOUNT_A), {
          chain: 'eth',
          keyId: 'key-1',
          network: 'testnet',
          receiveAddress: ACCOUNT_A,
        } as any),
      ),
    ).rejects.toThrow('cannot be signed with the selected account');
  });

  it('sends the deferred response once the account checks out', async () => {
    const {dispatch} = makeStore([buildSession([`eip155:1:${ACCOUNT_A}`])]);
    const response = {id: 1, jsonrpc: '2.0', result: '0xtxid'};
    const send = jest.fn(() => Promise.resolve(response as any));

    await dispatch(
      walletConnectV2ApproveCallRequest(
        typedDataRequest(ACCOUNT_A),
        wallet(ACCOUNT_A),
        send,
      ),
    );

    expect(send).toHaveBeenCalled();
    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      response,
      topic: TOPIC,
    });
  });

  it('keeps the request pending when the deferred response fails', async () => {
    const {dispatch, dispatched} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);
    const send = jest.fn(() => Promise.reject(new Error('invalid password')));

    await expect(
      dispatch(
        walletConnectV2ApproveCallRequest(
          typedDataRequest(ACCOUNT_A),
          wallet(ACCOUNT_A),
          send,
        ),
      ),
    ).rejects.toThrow('invalid password');
    expect(
      dispatched.some(
        ({type}) => type === WalletConnectV2ActionTypes.UPDATE_REQUESTS,
      ),
    ).toBe(false);
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

  it('does not fall back to a local solana wallet with different case', () => {
    const {dispatch} = makeStore([buildSession([`${SOL_CHAIN}:${SOL_A}`])], {
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

  it('drops the pending requests when the pairing disconnect fails', async () => {
    mockPairingDisconnect.mockRejectedValueOnce(new Error('no pairing'));
    const {dispatch, dispatched, state} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);
    state.WALLET_CONNECT_V2.requests = [{id: 1, topic: TOPIC}] as any;

    await dispatch(walletConnectV2OnDeleteSession(TOPIC, 'pairing-1'));

    const updateRequests = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_REQUESTS,
    );
    expect(updateRequests.payload.requests).toEqual([]);
  });
});

describe('session_delete listener', () => {
  const emitDelete = async () => {
    const {dispatch, dispatched} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);
    await dispatch(walletConnectV2Init());
    await eventHandlers.session_delete({topic: TOPIC} as any);

    return dispatched;
  };

  beforeEach(() => {
    mockPairingDisconnect.mockClear();
  });

  it('drops the session from state', async () => {
    const dispatched = await emitDelete();
    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );

    expect(updateSessions.payload.sessions).toEqual([]);
  });

  it('drops the session even when the pairing cannot be disconnected', async () => {
    mockPairingDisconnect.mockRejectedValueOnce(new Error('no pairing'));
    const dispatched = await emitDelete();
    const updateSessions = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_SESSIONS,
    );

    expect(updateSessions.payload.sessions).toEqual([]);
  });

  it('drops the pending requests of the deleted session only', async () => {
    const {dispatch, dispatched, state} = makeStore([
      buildSession([`eip155:1:${ACCOUNT_A}`]),
    ]);
    state.WALLET_CONNECT_V2.requests = [
      {id: 1, topic: TOPIC},
      {id: 2, topic: 'other-topic'},
    ] as any;
    await dispatch(walletConnectV2Init());
    await eventHandlers.session_delete({topic: TOPIC} as any);

    const updateRequests = dispatched.find(
      ({type}) => type === WalletConnectV2ActionTypes.UPDATE_REQUESTS,
    );

    expect(updateRequests.payload.requests).toEqual([
      {id: 2, topic: 'other-topic'},
    ]);
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

    expect(mockRespondSessionRequest).toHaveBeenCalledWith({
      response: expect.objectContaining({
        error: expect.anything(),
        id: 1,
      }),
      topic: TOPIC,
    });
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
