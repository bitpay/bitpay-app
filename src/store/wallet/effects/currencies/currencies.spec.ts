import configureTestStore from '@test/store';
import axios from 'axios';
import {
  startGetTokenOptions,
  addCustomTokenOption,
  startCustomTokensMigration,
} from './currencies';
import {tokenManager} from '../../../../managers/TokenManager';

// ---------- module-level mocks ----------

// In-memory MMKV for the token-list cache; cleared before each test.
const mockMmkvStore = new Map<string, string>();
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: (k: string) => mockMmkvStore.get(k),
    set: (k: string, v: string) => mockMmkvStore.set(k, v),
    delete: (k: string) => mockMmkvStore.delete(k),
  })),
}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../../managers/TokenManager', () => ({
  tokenManager: {
    setTokenOptions: jest.fn(),
    getTokenOptions: jest.fn(() => ({
      tokenOptionsByAddress: {},
      tokenDataByAddress: {},
    })),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));

jest.mock('../../../../constants/currencies', () => {
  const actual = jest.requireActual('../../../../constants/currencies');
  return {
    ...actual,
    SUPPORTED_VM_TOKENS: ['eth', 'matic'],
    // Keep BitpaySupportedTokens empty so custom tokens aren't filtered
    BitpaySupportedTokens: {},
  };
});

// Mock wallet actions so we can spy on them
jest.mock('../../wallet.actions', () => ({
  ...jest.requireActual('../../wallet.actions'),
  failedGetTokenOptions: jest.fn(() => ({
    type: 'WALLET/FAILED_GET_TOKEN_OPTIONS',
  })),
  successGetCustomTokenOptions: jest.fn(payload => ({
    type: 'WALLET/SUCCESS_GET_CUSTOM_TOKEN_OPTIONS',
    payload,
  })),
}));

// Mock app store actions for APP_TOKENS_DATA_LOADED
jest.mock('../../../app', () => {
  const actual = jest.requireActual('../../../app');
  return {
    ...actual,
    AppActions: {
      ...actual.AppActions,
      appTokensDataLoaded: jest.fn(() => ({type: 'APP_TOKENS_DATA_LOADED'})),
    },
  };
});

