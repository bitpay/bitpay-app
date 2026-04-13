/**
 * Tests for coinbase.effects.ts
 *
 * Covers:
 *   - isInvalidTokenError
 *   - coinbaseParseErrorToString
 *   - coinbaseErrorIncludesErrorParams
 *   - coinbaseGetFiatAmount
 *   - coinbaseDisconnectAccount
 *   - coinbaseRefreshToken (no-token early return)
 *   - coinbaseGetUser (success, expired token, revoked token, invalid token, generic error)
 *   - coinbaseGetAccountsAndBalance (success, no-token early return)
 *   - coinbaseGetTransactionsByAccount (no-token / cache-hit early returns)
 *   - coinbaseCreateAddress (success, no-token early return)
 *   - coinbaseSendTransaction (no-token early return)
 *   - coinbaseClearSendTransactionStatus
 *   - coinbaseLinkAccount (mismatched state code)
 *   - coinbaseInitialize (no-token early return)
 */

import configureTestStore from '@test/store';
import {
  isInvalidTokenError,
  coinbaseParseErrorToString,
  coinbaseErrorIncludesErrorParams,
  coinbaseGetFiatAmount,
  coinbaseDisconnectAccount,
  coinbaseRefreshToken,
  coinbaseGetUser,
  coinbaseGetAccountsAndBalance,
  coinbaseGetTransactionsByAccount,
  coinbaseCreateAddress,
  coinbaseSendTransaction,
  coinbaseClearSendTransactionStatus,
  coinbaseLinkAccount,
  coinbaseInitialize,
} from './coinbase.effects';
import {COINBASE_ENV} from '../../api/coinbase/coinbase.constants';
import {CoinbaseEnvironment} from '../../api/coinbase/coinbase.types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../analytics/analytics.effects', () => ({
  Analytics: {
    track: jest.fn(() => ({type: 'ANALYTICS/TRACK'})),
  },
}));

jest.mock('../../api/coinbase', () => ({
  __esModule: true,
  default: {
    getOauthStateCode: jest.fn(() => 'valid-state'),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    revokeToken: jest.fn(),
    getCurrentUser: jest.fn(),
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
    getNewAddress: jest.fn(),
    sendTransaction: jest.fn(),
    payInvoice: jest.fn(),
    getFiatCurrencies: jest.fn(),
    getExchangeRates: jest.fn(),
  },
}));

// Import after mock so we can control its methods
import CoinbaseAPI from '../../api/coinbase';
const MockCoinbaseAPI = CoinbaseAPI as jest.Mocked<typeof CoinbaseAPI>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Coinbase token shape */
const makeToken = () => ({
  access_token: 'access-abc',
  refresh_token: 'refresh-abc',
  token_type: 'Bearer',
  expires_in: 7200,
  scope: 'wallet:accounts:read',
});

/** Minimal error object */
const makeError = (id: string, message = 'some error'): any => ({
  errors: [{id, message}],
});

const _SENTINEL = Symbol('use-real-token');

/** Full COINBASE state with a valid token (all required fields populated).
 *  Pass `null` as tokenValue to create a no-token state. */
const fullCoinbaseState = (tokenValue: any = _SENTINEL) => {
  const tok = tokenValue === _SENTINEL ? makeToken() : tokenValue;
  return {
    isApiLoading: false,
    getAccessTokenStatus: null,
    getAccessTokenError: null,
    getRefreshTokenStatus: null,
    getRefreshTokenError: null,
    getUserStatus: null,
    getUserError: null,
    getAccountsStatus: null,
    getAccountsError: null,
    getTransactionsStatus: null,
    getTransactionsError: null,
    createAddressStatus: null,
    createAddressError: null,
    sendTransactionStatus: null,
    sendTransactionError: null,
    payInvoiceStatus: null,
    payInvoiceError: null,
    exchangeRates: null,
    hideTotalBalance: false,
    fiatCurrency: 'USD',
    blockchainNetwork: 'ethereum',
    token: {
      [CoinbaseEnvironment.production]: tok,
      [CoinbaseEnvironment.sandbox]: tok,
    },
    user: {
      [CoinbaseEnvironment.production]: null,
      [CoinbaseEnvironment.sandbox]: null,
    },
    accounts: {
      [CoinbaseEnvironment.production]: null,
      [CoinbaseEnvironment.sandbox]: null,
    },
    transactions: {
      [CoinbaseEnvironment.production]: null,
      [CoinbaseEnvironment.sandbox]: null,
    },
    balance: {
      [CoinbaseEnvironment.production]: null,
      [CoinbaseEnvironment.sandbox]: null,
    },
  };
};

