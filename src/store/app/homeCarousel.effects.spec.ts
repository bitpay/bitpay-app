jest.mock('../../utils/portfolio/assets', () => ({
  getHiddenKeyIdsFromHomeCarouselConfig: jest.fn(
    ({
      keys,
      homeCarouselConfig,
    }: {
      keys?: Record<string, any>;
      homeCarouselConfig?: Array<{id: string; show: boolean}>;
    }) =>
      new Set(
        (homeCarouselConfig || [])
          .filter(
            item =>
              item?.show === false &&
              item?.id !== 'coinbaseBalanceCard' &&
              !!keys?.[item?.id],
          )
          .map(item => item.id),
      ),
  ),
  getVisibleWalletsForKey: jest.fn((key?: any) =>
    (key?.wallets || []).filter(
      (wallet: any) => !wallet?.hideWallet && !wallet?.hideWalletByAccount,
    ),
  ),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    warn: jest.fn(),
  },
}));

jest.mock('../portfolio', () => ({
  populatePortfolio: jest.fn((payload: any) => ({
    payload,
    type: 'POPULATE_PORTFOLIO',
  })),
}));

import {setHomeCarouselConfigAndPopulateNewlyVisibleKeys} from './homeCarousel.effects';

const mockPopulatePortfolio = jest.requireMock('../portfolio')
  .populatePortfolio as jest.Mock;
const mockLogManager = jest.requireMock('../../managers/LogManager')
  .logManager as {warn: jest.Mock};

const walletFactory = (id: string, overrides: Record<string, any> = {}) => ({
  chain: 'btc',
  currencyAbbreviation: 'btc',
  id,
  network: 'livenet',
  ...overrides,
});

const keyFactory = (id: string, wallets: any[] = []) => ({id, wallets});

const makeState = (overrides: Record<string, any> = {}) => {
  const {
    APP: appOverrides,
    PORTFOLIO: portfolioOverrides,
    WALLET: walletOverrides,
    ...rootOverrides
  } = overrides;

  return {
    ...rootOverrides,
    APP: {
      defaultAltCurrency: {isoCode: 'USD'},
      homeCarouselConfig: [],
      ...appOverrides,
    },
    PORTFOLIO: {
      quoteCurrency: undefined,
      populateStatus: {inProgress: false},
      ...portfolioOverrides,
    },
    WALLET: {
      keys: {},
      ...walletOverrides,
    },
  };
};

const makeStore = (state: Record<string, any>) => {
  const dispatched: any[] = [];
  const getState = () => state;
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }

    dispatched.push(action);
    if (action?.type === 'APP/SET_HOME_CAROUSEL_CONFIG') {
      state.APP.homeCarouselConfig = Array.isArray(action.payload)
        ? action.payload
        : [...(state.APP.homeCarouselConfig || []), action.payload];
    }
    return action;
  });

  return {dispatch, dispatched};
};

describe('setHomeCarouselConfigAndPopulateNewlyVisibleKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('populates portfolio wallets for a hidden key that becomes visible', async () => {
    const wallet = walletFactory('wallet-1');
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'key-1', show: false}],
      },
      PORTFOLIO: {quoteCurrency: 'eur'},
      WALLET: {keys: {'key-1': keyFactory('key-1', [wallet])}},
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'key-1', show: true},
      ]),
    );

    expect(mockPopulatePortfolio).toHaveBeenCalledWith({
      wallets: [wallet],
      quoteCurrency: 'EUR',
    });
  });

  it('logs populate failures without rejecting the home carousel update', async () => {
    const wallet = walletFactory('wallet-1');
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'key-1', show: false}],
      },
      WALLET: {keys: {'key-1': keyFactory('key-1', [wallet])}},
    });
    const {dispatch} = makeStore(state);
    mockPopulatePortfolio.mockReturnValueOnce(async () => {
      throw new Error('populate failed');
    });

    await expect(
      dispatch(
        setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
          {id: 'key-1', show: true},
        ]),
      ),
    ).resolves.toBeUndefined();

    expect(mockLogManager.warn).toHaveBeenCalledWith(
      '[portfolio] Failed populating newly visible home carousel keys: populate failed',
    );
  });

  it('does not populate when a visible key becomes hidden', async () => {
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'key-1', show: true}],
      },
      WALLET: {keys: {'key-1': keyFactory('key-1', [walletFactory('w1')])}},
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'key-1', show: false},
      ]),
    );

    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('does not populate when a visible key remains visible', async () => {
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'key-1', show: true}],
      },
      WALLET: {keys: {'key-1': keyFactory('key-1', [walletFactory('w1')])}},
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'key-1', show: true},
      ]),
    );

    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('populates all relevant wallets for multiple newly visible keys', async () => {
    const wallet1 = walletFactory('wallet-1');
    const wallet2 = walletFactory('wallet-2');
    const state = makeState({
      APP: {
        defaultAltCurrency: {isoCode: 'gbp'},
        homeCarouselConfig: [
          {id: 'key-1', show: false},
          {id: 'key-2', show: false},
        ],
      },
      WALLET: {
        keys: {
          'key-1': keyFactory('key-1', [wallet1]),
          'key-2': keyFactory('key-2', [wallet2]),
        },
      },
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'key-1', show: true},
        {id: 'key-2', show: true},
      ]),
    );

    expect(mockPopulatePortfolio).toHaveBeenCalledWith({
      wallets: [wallet1, wallet2],
      quoteCurrency: 'GBP',
    });
  });

  it('ignores coinbaseBalanceCard visibility changes', async () => {
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'coinbaseBalanceCard', show: false}],
      },
      WALLET: {keys: {}},
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'coinbaseBalanceCard', show: true},
      ]),
    );

    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('excludes individually hidden wallets from newly visible key populates', async () => {
    const visibleWallet = walletFactory('wallet-visible');
    const hiddenWallet = walletFactory('wallet-hidden', {hideWallet: true});
    const hiddenAccountWallet = walletFactory('wallet-hidden-account', {
      hideWalletByAccount: true,
    });
    const state = makeState({
      APP: {
        homeCarouselConfig: [{id: 'key-1', show: false}],
      },
      WALLET: {
        keys: {
          'key-1': keyFactory('key-1', [
            visibleWallet,
            hiddenWallet,
            hiddenAccountWallet,
          ]),
        },
      },
    });
    const {dispatch} = makeStore(state);

    await dispatch(
      setHomeCarouselConfigAndPopulateNewlyVisibleKeys([
        {id: 'key-1', show: true},
      ]),
    );

    expect(mockPopulatePortfolio).toHaveBeenCalledWith({
      wallets: [visibleWallet],
      quoteCurrency: 'USD',
    });
  });
});