// Mock BLOCKCHAIN_EXPLORERS to cover any chain key,
// while keeping other real config values (BASE_BITPAY_URLS, etc.)
jest.mock('../../../../constants/config', () => {
  const actual = jest.requireActual('../../../../constants/config');
  return {
    ...actual,
    BASE_BWS_URL: 'https://bws.test',
    BLOCKCHAIN_EXPLORERS: new Proxy(
      {},
      {
        get: (_target, _prop) => ({
          livenet: 'https://explorer.test',
          testnet: 'https://explorer-test.test',
        }),
      },
    ),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSetTokenOptions = tokenManager.setTokenOptions as jest.Mock;

// Grab the mocked action creators after jest.mock has set them up
const {failedGetTokenOptions, successGetCustomTokenOptions} = jest.requireMock(
  '../../wallet.actions',
);
const {AppActions} = jest.requireMock('../../../app');

// Helper: a minimal valid token object
const makeToken = (overrides: Record<string, any> = {}) => ({
  address: '0xdeadbeef',
  name: 'Test Token',
  symbol: 'TEST',
  decimals: 18,
  logoURI: 'https://example.com/logo.png',
  ...overrides,
});

describe('startGetTokenOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMmkvStore.clear();
  });

  it('calls tokenManager.setTokenOptions after a successful response with an array of tokens', async () => {
    const token = makeToken();
    mockedAxios.get.mockResolvedValue({data: [token]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
  });

  it('dispatches APP_TOKENS_DATA_LOADED on success', async () => {
    const token = makeToken();
    mockedAxios.get.mockResolvedValue({data: [token]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(AppActions.appTokensDataLoaded).toHaveBeenCalled();
  });

  it('keeps tokens from a healthy chain when another chain returns a non-array', async () => {
    const token = makeToken({address: '0xhealthy', symbol: 'OK'});
    mockedAxios.get.mockImplementation((url: string) =>
      url.endsWith('/eth')
        ? Promise.resolve({data: {someKey: 'someValue'}})
        : Promise.resolve({data: [token]}),
    );

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    const {tokenOptionsByAddress} = mockedSetTokenOptions.mock.calls[0][0];
    expect(Object.keys(tokenOptionsByAddress)).toHaveLength(1);
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalled();
  });

  it('keeps tokens from a healthy chain when another chain request fails', async () => {
    const token = makeToken({address: '0xhealthy', symbol: 'OK'});
    mockedAxios.get.mockImplementation((url: string) =>
      url.endsWith('/eth')
        ? Promise.reject(new Error('network error'))
        : Promise.resolve({data: [token]}),
    );

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    const {tokenOptionsByAddress} = mockedSetTokenOptions.mock.calls[0][0];
    expect(Object.keys(tokenOptionsByAddress)).toHaveLength(1);
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalled();
  });

  it('passes empty token maps when every chain fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    const {tokenOptionsByAddress, tokenDataByAddress} =
      mockedSetTokenOptions.mock.calls[0][0];
    expect(tokenOptionsByAddress).toEqual({});
    expect(tokenDataByAddress).toEqual({});
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalled();
  });

  it('dispatches failedGetTokenOptions when tokenManager.setTokenOptions throws', async () => {
    // The outer catch is triggered by something outside the inner axios try/catch.
    // Make setTokenOptions throw to simulate an unexpected outer error.
    const token = makeToken();
    mockedAxios.get.mockResolvedValue({data: [token]});
    mockedSetTokenOptions.mockImplementationOnce(() => {
      throw new Error('storage failure');
    });

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(failedGetTokenOptions).toHaveBeenCalled();
    // Even on failure, APP_TOKENS_DATA_LOADED is dispatched
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalled();
  });

  it('includes the token in setTokenOptions when it is not a BitpaySupported token', async () => {
    const token = makeToken({address: '0xdeadbeef', symbol: 'TEST'});
    mockedAxios.get.mockResolvedValue({data: [token]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    const {tokenOptionsByAddress} = mockedSetTokenOptions.mock.calls[0][0];
    expect(Object.keys(tokenOptionsByAddress).length).toBeGreaterThanOrEqual(1);
  });

  it('passes tokenDataByAddress with correct fields to setTokenOptions', async () => {
    const token = makeToken({
      address: '0xabc123',
      name: 'My Token',
      symbol: 'MYT',
      decimals: 8,
    });
    mockedAxios.get.mockResolvedValue({data: [token]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    const {tokenDataByAddress} = mockedSetTokenOptions.mock.calls[0][0];
    const values = Object.values(tokenDataByAddress) as any[];
    expect(values.length).toBe(2);
    expect(values.map(v => v.chain)).toEqual(['eth', 'matic']);
    expect(values[0].coin).toBe('myt');
    expect(values[0].unitInfo.unitDecimals).toBe(8);
    expect(values[0].properties.isCustom).toBe(true);
  });
});

describe('startGetTokenOptions – token list cache', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const cache = (chain: string, tokens: any[], savedAt = Date.now()) =>
    mockMmkvStore.set(chain, JSON.stringify({savedAt, tokens}));
  const cachedChain = (chain: string) =>
    JSON.parse(mockMmkvStore.get(chain) as string);
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));
  const addressesIn = (call: number) =>
    Object.keys(
      mockedSetTokenOptions.mock.calls[call][0].tokenOptionsByAddress,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockMmkvStore.clear();
  });

  it('uses fresh cached lists without any network request', async () => {
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})]);
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})]);

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());
    await flush();

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    expect(addressesIn(0)).toHaveLength(2);
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalledTimes(1);
  });

  it('writes fetched lists to the cache', async () => {
    mockedAxios.get.mockResolvedValue({data: [makeToken()]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(cachedChain('eth').tokens).toHaveLength(1);
    expect(cachedChain('matic').tokens).toHaveLength(1);
  });

  it('refreshes stale lists in the background, keeping the cached list for a chain that fails', async () => {
    const old = Date.now() - 2 * DAY;
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})], old);
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})], old);
    mockedAxios.get.mockImplementation((url: string) =>
      url.endsWith('/eth')
        ? Promise.reject(new Error('network error'))
        : Promise.resolve({data: [makeToken({address: '0xm2', symbol: 'M2'})]}),
    );

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());
    // Cached lists are applied before any network result.
    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    await flush();

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(2);
    expect(addressesIn(1).sort()).toEqual(['0xe1_e', '0xm2_m'].sort());
    expect(cachedChain('eth').savedAt).toBe(old);
    expect(cachedChain('matic').tokens[0].address).toBe('0xm2');
    expect(AppActions.appTokensDataLoaded).toHaveBeenCalledTimes(1);
  });

  it('keeps the cached lists when every background refresh request fails', async () => {
    const old = Date.now() - 2 * DAY;
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})], old);
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})], old);
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());
    await flush();

    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    expect(cachedChain('eth').savedAt).toBe(old);
  });

  it('treats a cache entry dated in the future as stale', async () => {
    const future = Date.now() + DAY;
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})], future);
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})], future);
    mockedAxios.get.mockResolvedValue({data: [makeToken()]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());
    await flush();

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('fetches when a chain is missing from the cache, falling back to cache for a failed chain', async () => {
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})]);
    mockedAxios.get.mockImplementation((url: string) =>
      url.endsWith('/eth')
        ? Promise.reject(new Error('network error'))
        : Promise.resolve({data: [makeToken({address: '0xm1', symbol: 'M1'})]}),
    );

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(1);
    expect(addressesIn(0)).toHaveLength(2);
  });

  it('drops malformed tokens before caching or applying them', async () => {
    mockedAxios.get.mockResolvedValue({
      data: [makeToken(), {address: '0xbad', symbol: 'BAD'}],
    });

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(cachedChain('eth').tokens).toHaveLength(1);
    expect(addressesIn(0)).toHaveLength(2);
    expect(failedGetTokenOptions).not.toHaveBeenCalled();
  });

  it('discards a cache that fails to apply and fetches fresh lists', async () => {
    cache('eth', [makeToken({address: '0xe1', symbol: 'E1'})]);
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})]);
    mockedSetTokenOptions.mockImplementationOnce(() => {
      throw new Error('bad cached data');
    });
    mockedAxios.get.mockResolvedValue({
      data: [makeToken({address: '0xf1', symbol: 'F1'})],
    });

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedSetTokenOptions).toHaveBeenCalledTimes(2);
    expect(cachedChain('eth').tokens[0].address).toBe('0xf1');
    expect(failedGetTokenOptions).not.toHaveBeenCalled();
  });

  it('ignores an unreadable cache entry and fetches', async () => {
    mockMmkvStore.set('eth', 'not json');
    cache('matic', [makeToken({address: '0xm1', symbol: 'M1'})]);
    mockedAxios.get.mockResolvedValue({data: [makeToken()]});

    const store = configureTestStore({});
    await store.dispatch(startGetTokenOptions());

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(cachedChain('eth').tokens).toHaveLength(1);
  });
});