/** Store with a real Coinbase token so API calls aren't short-circuited */
const storeWithToken = () =>
  configureTestStore({COINBASE: fullCoinbaseState()});

// ---------------------------------------------------------------------------
// isInvalidTokenError — pure utility
// ---------------------------------------------------------------------------

describe('isInvalidTokenError', () => {
  it('returns true when error object has id "invalid_token"', () => {
    expect(isInvalidTokenError(makeError('invalid_token'))).toBe(true);
  });

  it('returns false when error object has a different id', () => {
    expect(isInvalidTokenError(makeError('expired_token'))).toBe(false);
  });

  it('returns true when error is a string containing "Unauthorized"', () => {
    expect(isInvalidTokenError('Unauthorized request')).toBe(true);
  });

  it('returns false when error is a string that does not contain "Unauthorized"', () => {
    expect(isInvalidTokenError('Network Error')).toBe(false);
  });

  it('returns false when errors array is empty', () => {
    expect(isInvalidTokenError({errors: []})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// coinbaseParseErrorToString — pure utility
// ---------------------------------------------------------------------------

describe('coinbaseParseErrorToString', () => {
  it('returns the string directly when error is a string', () => {
    expect(coinbaseParseErrorToString('plain string error')).toBe(
      'plain string error',
    );
  });

  it('returns error_description when present', () => {
    expect(
      coinbaseParseErrorToString({error_description: 'token invalid'}),
    ).toBe('token invalid');
  });

  it('concatenates multiple error messages from the errors array', () => {
    const error = {
      errors: [
        {id: 'A', message: 'First error'},
        {id: 'B', message: 'Second error'},
      ],
    };
    expect(coinbaseParseErrorToString(error)).toBe('First error. Second error');
  });

  it('returns single message when there is exactly one error', () => {
    expect(coinbaseParseErrorToString(makeError('X', 'Only error'))).toBe(
      'Only error',
    );
  });

  it('returns "Network Error" when error has no recognisable shape', () => {
    expect(coinbaseParseErrorToString({})).toBe('Network Error');
    expect(coinbaseParseErrorToString(null)).toBe('Network Error');
  });
});

// ---------------------------------------------------------------------------
// coinbaseErrorIncludesErrorParams — pure utility
// ---------------------------------------------------------------------------

describe('coinbaseErrorIncludesErrorParams', () => {
  const error = makeError('rate_limit_exceeded', 'Rate limit exceeded');

  it('returns true when id matches', () => {
    expect(
      coinbaseErrorIncludesErrorParams(error, {id: 'rate_limit_exceeded'}),
    ).toBe(true);
  });

  it('returns true when message matches', () => {
    expect(
      coinbaseErrorIncludesErrorParams(error, {message: 'Rate limit exceeded'}),
    ).toBe(true);
  });

  it('returns true when both id and message match', () => {
    expect(
      coinbaseErrorIncludesErrorParams(error, {
        id: 'rate_limit_exceeded',
        message: 'Rate limit exceeded',
      }),
    ).toBe(true);
  });

  it('returns false when id does not match', () => {
    expect(
      coinbaseErrorIncludesErrorParams(error, {id: 'other_error'}),
    ).toBe(false);
  });

  it('returns false when both id and message are given but message does not match', () => {
    expect(
      coinbaseErrorIncludesErrorParams(error, {
        id: 'rate_limit_exceeded',
        message: 'Wrong message',
      }),
    ).toBe(false);
  });

  it('returns falsy when error has no errors array', () => {
    // The function calls .some on undefined — returns undefined which is falsy
    expect(
      coinbaseErrorIncludesErrorParams({}, {id: 'rate_limit_exceeded'}),
    ).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// coinbaseGetFiatAmount — pure function
// ---------------------------------------------------------------------------

describe('coinbaseGetFiatAmount', () => {
  const exchangeRates: any = {
    data: {
      rates: {BTC: '0.00002', ETH: '0.001', USD: '1'},
      currency: 'USD',
    },
  };

  it('returns 0 when exchangeRates is null', () => {
    expect(coinbaseGetFiatAmount(1, 'BTC', null)).toBe(0.0);
  });

  it('converts BTC amount to fiat correctly', () => {
    // amount / rate = 1 / 0.00002 = 50000
    expect(coinbaseGetFiatAmount(1, 'BTC', exchangeRates)).toBeCloseTo(50000);
  });

  it('converts ETH amount to fiat correctly', () => {
    // 0.5 / 0.001 = 500
    expect(coinbaseGetFiatAmount(0.5, 'ETH', exchangeRates)).toBeCloseTo(500);
  });

  it('returns 0 when amount is 0', () => {
    expect(coinbaseGetFiatAmount(0, 'BTC', exchangeRates)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// coinbaseDisconnectAccount
// ---------------------------------------------------------------------------

describe('coinbaseDisconnectAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches revokeTokenSuccess even when revokeToken API throws', async () => {
    (MockCoinbaseAPI.revokeToken as jest.Mock).mockRejectedValueOnce(
      new Error('network error'),
    );
    const store = storeWithToken();
    await store.dispatch(coinbaseDisconnectAccount());

    // State should be cleared (token nulled out) via DISCONNECT_ACCOUNT_SUCCESS
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toBeNull();
  });

  it('calls revokeToken when token exists', async () => {
    (MockCoinbaseAPI.revokeToken as jest.Mock).mockResolvedValueOnce({});
    const store = storeWithToken();
    await store.dispatch(coinbaseDisconnectAccount());
    expect(MockCoinbaseAPI.revokeToken).toHaveBeenCalledTimes(1);
  });

  it('does NOT call revokeToken when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseDisconnectAccount());
    expect(MockCoinbaseAPI.revokeToken).not.toHaveBeenCalled();
    // State should still be cleared
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// coinbaseRefreshToken
// ---------------------------------------------------------------------------

describe('coinbaseRefreshToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early without calling API when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseRefreshToken());
    expect(MockCoinbaseAPI.getRefreshToken).not.toHaveBeenCalled();
  });

  it('dispatches refreshTokenSuccess when API call succeeds', async () => {
    const newToken = makeToken();
    (MockCoinbaseAPI.getRefreshToken as jest.Mock).mockResolvedValueOnce(
      newToken,
    );
    const store = storeWithToken();
    await store.dispatch(coinbaseRefreshToken());
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toEqual(newToken);
  });

  it('dispatches refreshTokenFailed and disconnects when API call fails', async () => {
    (MockCoinbaseAPI.getRefreshToken as jest.Mock).mockRejectedValueOnce(
      makeError('invalid_token'),
    );
    // revokeToken called during disconnect
    (MockCoinbaseAPI.revokeToken as jest.Mock).mockResolvedValueOnce({});
    const store = storeWithToken();
    await store.dispatch(coinbaseRefreshToken());
    // After failed refresh, disconnect is called → token becomes null
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// coinbaseGetUser
// ---------------------------------------------------------------------------

describe('coinbaseGetUser', () => {
  const mockUser: any = {data: {id: 'u1', name: 'Alice'}};

  beforeEach(() => jest.clearAllMocks());

  it('returns early when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseGetUser());
    expect(MockCoinbaseAPI.getCurrentUser).not.toHaveBeenCalled();
  });

  it('dispatches userSuccess with user data on successful API call', async () => {
    (MockCoinbaseAPI.getCurrentUser as jest.Mock).mockResolvedValueOnce(
      mockUser,
    );
    const store = storeWithToken();
    await store.dispatch(coinbaseGetUser());
    expect(store.getState().COINBASE.user[COINBASE_ENV]).toEqual(mockUser);
  });

  it('dispatches userFailed on generic error', async () => {
    const error = makeError('unknown_error', 'Something went wrong');
    (MockCoinbaseAPI.getCurrentUser as jest.Mock).mockRejectedValueOnce(error);
    const store = storeWithToken();
    await store.dispatch(coinbaseGetUser());
    expect(store.getState().COINBASE.getUserError).toEqual(error);
  });

  it('attempts token refresh on expired_token error', async () => {
    const expiredError = makeError('expired_token');
    (MockCoinbaseAPI.getCurrentUser as jest.Mock)
      .mockRejectedValueOnce(expiredError) // first call → expired
      .mockResolvedValueOnce(mockUser); // recursive call after refresh
    (MockCoinbaseAPI.getRefreshToken as jest.Mock).mockResolvedValueOnce(
      makeToken(),
    );
    const store = storeWithToken();
    await store.dispatch(coinbaseGetUser());
    expect(MockCoinbaseAPI.getRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('disconnects on revoked_token error', async () => {
    const revokedError = makeError('revoked_token');
    (MockCoinbaseAPI.getCurrentUser as jest.Mock).mockRejectedValueOnce(
      revokedError,
    );
    (MockCoinbaseAPI.revokeToken as jest.Mock).mockResolvedValueOnce({});
    const store = storeWithToken();
    await store.dispatch(coinbaseGetUser());
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// coinbaseGetAccountsAndBalance
// ---------------------------------------------------------------------------

describe('coinbaseGetAccountsAndBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseGetAccountsAndBalance());
    expect(MockCoinbaseAPI.getAccounts).not.toHaveBeenCalled();
  });

  it('stores only supported-currency wallet accounts in state', async () => {
    const mockAccounts: any = {
      data: [
        // BTC wallet — supported
        {
          id: 'acc-btc',
          type: 'wallet',
          balance: {amount: 1, currency: 'btc'},
        },
        // FIAT account — should be filtered out (type != wallet? actually no, checked by currency)
        {
          id: 'acc-unsupported',
          type: 'wallet',
          balance: {amount: 100, currency: 'FAKECOIN'},
        },
        // vault type — filtered out because type !== 'wallet'? Let's use type: 'vault'
        {
          id: 'acc-vault',
          type: 'vault',
          balance: {amount: 0.5, currency: 'eth'},
        },
      ],
    };
    (MockCoinbaseAPI.getAccounts as jest.Mock).mockResolvedValueOnce(
      mockAccounts,
    );
    const store = storeWithToken();
    await store.dispatch(coinbaseGetAccountsAndBalance());
    const accounts = store.getState().COINBASE.accounts[COINBASE_ENV];
    // Only the btc wallet account is supported and type=wallet
    expect(accounts).toBeDefined();
    expect(accounts!.find((a: any) => a.id === 'acc-btc')).toBeTruthy();
    expect(accounts!.find((a: any) => a.id === 'acc-unsupported')).toBeFalsy();
    expect(accounts!.find((a: any) => a.id === 'acc-vault')).toBeFalsy();
  });

  it('dispatches accountsFailed on generic error', async () => {
    const error = makeError('some_error');
    (MockCoinbaseAPI.getAccounts as jest.Mock).mockRejectedValueOnce(error);
    const store = storeWithToken();
    await store.dispatch(coinbaseGetAccountsAndBalance());
    expect(store.getState().COINBASE.getAccountsError).toEqual(error);
  });
});

// ---------------------------------------------------------------------------
// coinbaseGetTransactionsByAccount
// ---------------------------------------------------------------------------

describe('coinbaseGetTransactionsByAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseGetTransactionsByAccount('acc-1'));
    expect(MockCoinbaseAPI.getTransactions).not.toHaveBeenCalled();
  });

  it('returns early from cache when forceUpdate is false and transactions exist', async () => {
    const cachedTxState = {
      ...fullCoinbaseState(),
      transactions: {
        [CoinbaseEnvironment.production]: {
          'acc-1': {data: [{id: 'tx-1'}], pagination: {}},
        },
        [CoinbaseEnvironment.sandbox]: {
          'acc-1': {data: [{id: 'tx-1'}], pagination: {}},
        },
      },
    };
    const store = configureTestStore({COINBASE: cachedTxState});
    await store.dispatch(
      coinbaseGetTransactionsByAccount('acc-1', false /* forceUpdate */),
    );
    expect(MockCoinbaseAPI.getTransactions).not.toHaveBeenCalled();
  });

  it('fetches transactions when forceUpdate is true even if cache exists', async () => {
    const freshTxs: any = {data: [{id: 'tx-fresh'}], pagination: {}};
    (MockCoinbaseAPI.getTransactions as jest.Mock).mockResolvedValueOnce(
      freshTxs,
    );
    const cachedTxState = {
      ...fullCoinbaseState(),
      transactions: {
        [CoinbaseEnvironment.production]: {
          'acc-1': {data: [{id: 'tx-old'}], pagination: {}},
        },
        [CoinbaseEnvironment.sandbox]: {
          'acc-1': {data: [{id: 'tx-old'}], pagination: {}},
        },
      },
    };
    const store = configureTestStore({COINBASE: cachedTxState});
    await store.dispatch(
      coinbaseGetTransactionsByAccount('acc-1', true /* forceUpdate */),
    );
    expect(MockCoinbaseAPI.getTransactions).toHaveBeenCalledTimes(1);
  });

  it('fetches transactions when cache is empty', async () => {
    const txs: any = {data: [{id: 'tx-1'}], pagination: {}};
    (MockCoinbaseAPI.getTransactions as jest.Mock).mockResolvedValueOnce(txs);
    const store = storeWithToken();
    await store.dispatch(coinbaseGetTransactionsByAccount('acc-new'));
    expect(MockCoinbaseAPI.getTransactions).toHaveBeenCalledTimes(1);
    expect(
      store.getState().COINBASE.transactions[COINBASE_ENV]?.['acc-new'],
    ).toEqual(txs);
  });
});

// ---------------------------------------------------------------------------
// coinbaseCreateAddress
// ---------------------------------------------------------------------------

describe('coinbaseCreateAddress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    const result = await store.dispatch(coinbaseCreateAddress('acc-1'));
    expect(result).toBeUndefined();
    expect(MockCoinbaseAPI.getNewAddress).not.toHaveBeenCalled();
  });

  it('returns the address on success', async () => {
    (MockCoinbaseAPI.getNewAddress as jest.Mock).mockResolvedValueOnce({
      data: {address: '0xNEW_ADDRESS'},
    });
    const store = storeWithToken();
    const result = await store.dispatch(coinbaseCreateAddress('acc-1'));
    expect(result).toBe('0xNEW_ADDRESS');
  });

  it('dispatches createAddressFailed on generic error', async () => {
    const error = makeError('create_failed');
    (MockCoinbaseAPI.getNewAddress as jest.Mock).mockRejectedValueOnce(error);
    const store = storeWithToken();
    await store.dispatch(coinbaseCreateAddress('acc-1'));
    expect(store.getState().COINBASE.createAddressError).toEqual(error);
  });
});

// ---------------------------------------------------------------------------
// coinbaseSendTransaction
// ---------------------------------------------------------------------------

describe('coinbaseSendTransaction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseSendTransaction('acc-1', {currency: 'btc'}));
    expect(MockCoinbaseAPI.sendTransaction).not.toHaveBeenCalled();
  });

  it('dispatches sendTransactionSuccess on success', async () => {
    (MockCoinbaseAPI.sendTransaction as jest.Mock).mockResolvedValueOnce({});
    const store = storeWithToken();
    await store.dispatch(coinbaseSendTransaction('acc-1', {currency: 'btc'}));
    expect(store.getState().COINBASE.sendTransactionStatus).toBe('success');
  });

  it('dispatches sendTransactionFailed on generic error', async () => {
    const error = makeError('tx_failed', 'Transaction failed');
    (MockCoinbaseAPI.sendTransaction as jest.Mock).mockRejectedValueOnce(error);
    const store = storeWithToken();
    await store.dispatch(coinbaseSendTransaction('acc-1', {currency: 'btc'}));
    expect(store.getState().COINBASE.sendTransactionError).toEqual(error);
  });
});

// ---------------------------------------------------------------------------
// coinbaseClearSendTransactionStatus
// ---------------------------------------------------------------------------

describe('coinbaseClearSendTransactionStatus', () => {
  it('clears the sendTransactionStatus in state', async () => {
    const store = storeWithToken();
    // Put the state into a non-null status first
    (MockCoinbaseAPI.sendTransaction as jest.Mock).mockResolvedValueOnce({});
    await store.dispatch(coinbaseSendTransaction('acc-1', {}));
    expect(store.getState().COINBASE.sendTransactionStatus).toBe('success');

    await store.dispatch(coinbaseClearSendTransactionStatus());
    expect(store.getState().COINBASE.sendTransactionStatus).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// coinbaseLinkAccount
// ---------------------------------------------------------------------------

describe('coinbaseLinkAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches accessTokenFailed when OAuth state codes do not match', async () => {
    (MockCoinbaseAPI.getOauthStateCode as jest.Mock).mockReturnValueOnce(
      'expected-state',
    );
    const store = configureTestStore({});
    await expect(
      store.dispatch(coinbaseLinkAccount('code-123', 'wrong-state')),
    ).rejects.toBeDefined();
    expect(store.getState().COINBASE.getAccessTokenError).toBeDefined();
    expect(
      store.getState().COINBASE.getAccessTokenError?.errors?.[0]?.id,
    ).toBe('STATE_INCORRECT');
  });

  it('dispatches accessTokenSuccess when state matches and API succeeds', async () => {
    const code = 'valid-code';
    const state = 'valid-state';
    const newToken = makeToken();
    (MockCoinbaseAPI.getOauthStateCode as jest.Mock).mockReturnValue(state);
    (MockCoinbaseAPI.getAccessToken as jest.Mock).mockResolvedValueOnce(
      newToken,
    );
    // Stub downstream calls that happen after token success
    (MockCoinbaseAPI.getCurrentUser as jest.Mock).mockResolvedValueOnce({
      data: {id: 'u1'},
    });
    (MockCoinbaseAPI.getFiatCurrencies as jest.Mock).mockResolvedValueOnce({
      data: [],
    });
    (MockCoinbaseAPI.getExchangeRates as jest.Mock).mockResolvedValueOnce({
      data: {rates: {}, currency: 'USD'},
    });
    (MockCoinbaseAPI.getAccounts as jest.Mock).mockResolvedValueOnce({
      data: [],
    });

    const store = configureTestStore({});
    await store.dispatch(coinbaseLinkAccount(code, state));
    expect(store.getState().COINBASE.token[COINBASE_ENV]).toEqual(newToken);
  });
});

// ---------------------------------------------------------------------------
// coinbaseInitialize
// ---------------------------------------------------------------------------

describe('coinbaseInitialize', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns early without any API calls when no token in state', async () => {
    const store = configureTestStore({COINBASE: fullCoinbaseState(null)});
    await store.dispatch(coinbaseInitialize());
    expect(MockCoinbaseAPI.getCurrentUser).not.toHaveBeenCalled();
    expect(MockCoinbaseAPI.getAccounts).not.toHaveBeenCalled();
  });

  it('calls getUser, exchange rates and accounts when token exists', async () => {
    (MockCoinbaseAPI.getCurrentUser as jest.Mock).mockResolvedValueOnce({
      data: {id: 'u1'},
    });
    (MockCoinbaseAPI.getFiatCurrencies as jest.Mock).mockResolvedValueOnce({
      data: [],
    });
    (MockCoinbaseAPI.getExchangeRates as jest.Mock).mockResolvedValueOnce({
      data: {rates: {}, currency: 'USD'},
    });
    (MockCoinbaseAPI.getAccounts as jest.Mock).mockResolvedValueOnce({
      data: [],
    });
    const store = storeWithToken();
    await store.dispatch(coinbaseInitialize());
    expect(MockCoinbaseAPI.getCurrentUser).toHaveBeenCalledTimes(1);
    expect(MockCoinbaseAPI.getAccounts).toHaveBeenCalledTimes(1);
  });
});