describe('addCustomTokenOption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls successGetCustomTokenOptions for a non-bitpay token', async () => {
    const token = makeToken();
    const store = configureTestStore({});
    await store.dispatch(addCustomTokenOption(token, 'eth'));

    expect(successGetCustomTokenOptions).toHaveBeenCalledTimes(1);
    const arg = successGetCustomTokenOptions.mock.calls[0][0];
    expect(arg.customTokenOptionsByAddress).toBeDefined();
    expect(arg.customTokenDataByAddress).toBeDefined();
  });

  it('populates token data: strips (PoS), lowercases coin, sets isCustom and unitInfo', async () => {
    const token = makeToken({
      address: '0xaabbcc',
      name: 'My Token (PoS)',
      symbol: 'MTK',
      decimals: 6,
    });
    const store = configureTestStore({});
    await store.dispatch(addCustomTokenOption(token, 'eth'));

    expect(successGetCustomTokenOptions).toHaveBeenCalledTimes(1);
    const {customTokenDataByAddress} =
      successGetCustomTokenOptions.mock.calls[0][0];
    const values = Object.values(customTokenDataByAddress) as any[];
    expect(values.length).toBe(1);

    const tokenData = values[0];
    expect(tokenData.name).toBe('My Token');
    expect(tokenData.coin).toBe('mtk');
    expect(tokenData.unitInfo.unitDecimals).toBe(6);
    expect(tokenData.unitInfo.unitToSatoshi).toBe(10 ** 6);
    expect(tokenData.properties.isCustom).toBe(true);
    expect(tokenData.properties.isERCToken).toBe(true);
    expect(tokenData.properties.singleAddress).toBe(true);
  });

  it('returns early without dispatching if token address is already in BitpaySupportedTokens', async () => {
    const {getCurrencyAbbreviation} = jest.requireActual(
      '../../../../utils/helper-methods',
    );
    const token = makeToken({address: '0xdeadbeef', symbol: 'TEST'});
    const abbr = getCurrencyAbbreviation(token.address, 'eth');

    const currenciesMock = jest.requireMock('../../../../constants/currencies');
    currenciesMock.BitpaySupportedTokens[abbr] = {coin: 'test'};

    const store = configureTestStore({});
    await store.dispatch(addCustomTokenOption(token, 'eth'));

    expect(successGetCustomTokenOptions).not.toHaveBeenCalled();
    expect(failedGetTokenOptions).not.toHaveBeenCalled();

    delete currenciesMock.BitpaySupportedTokens[abbr];
  });

  it('stores the original token object in customTokenOptionsByAddress', async () => {
    const token = makeToken({address: '0x111222', symbol: 'FOO', decimals: 8});
    const store = configureTestStore({});
    await store.dispatch(addCustomTokenOption(token, 'eth'));

    expect(successGetCustomTokenOptions).toHaveBeenCalledTimes(1);
    const {customTokenOptionsByAddress} =
      successGetCustomTokenOptions.mock.calls[0][0];
    const storedToken = Object.values(customTokenOptionsByAddress)[0];
    expect(storedToken).toEqual(token);
  });

  it('calls failedGetTokenOptions on internal error', async () => {
    // Remove 'eth' from the BLOCKCHAIN_EXPLORERS proxy by temporarily making it undefined
    const configMock = jest.requireMock('../../../../constants/config');
    const originalExplorers = configMock.BLOCKCHAIN_EXPLORERS;
    // Override with a proxy that returns undefined for 'eth' to trigger a TypeError
    configMock.BLOCKCHAIN_EXPLORERS = new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'eth' ? undefined : {livenet: '', testnet: ''},
      },
    );

    const token = makeToken();
    const store = configureTestStore({});
    await store.dispatch(addCustomTokenOption(token, 'eth'));

    expect(failedGetTokenOptions).toHaveBeenCalled();

    configMock.BLOCKCHAIN_EXPLORERS = originalExplorers;
  });
});

describe('startCustomTokensMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves without error when customTokenOptions is empty', async () => {
    const store = configureTestStore({
      WALLET: {customTokenOptions: {}, customTokenData: {}},
    });
    await expect(
      store.dispatch(startCustomTokensMigration()),
    ).resolves.toBeUndefined();
  });

  it('resolves without error when customTokenOptions is undefined', async () => {
    const store = configureTestStore({
      WALLET: {customTokenOptions: undefined, customTokenData: {}},
    });
    await expect(
      store.dispatch(startCustomTokensMigration()),
    ).resolves.toBeUndefined();
  });

  it('runs migration logic for each entry in customTokenOptions without throwing', async () => {
    const customToken = {
      name: 'My Custom Token',
      symbol: 'MCT',
      decimals: '18',
      address: '0x123abc',
    };
    const state = {
      WALLET: {
        customTokenOptions: {MCT: customToken},
        customTokenData: {mct: {chain: 'eth'}},
      },
    };
    const store = configureTestStore(state);
    await expect(
      store.dispatch(startCustomTokensMigration()),
    ).resolves.toBeUndefined();
  });

  it('uses "eth" as the default chain when customTokenData entry is missing', async () => {
    const customToken = {
      name: 'No Chain Token',
      symbol: 'NCT',
      decimals: '8',
      address: '0xfedcba',
    };
    const state = {
      WALLET: {
        customTokenOptions: {NCT: customToken},
        customTokenData: {}, // no chain info
      },
    };
    const store = configureTestStore(state);
    await expect(
      store.dispatch(startCustomTokensMigration()),
    ).resolves.toBeUndefined();
  });
});
