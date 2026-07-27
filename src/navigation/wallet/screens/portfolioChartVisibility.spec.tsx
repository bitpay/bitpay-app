import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ThemeProvider} from '../../../contexts';
import KeyOverview from './KeyOverview';
import WalletDetails from './WalletDetails';
import AccountDetails from './AccountDetails';
import HomeRoot from '../../tabs/home/HomeRoot';
import PortfolioBalance from '../../tabs/home/components/PortfolioBalance';
import usePortfolioWalletSnapshotPresence from '../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence';
import {
  cacheBalanceHistoryChartSeries,
  clearBalanceHistoryChartSeriesCache,
} from '../../../components/charts/balanceHistoryChartSeriesCache';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native-worklets', () => ({
  createWorkletRuntime: jest.fn(() => ({
    runAsync: jest.fn(),
    runGuarded: jest.fn(),
    runSync: jest.fn(),
  })),
  runOnRuntimeAsync: jest.fn(() => Promise.resolve()),
  scheduleOnRN: jest.fn(
    (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
  ),
}));

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native');
  const createAnimatedComponent = (component: unknown) => component;
  return {
    __esModule: true,
    default: {View, createAnimatedComponent},
    cancelAnimation: jest.fn(),
    createAnimatedComponent,
    Easing: {
      bezier: jest.fn(),
      cubic: jest.fn(),
      ease: jest.fn(),
      in: (value: unknown) => value,
      inOut: (value: unknown) => value,
      linear: jest.fn(),
      out: (value: unknown) => value,
    },
    interpolate: jest.fn(
      (_value: number, _input: number[], output: number[]) => output[0],
    ),
    runOnJS: (fn: (...args: any[]) => any) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useDerivedValue: (fn: () => unknown) => ({value: fn()}),
    useSharedValue: (value: unknown) => ({value}),
    withDelay: (_delay: number, value: unknown) => value,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withTiming: (
      value: unknown,
      _config?: unknown,
      callback?: (finished?: boolean) => void,
    ) => {
      callback?.(true);
      return value;
    },
  };
});

let mockState: any;
let mockRouteParams: any;
let mockIsFocused = false;
const mockDispatch: jest.Mock = jest.fn((action: any): any =>
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action,
);
let mockTransitionEndListener:
  | ((event: {data: {closing: boolean}}) => void)
  | undefined;
const mockNavigation = {
  addListener: jest.fn((event: string, callback: () => void) => {
    if (event === 'transitionEnd') {
      mockTransitionEndListener = callback as typeof mockTransitionEndListener;
    }
    return jest.fn();
  }),
  dispatch: jest.fn(),
  getParent: jest.fn(() => ({
    navigate: jest.fn(),
  })),
  isFocused: jest.fn(() => mockIsFocused),
  navigate: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
};
const testTheme = {
  dark: false,
  colors: {
    background: '#ffffff',
    text: '#000000',
  },
};
let mockWallet: any;
let mockKey: any;
let mockAccountList: any[];

const renderComponent = (component: any) => {
  if (!component) {
    return null;
  }
  return typeof component === 'function'
    ? React.createElement(component)
    : component;
};

jest.mock('@react-navigation/native', () => ({
  CommonActions: {
    reset: jest.fn(payload => payload),
  },
  createNavigatorFactory: jest.fn((navigator: unknown) => navigator),
  useFocusEffect: jest.fn(),
  useIsFocused: () => mockIsFocused,
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: mockRouteParams,
  }),
  useScrollToTop: jest.fn(),
  useTheme: () => ({
    dark: false,
    colors: {
      background: '#fff',
      text: '#000',
    },
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({children}: {children?: React.ReactNode}) => children,
    Screen: () => null,
  })),
}));

jest.mock('@react-navigation/material-top-tabs', () => ({
  createMaterialTopTabNavigator: jest.fn(() => ({
    Navigator: ({children}: {children?: React.ReactNode}) => children,
    Screen: () => null,
  })),
}));

jest.mock('../../../Root', () => ({
  RootStacks: {
    TABS: 'Tabs',
  },
}));

jest.mock('../../tabs/TabsStack', () => ({
  TabsScreens: {
    HOME: 'Home',
  },
}));

jest.mock('../../tabs/TabScreenErrorFallback', () => ({
  withErrorFallback: (Component: React.ComponentType<any>) => Component,
}));

jest.mock('../../coinbase/CoinbaseGroup', () => ({
  CoinbaseScreens: {
    ROOT: 'CoinbaseRoot',
  },
}));

jest.mock('../../services/ExternalServicesGroup', () => ({
  ExternalServicesScreens: {
    ROOT_BUY_AND_SELL: 'RootBuyAndSell',
  },
}));

jest.mock('../WalletGroup', () => ({
  WalletScreens: {
    AMOUNT: 'Amount',
    EXPORT_TSS_WALLET: 'ExportTssWallet',
    INVITE_COSIGNERS: 'InviteCosigners',
  },
}));

jest.mock('../../../store/app/app.actions', () => ({
  dismissDecryptPasswordModal: jest.fn(() => ({
    type: 'DISMISS_DECRYPT_PASSWORD_MODAL',
  })),
  setDefaultChainFilterOption: jest.fn(
    (selectedChainFilterOption?: string) => ({
      selectedChainFilterOption,
      type: 'SET_DEFAULT_CHAIN_FILTER_OPTION',
    }),
  ),
  showBottomNotificationModal: jest.fn((payload?: unknown) => ({
    payload,
    type: 'SHOW_BOTTOM_NOTIFICATION_MODAL',
  })),
  showDecryptPasswordModal: jest.fn((payload?: unknown) => ({
    payload,
    type: 'SHOW_DECRYPT_PASSWORD_MODAL',
  })),
  toggleHideAllBalances: jest.fn(() => ({
    type: 'TOGGLE_HIDE_ALL_BALANCES',
  })),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const ReactLib = require('react');

  const overrides = {
    DeviceEventEmitter: {
      addListener: jest.fn(() => ({remove: jest.fn()})),
    },
    RefreshControl: () => null,
    SafeAreaView: RN.View,
    SectionList: ({ListHeaderComponent, ListFooterComponent}: any) =>
      ReactLib.createElement(
        RN.View,
        null,
        renderComponent(ListHeaderComponent),
        renderComponent(ListFooterComponent),
      ),
    useWindowDimensions: () => ({height: 844, width: 390}),
  };

  return new Proxy(RN, {
    get(target, prop) {
      if (prop in overrides) {
        return overrides[prop as keyof typeof overrides];
      }

      return target[prop as keyof typeof target];
    },
  });
});

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: any) => any) => selector(mockState),
  useStore: () => ({
    getState: () => mockState,
  }),
}));

jest.mock('@shopify/flash-list', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return {
    FlashList: ({ListHeaderComponent, ListFooterComponent}: any) =>
      ReactLib.createElement(
        View,
        null,
        renderComponent(ListHeaderComponent),
        renderComponent(ListFooterComponent),
      ),
  };
});

jest.mock('@components/base/TouchableOpacity', () => {
  const ReactLib = require('react');
  const {TouchableOpacity} = require('react-native');
  return {
    TouchableOpacity: ({children, ...props}: any) =>
      ReactLib.createElement(TouchableOpacity, props, children),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

jest.mock('lodash.debounce', () => (fn: (...args: any[]) => any) => {
  const debounced = (...args: any[]) => fn(...args);
  debounced.cancel = jest.fn();
  return debounced;
});

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => any) => selector(mockState),
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../../contexts', () => ({
  useOngoingProcess: () => ({
    hideOngoingProcess: jest.fn(),
    showOngoingProcess: jest.fn(),
  }),
  useTokenContext: () => ({
    tokenOptionsByAddress: {},
  }),
  ThemeProvider: ({children}: {children: React.ReactNode}) => children,
  useTheme: () => ({
    dark: false,
    colors: {
      background: '#ffffff',
      text: '#000000',
    },
  }),
}));

jest.mock('../../../components/charts/BalanceHistoryChart', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return jest.fn((props: any) =>
    ReactLib.createElement(
      View,
      {testID: 'balance-history-chart'},
      props.showLoaderWhenNoSnapshots
        ? ReactLib.createElement(View, {
            testID: 'balance-history-chart-loader',
          })
        : null,
    ),
  );
});

jest.mock('../../../components/charts/BalanceChartLoadingPlaceholder', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return () =>
    ReactLib.createElement(View, {
      testID: 'balance-chart-loading-placeholder',
    });
});

jest.mock(
  '../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence',
  () =>
    jest.fn(() => ({
      checked: true,
      hasAllSnapshots: true,
      hasAnySnapshots: true,
      loading: false,
    })),
);

jest.mock(
  '../../../portfolio/ui/hooks/usePortfolioBalanceChartEligibleWallets',
  () =>
    jest.fn(({enabled = true, wallets}: {enabled?: boolean; wallets?: any[]}) =>
      enabled ? wallets || [] : [],
    ),
);

jest.mock('../../../portfolio/ui/common', () => ({
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({defaultAltCurrencyIsoCode}: {defaultAltCurrencyIsoCode?: string}) =>
      defaultAltCurrencyIsoCode || 'USD',
  ),
}));

jest.mock('../../../portfolio/ui/hooks/useRuntimeFiatRateSeriesCache', () =>
  jest.fn(() => ({
    cache: {},
    reload: jest.fn(() => Promise.resolve()),
  })),
);

jest.mock('../../../portfolio/ui/hooks/usePortfolioGainLossSummary', () =>
  jest.fn(() => ({
    data: undefined,
    loading: false,
  })),
);

jest.mock('../../../components/chain-search/ChainSearch', () => () => null);
jest.mock('../../../components/settings/Settings', () => () => null);
jest.mock('../components/OptionsSheet', () => () => null);
jest.mock('../../../components/modal/base/sheet/SheetModal', () => () => null);
jest.mock('../components/ReceiveAddress', () => () => null);
jest.mock('../components/BalanceDetailsModal', () => () => null);
jest.mock('../../../components/button/Button', () => {
  const ReactLib = require('react');
  const {Text} = require('react-native');
  return ({children}: {children?: React.ReactNode}) =>
    ReactLib.createElement(Text, null, children);
});
jest.mock('../../tabs/home/components/HomeSection', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return ({children, style}: {children?: React.ReactNode; style?: any}) =>
    ReactLib.createElement(View, {style, testID: 'home-section'}, children);
});
jest.mock('../../tabs/home/components/HeaderProfileButton', () => () => null);
jest.mock('../../tabs/home/components/HeaderScanButton', () => () => null);
jest.mock('../../tabs/home/components/Crypto', () => () => null);
jest.mock('../../tabs/home/components/MarketingCarousel', () => () => null);
jest.mock('../../tabs/home/components/DefaultMarketingCards', () =>
  jest.fn(() => []),
);
jest.mock('../../tabs/home/components/offers/MockOffers', () =>
  jest.fn(() => []),
);
jest.mock('../../tabs/home/components/offers/OffersCarousel', () => () => null);
jest.mock(
  '../../tabs/home/components/exchange-rates/ExchangeRatesList',
  () => () => null,
);
jest.mock(
  '../../tabs/home/components/SecurePasskeyBannerGate',
  () => () => null,
);
jest.mock('../../tabs/home/components/AssetsSection', () => () => null);
jest.mock(
  '../../tabs/home/components/KeyMigrationFailureModal',
  () => () => null,
);
jest.mock('../../tabs/home/homeExchangeRates', () => jest.fn(() => []));
jest.mock('../../tabs/home/components/LinkingButtons', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return () => ReactLib.createElement(View, {testID: 'home-linking-buttons'});
});
jest.mock('../../../components/list/AccountListRow', () => () => null);
jest.mock('../../../components/list/TransactionRow', () => () => null);
jest.mock('../../../components/list/TransactionProposalRow', () => () => null);
jest.mock(
  '../../../components/list/WalletTransactionSkeletonRow',
  () => () => null,
);
jest.mock('../../../components/list/AssetsByChainRow', () => () => null);
jest.mock('../../../components/archax/archax-footer', () => () => null);
jest.mock('../../tabs/home/components/AllocationSection', () => ({
  __esModule: true,
  AllocationDonutLegendCard: () => null,
  default: () => null,
}));
jest.mock('../../tabs/home/screens/Allocation', () => ({
  AllocationRowsList: () => null,
}));

jest.mock('../components/WalletIcons', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  const Icon = () => ReactLib.createElement(View);
  return {
    __esModule: true,
    default: {
      Cog: Icon,
      Encrypt: Icon,
      Network: Icon,
      RequestAmount: Icon,
      Settings: Icon,
      ShareAddress: Icon,
      Wallet: Icon,
    },
  };
});

jest.mock('../../../store/wallet/utils/wallet', () => ({
  buildAccountList: jest.fn(() => mockAccountList),
  buildAssetsByChainList: jest.fn(() => []),
  buildUIFormattedWallet: jest.fn(() => ({
    chain: mockWallet.chain,
    cryptoBalance: '1.00',
    cryptoLockedBalance: '0',
    cryptoSpendableBalance: '1.00',
    currencyAbbreviation: mockWallet.currencyAbbreviation,
    fiatBalanceFormat: '$100.00',
    fiatLockedBalanceFormat: '$0.00',
    fiatSpendableBalanceFormat: '$100.00',
    network: mockWallet.network,
    pendingTxps: [],
    tokenAddress: mockWallet.tokenAddress,
    walletName: mockWallet.walletName,
  })),
  buildWalletObj: jest.fn(() => mockWallet),
  checkPrivateKeyEncrypted: jest.fn(() => false),
  getWalletAccountVisibilityKey: jest.fn(
    (wallet: any) => wallet?.receiveAddress || '',
  ),
  isWalletVisibleForKey: jest.fn(() => true),
  findWalletById: jest.fn(() => mockWallet),
  getRemainingWalletCount: jest.fn(() => 0),
  isSegwit: jest.fn(() => false),
  isTaproot: jest.fn(() => false),
  mapAbbreviationAndName: jest.fn(() => ({
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
  })),
}));

const mockWalletHasNonZeroLiveBalance = (wallet: any) => {
  const balance = wallet?.balance || {};
  return (
    Number(balance.sat || 0) > 0 ||
    Number(balance.fiat || 0) > 0 ||
    Number(String(balance.crypto || '0').replace(/,/g, '')) > 0
  );
};

const mockLegacyLastDayPnl = (currentFiat: unknown, lastDayFiat: unknown) => {
  const current = Number(currentFiat) || 0;
  const lastDay = Number(lastDayFiat) || 0;
  if (!(current > 0) || !(lastDay > 0)) {
    return undefined;
  }
  const deltaFiat = current - lastDay;
  return {
    deltaFiat,
    percent: Number(((deltaFiat * 100) / lastDay).toFixed(2)),
    isPositive: deltaFiat >= 0,
  };
};

jest.mock('../../../utils/portfolio/assets', () => ({
  buildLegacyLastDayRateRequestsForWallets: jest.fn(
    ({wallets}: {wallets?: any[]}) =>
      (wallets || [])
        .filter(wallet => Number(wallet?.balance?.fiat || 0) > 0)
        .map(wallet => ({
          coin: wallet.currencyAbbreviation,
          chain: wallet.chain,
          tokenAddress: wallet.tokenAddress,
          intervals: ['1D'],
        })),
  ),
  getLegacyLastDayPnlForRepresentativeAsset: jest.fn(
    ({
      currentFiatBalance,
      fallbackLastDayFiatBalance,
    }: {
      currentFiatBalance?: number;
      fallbackLastDayFiatBalance?: number;
    }) => mockLegacyLastDayPnl(currentFiatBalance, fallbackLastDayFiatBalance),
  ),
  getLegacyLastDayPnlForWallets: jest.fn(
    ({
      wallets,
      currentFiatBalance,
    }: {
      wallets?: any[];
      currentFiatBalance?: number;
    }) => {
      const lastDay = (wallets || []).reduce(
        (total, wallet) => total + (Number(wallet?.balance?.fiatLastDay) || 0),
        0,
      );
      return mockLegacyLastDayPnl(currentFiatBalance, lastDay);
    },
  ),
  getLegacyLastDayRateRequestForAsset: jest.fn((identity?: any) =>
    identity?.currencyAbbreviation
      ? {
          coin: identity.currencyAbbreviation,
          chain: identity.chain,
          tokenAddress: identity.tokenAddress,
          intervals: ['1D'],
        }
      : undefined,
  ),
  getQuoteCurrency: jest.fn(
    ({
      defaultAltCurrencyIsoCode,
      portfolioQuoteCurrency,
    }: {
      defaultAltCurrencyIsoCode?: string;
      portfolioQuoteCurrency?: string;
    }) => portfolioQuoteCurrency || defaultAltCurrencyIsoCode || 'USD',
  ),
  getLegacyLastDayPnlFromTotals: jest.fn(
    ({
      currentFiatBalance,
      lastDayFiatBalance,
    }: {
      currentFiatBalance?: number;
      lastDayFiatBalance?: number;
    }) => mockLegacyLastDayPnl(currentFiatBalance, lastDayFiatBalance),
  ),
  getVisibleKeysFromKeys: jest.fn((keys: any) => Object.values(keys || {})),
  getVisibleWalletsFromKeys: jest.fn((keys: any) =>
    Object.values(keys || {}).flatMap((key: any) => key?.wallets || []),
  ),
  getVisibleWalletsForKey: jest.fn((key: any) => key?.wallets || []),
  hasCompletedPopulateForWallets: jest.fn(
    ({
      populateStatus,
      wallets,
      requireAllWalletsInScope,
    }: {
      populateStatus?: any;
      wallets?: any[];
      requireAllWalletsInScope?: boolean;
    }) => {
      if (!populateStatus?.inProgress) {
        return false;
      }

      const walletIds = (wallets || [])
        .map(wallet => wallet?.id)
        .filter(Boolean);
      const activeWalletIds = new Set([
        ...Object.keys(populateStatus.walletStatusById || {}),
        ...(populateStatus.currentWalletId
          ? [populateStatus.currentWalletId]
          : []),
      ]);
      const scopedWalletIds = walletIds.filter(walletId =>
        activeWalletIds.has(walletId),
      );
      if (!scopedWalletIds.length) {
        return false;
      }
      if (
        requireAllWalletsInScope &&
        scopedWalletIds.length !== walletIds.length
      ) {
        return false;
      }

      return scopedWalletIds.every(walletId =>
        ['done', 'error'].includes(populateStatus.walletStatusById?.[walletId]),
      );
    },
  ),
  isPopulateLoadingForWallets: jest.fn(
    ({populateStatus, wallets}: {populateStatus?: any; wallets?: any[]}) => {
      if (!populateStatus?.inProgress) {
        return false;
      }

      const walletIds = (wallets || [])
        .map(wallet => wallet?.id)
        .filter(Boolean);
      const activeWalletIds = new Set([
        ...Object.keys(populateStatus.walletStatusById || {}),
        ...(populateStatus.currentWalletId
          ? [populateStatus.currentWalletId]
          : []),
      ]);
      const scopedWalletIds = walletIds.filter(walletId =>
        activeWalletIds.has(walletId),
      );

      return scopedWalletIds.some(walletId => {
        if (walletId === populateStatus.currentWalletId) {
          return true;
        }
        return populateStatus.walletStatusById?.[walletId] === 'in_progress';
      });
    },
  ),
  walletHasNonZeroLiveBalance: jest.fn(mockWalletHasNonZeroLiveBalance),
  walletsHaveNonZeroLiveBalance: jest.fn((wallets?: any[]) =>
    (wallets || []).some(mockWalletHasNonZeroLiveBalance),
  ),
}));

jest.mock('../../../utils/portfolio/allocation', () => ({
  buildAllocationDataFromWalletRows: jest.fn(() => ({
    legendItems: [],
    rows: [],
    slices: [],
    totalFiat: 0,
  })),
  getPortfolioAllocationTotalFiat: jest.fn(() => 100),
}));

jest.mock('../../../store/wallet/effects', () => ({
  getActiveWalletStoreInitPromise: jest.fn(() => undefined),
  getDecryptPassword: jest.fn(() => Promise.resolve('password')),
  normalizeMnemonic: jest.fn((value: string) => value),
  refreshRatesForPortfolioPnl: jest.fn(() => ({type: 'REFRESH_RATES'})),
  serverAssistedImport: jest.fn(),
  startGetRates: jest.fn(() => ({type: 'START_GET_RATES'})),
}));

jest.mock('../../../store/wallet/effects/status/status', () => ({
  startUpdateAllWalletStatusForKey: jest.fn(() => ({
    type: 'START_UPDATE_ALL_WALLET_STATUS_FOR_KEY',
  })),
  startUpdateWalletStatus: jest.fn(() => ({
    type: 'START_UPDATE_WALLET_STATUS',
  })),
}));

jest.mock('../../../store/wallet/effects/address/address', () => ({
  createWalletAddress: jest.fn(() => Promise.resolve('address')),
}));

jest.mock('../../../store/wallet/effects/transactions/transactions', () => ({
  BuildUiFriendlyList: jest.fn(() => []),
  CanSpeedupTx: jest.fn(() => false),
  GetAccountTransactionHistory: jest.fn(() => Promise.resolve(undefined)),
  GetTransactionHistory: jest.fn(() => Promise.resolve(undefined)),
  GroupTransactionHistory: jest.fn(() => []),
  IsMoved: jest.fn(() => false),
  IsReceived: jest.fn(() => false),
  IsShared: jest.fn(() => false),
  TX_HISTORY_LIMIT: 50,
}));

jest.mock('../../../store/wallet/effects/send/send', () => ({
  buildBtcSpeedupTx: jest.fn(),
  buildEthERCTokenSpeedupTx: jest.fn(),
  createProposalAndBuildTxDetails: jest.fn(),
  handleCreateTxProposalError: jest.fn(() => ({})),
}));

jest.mock('../../../store/wallet/effects/tss-send/tss-send', () => ({
  isTSSKey: jest.fn(() => false),
}));

jest.mock('../../../store/wallet/utils/currency', () => ({
  IsERCToken: jest.fn(() => false),
  IsEVMChain: jest.fn(() => false),
  IsSVMChain: jest.fn(() => false),
  IsVMChain: jest.fn(() => true),
}));

jest.mock('../../services/buy-crypto/utils/buy-crypto-utils', () => ({
  isCoinSupportedToBuy: jest.fn(() => true),
}));
jest.mock('../../services/sell-crypto/utils/sell-crypto-utils', () => ({
  isCoinSupportedToSell: jest.fn(() => true),
}));
jest.mock('../../services/swap-crypto/utils/swap-crypto-utils', () => ({
  isCoinSupportedToSwap: jest.fn(() => true),
}));
jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {
    track: jest.fn(() => ({type: 'ANALYTICS_TRACK'})),
  },
}));
jest.mock('../../../lib/gift-cards/gift-card', () => ({
  getGiftCardIcons: jest.fn(() => []),
}));
jest.mock('../../../utils/portfolio/assetTheme', () => ({
  getAssetTheme: jest.fn(() => undefined),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

const mockBalanceHistoryChart = jest.requireMock(
  '../../../components/charts/BalanceHistoryChart',
) as jest.Mock;
const mockGetTransactionHistory = jest.requireMock(
  '../../../store/wallet/effects/transactions/transactions',
).GetTransactionHistory as jest.Mock;
const mockBuildAccountList = jest.requireMock(
  '../../../store/wallet/utils/wallet',
).buildAccountList as jest.Mock;
const mockBuildUIFormattedWallet = jest.requireMock(
  '../../../store/wallet/utils/wallet',
).buildUIFormattedWallet as jest.Mock;
const mockUsePortfolioWalletSnapshotPresence =
  usePortfolioWalletSnapshotPresence as jest.Mock;

const makeWallet = () => ({
  balance: {
    fiat: 100,
    fiatLastDay: 90,
    sat: 100000000,
    satSpendable: 100000000,
  },
  chain: 'btc',
  credentials: {
    account: 0,
    copayerId: 'copayer-1',
    keyId: 'key-1',
    walletId: 'wallet-1',
    walletName: 'BTC Wallet',
  },
  currencyAbbreviation: 'btc',
  currencyName: 'Bitcoin',
  id: 'wallet-1',
  isScanning: false,
  keyId: 'key-1',
  network: 'livenet',
  pendingTxps: [],
  receiveAddress: 'address-1',
  tokens: [],
  walletName: 'BTC Wallet',
});

const setMockWalletZeroBalance = () => {
  mockWallet.balance = {
    ...mockWallet.balance,
    crypto: '0',
    fiat: 0,
    fiatLastDay: 0,
    sat: 0,
    satSpendable: 0,
  };
  mockKey.totalBalance = 0;
  mockKey.totalBalanceLastDay = 0;
};

const resetState = (
  showPortfolioValue: boolean | undefined,
  options: {
    completedFullPopulate?: boolean;
    homeChartCollapsed?: boolean;
    invalidDecimalsByWalletId?: Record<string, any>;
    populateStatus?: any;
    quarantinesByWalletId?: Record<string, any>;
  } = {},
) => {
  const completedFullPopulate =
    options.completedFullPopulate === false ? false : true;
  const lastFullPopulateCompletedAt = completedFullPopulate ? 1234 : undefined;
  const lastPopulatedAt = completedFullPopulate ? 1234 : undefined;
  mockWallet = makeWallet();
  mockKey = {
    backupComplete: true,
    id: 'key-1',
    isPrivKeyEncrypted: false,
    isReadOnly: false,
    keyName: 'My Key',
    methods: {},
    pendingTxps: [],
    properties: {
      fingerPrint: 'fingerprint',
      id: 'key-1',
    },
    totalBalance: 100,
    totalBalanceLastDay: 90,
    wallets: [mockWallet],
  };
  mockAccountList = [
    {
      chains: ['btc'],
      fiatBalance: 100,
      fiatBalanceFormat: '$100.00',
      fiatLockedBalanceFormat: '$0.00',
      id: 'account-1',
      keyId: 'key-1',
      receiveAddress: 'address-1',
      wallets: [mockWallet],
    },
  ];
  mockState = {
    APP: {
      brazeContentCards: [],
      defaultAltCurrency: {isoCode: 'USD', name: 'US Dollar'},
      dismissedMarketingCardIds: [],
      hideAllBalances: false,
      homeChartCollapsed: options.homeChartCollapsed === true,
      homeChartRemountNonce: 0,
      homeCarouselConfig: [],
      network: 'livenet',
      selectedChainFilterOption: undefined,
      showArchaxBanner: false,
      showPortfolioValue,
    },
    COINBASE: {
      balance: {
        production: 0,
        sandbox: 0,
      },
      token: {},
    },
    CONTACT: {
      list: [],
    },
    LOCATION: {
      locationData: {countryShortCode: 'US'},
    },
    PORTFOLIO: {
      invalidDecimalsByWalletId: options.invalidDecimalsByWalletId || {},
      lastFullPopulateCompletedAt,
      lastPopulatedAt,
      populateStatus: options.populateStatus,
      quoteCurrency: 'USD',
      quarantinesByWalletId: options.quarantinesByWalletId || {},
    },
    RATE: {
      lastDayRates: {},
      rates: {},
    },
    SHOP: {
      billPayAccounts: {},
    },
    SHOP_CATALOG: {
      supportedCardMap: {},
    },
    WALLET: {
      customTokenOptionsByAddress: {},
      keys: {
        'key-1': mockKey,
      },
    },
  };
};

const withTheme = (element: React.ReactElement) => (
  <ThemeProvider theme={testTheme as any}>{element}</ThemeProvider>
);

const renderWithTheme = (element: React.ReactElement) =>
  TestRenderer.create(withTheme(element));

const collectRenderedText = (node: unknown): string[] => {
  if (typeof node === 'string') {
    return [node];
  }
  if (!node || typeof node !== 'object') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(collectRenderedText);
  }

  const children = (node as {children?: unknown}).children;
  return Array.isArray(children) ? children.flatMap(collectRenderedText) : [];
};

const makePopulateStatus = (overrides: Record<string, any> = {}) => ({
  currentWalletId: 'wallet-1',
  errors: [],
  inProgress: true,
  startedAt: 100,
  txRequestsMade: 1,
  txsProcessed: 10,
  walletsCompleted: 0,
  walletsTotal: 1,
  walletStatusById: {'wallet-1': 'in_progress'},
  ...overrides,
});

const makeWalletDetailsScreen = (
  args: {skipInitializeHistory?: boolean} = {},
) => (
  <WalletDetails
    navigation={mockNavigation as any}
    route={
      {
        params: {
          copayerId: 'copayer-1',
          skipInitializeHistory: args.skipInitializeHistory ?? true,
          walletId: 'wallet-1',
        },
      } as any
    }
  />
);

const chartSurfaceCases: Array<[string, () => React.ReactElement, string]> = [
  [
    'Key Overview',
    () => {
      mockRouteParams = {context: undefined, id: 'key-1'};
      return <KeyOverview />;
    },
    'key_overview_balance_chart',
  ],
  ['WalletDetails', makeWalletDetailsScreen, 'wallet_details_balance_chart'],
  [
    'AccountDetails',
    () => (
      <AccountDetails
        navigation={mockNavigation as any}
        route={
          {
            params: {
              isSvmAccount: false,
              keyId: 'key-1',
              selectedAccountAddress: 'address-1',
            },
          } as any
        }
      />
    ),
    'account_details_balance_chart',
  ],
];
const memoizedHeaderChartSurfaceCases = chartSurfaceCases.filter(([screen]) =>
  ['Key Overview', 'AccountDetails'].includes(screen),
);
const portfolioChartSurfaceCases: Array<
  [string, () => React.ReactElement, string]
> = [
  ['Home', () => <PortfolioBalance />, 'home_portfolio_balance_chart'],
  ...chartSurfaceCases,
];

const finishOpeningTransition = async (screen: string) => {
  if (screen === 'Home') {
    return;
  }

  await act(async () => {
    mockTransitionEndListener?.({data: {closing: false}});
    await Promise.resolve();
  });

  if (screen === 'WalletDetails') {
    await act(async () => {
      jest.advanceTimersByTime(1100);
      await Promise.resolve();
    });
  }
};

const makeExcessiveBalanceMismatchMarker = (walletId = 'wallet-1') => ({
  computedAtomic: '110000000',
  deltaAtomic: '10000000',
  detectedAt: 1000,
  liveAtomic: '100000000',
  message: 'Computed snapshot balance exceeds live wallet balance by 10%.',
  ratio: '1.1',
  reason: 'excessive_balance_mismatch',
  threshold: 0.1,
  walletId,
});

const seedWalletChartCache = () => {
  const analysisPoints = [
    {
      timestamp: 1_000,
      totalFiatBalance: 90,
      totalRemainingCostBasisFiat: 80,
      totalUnrealizedPnlFiat: 10,
      totalPnlChange: 0,
      totalPnlPercent: 12.5,
      byWalletId: {},
    },
    {
      timestamp: 2_000,
      totalFiatBalance: 100,
      totalRemainingCostBasisFiat: 80,
      totalUnrealizedPnlFiat: 20,
      totalPnlChange: 10,
      totalPnlPercent: 25,
      byWalletId: {},
    },
  ];
  const graphPoints = analysisPoints.map(point => ({
    date: new Date(point.timestamp),
    value: point.totalFiatBalance,
  }));

  cacheBalanceHistoryChartSeries({
    state: {
      walletIds: ['wallet-1'],
      balanceOffset: 0,
      timeframe: '1D',
      queryRevisionKey: 'cached-revision',
      quoteCurrency: 'USD',
      scopeId: 'normalized-on-write',
      seriesSignature: 'cached-series',
      series: {
        graphPoints,
        analysisPoints,
        pointByTimestamp: new Map(
          analysisPoints.map((point, index) => [
            graphPoints[index].date.getTime(),
            point,
          ]),
        ),
        minIndex: 0,
        maxIndex: 1,
        minPoint: graphPoints[0],
        maxPoint: graphPoints[1],
      },
    },
  });
};

describe('portfolio chart visibility guards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      clearBalanceHistoryChartSeriesCache();
    });
    jest.clearAllMocks();
    mockTransitionEndListener = undefined;
    mockIsFocused = false;
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: true,
      hasAnySnapshots: true,
      loading: false,
    });
    resetState(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not mount the Key Overview balance chart or loader when Show Portfolio is disabled', async () => {
    mockRouteParams = {context: undefined, id: 'key-1'};

    await act(async () => {
      renderWithTheme(<KeyOverview />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it('builds the Key Overview account list only after the opening transition', async () => {
    mockRouteParams = {context: undefined, id: 'key-1'};

    await act(async () => {
      renderWithTheme(<KeyOverview />);
    });

    expect(mockBuildAccountList).not.toHaveBeenCalled();

    await act(async () => {
      mockTransitionEndListener?.({data: {closing: false}});
    });

    expect(mockBuildAccountList).toHaveBeenCalledTimes(1);
  });

  it('mounts the Key Overview balance chart only after the opening transition', async () => {
    resetState(true);
    mockRouteParams = {context: undefined, id: 'key-1'};

    await act(async () => {
      renderWithTheme(<KeyOverview />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();

    await finishOpeningTransition('Key Overview');

    expect(mockBalanceHistoryChart).toHaveBeenCalled();
  });

  it.each(chartSurfaceCases)(
    'mounts a cached %s chart immediately without the opening placeholder',
    async (_screen, makeScreen) => {
      resetState(true);
      act(() => {
        seedWalletChartCache();
      });

      let view!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        view = renderWithTheme(makeScreen());
      });

      expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          preserveVisibleSeriesWhileNotReady: true,
        }),
        undefined,
      );
      expect(
        view.root.findAllByProps({
          testID: 'balance-chart-loading-placeholder',
        }),
      ).toHaveLength(0);
    },
  );

  it('removes the WalletDetails opening placeholder as soon as its cache entry arrives', async () => {
    resetState(true);
    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(makeWalletDetailsScreen());
    });

    expect(
      view.root.findAllByProps({
        testID: 'balance-chart-loading-placeholder',
      }).length,
    ).toBeGreaterThan(0);
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();

    await act(async () => {
      seedWalletChartCache();
    });

    expect(
      view.root.findAllByProps({
        testID: 'balance-chart-loading-placeholder',
      }),
    ).toHaveLength(0);
    expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
      expect.objectContaining({
        preserveVisibleSeriesWhileNotReady: true,
      }),
      undefined,
    );
  });

  it('does not mount the WalletDetails balance chart or loader when Show Portfolio is disabled', async () => {
    await act(async () => {
      renderWithTheme(
        <WalletDetails
          navigation={mockNavigation as any}
          route={
            {
              params: {
                copayerId: 'copayer-1',
                skipInitializeHistory: true,
                walletId: 'wallet-1',
              },
            } as any
          }
        />,
      );
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    expect(mockUsePortfolioWalletSnapshotPresence).toHaveBeenCalledWith({
      enabled: false,
      wallets: [],
    });
  });

  it('keeps WalletDetails testnet metadata visible without mounting portfolio chart work', async () => {
    resetState(true);
    mockWallet.network = 'testnet';
    mockState.APP.network = 'testnet';
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      loading: false,
    });

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(makeWalletDetailsScreen());
    });

    const renderedText = collectRenderedText(view.toJSON());
    expect(renderedText).toContain('1.00 BTC');
    expect(renderedText).toContain('Testnet4');
    expect(renderedText).not.toContain('$100.00');
    expect(renderedText).not.toContain('Last Day');
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    expect(mockUsePortfolioWalletSnapshotPresence).toHaveBeenLastCalledWith({
      enabled: false,
      wallets: [],
    });
  });

  it('does not mount the AccountDetails balance chart or loader when Show Portfolio is disabled', async () => {
    await act(async () => {
      renderWithTheme(
        <AccountDetails
          navigation={mockNavigation as any}
          route={
            {
              params: {
                isSvmAccount: false,
                keyId: 'key-1',
                selectedAccountAddress: 'address-1',
              },
            } as any
          }
        />,
      );
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it('keeps the account switcher enabled without eagerly formatting every account', async () => {
    const secondWallet = {
      ...makeWallet(),
      credentials: {
        ...makeWallet().credentials,
        account: 1,
        walletId: 'wallet-2',
      },
      id: 'wallet-2',
      receiveAddress: 'address-2',
    };
    mockKey.wallets = [mockWallet, secondWallet];

    await act(async () => {
      renderWithTheme(
        <AccountDetails
          navigation={mockNavigation as any}
          route={
            {
              params: {
                isSvmAccount: false,
                keyId: 'key-1',
                selectedAccountAddress: 'address-1',
              },
            } as any
          }
        />,
      );
    });

    const headerOptions = mockNavigation.setOptions.mock.calls
      .map(([options]) => options)
      .find(options => options.headerTitle);
    const headerTitle = headerOptions.headerTitle();

    expect(headerTitle.props.disabled).toBe(false);
    expect(mockBuildAccountList).not.toHaveBeenCalledWith(
      mockKey,
      'USD',
      {},
      mockDispatch,
      {filterByHideWallet: true},
    );

    await act(async () => {
      headerTitle.props.onPress();
    });

    expect(mockBuildAccountList).toHaveBeenCalledWith(
      mockKey,
      'USD',
      {},
      mockDispatch,
      {filterByHideWallet: true},
    );
  });

  it('keeps the Home portfolio balance visible without mounting the chart when Show Portfolio is disabled after initial success', async () => {
    resetState(false, {completedFullPopulate: true});

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    expect(view!.toJSON()).not.toBeNull();
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-info-button'})
        .length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-toggle'}).length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-change-row'})
        .length,
    ).toBeGreaterThan(0);
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it('keeps the HomeRoot balance section and linking buttons visible when Show Portfolio is disabled', async () => {
    resetState(false, {completedFullPopulate: true});
    mockIsFocused = true;

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(
        <HomeRoot
          navigation={mockNavigation as any}
          route={{params: {}} as any}
        />,
      );
    });

    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-info-button'})
        .length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-toggle'}).length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-change-row'})
        .length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'home-linking-buttons'}).length,
    ).toBeGreaterThan(0);
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it('mounts the Home portfolio balance chart with a loader while its initial populate scope is still running', async () => {
    resetState(true, {
      completedFullPopulate: false,
      populateStatus: makePopulateStatus(),
    });

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    expect(view!.toJSON()).not.toBeNull();
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-info-button'})
        .length,
    ).toBeGreaterThan(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-toggle'}).length,
    ).toBeGreaterThan(0);
    expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
      expect.objectContaining({
        showLoaderWhenNoSnapshots: true,
        isBalanceChartDataReadyToQuery: false,
      }),
      undefined,
    );
  });

  it('mounts the cached Home chart without a loader while its scope is not ready', async () => {
    resetState(true, {
      completedFullPopulate: false,
    });
    act(() => {
      seedWalletChartCache();
    });

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        wallets: [mockWallet],
        showLoaderWhenNoSnapshots: false,
        isBalanceChartDataReadyToQuery: false,
        preserveVisibleSeriesWhileNotReady: true,
      }),
      undefined,
    );
    expect(
      view.root.findAllByProps({
        testID: 'balance-history-chart-loader',
      }),
    ).toHaveLength(0);
    expect(
      view.root.findAllByProps({
        testID: 'balance-chart-loading-placeholder',
      }),
    ).toHaveLength(0);
  });

  it('keeps the cached Home chart active for revalidation once its scope is ready', async () => {
    resetState(true, {
      completedFullPopulate: false,
    });
    act(() => {
      seedWalletChartCache();
    });

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
        wallets: [mockWallet],
        isBalanceChartDataReadyToQuery: false,
        preserveVisibleSeriesWhileNotReady: true,
      }),
      undefined,
    );

    mockBalanceHistoryChart.mockClear();
    mockState.PORTFOLIO.lastFullPopulateCompletedAt = 1234;
    mockState.PORTFOLIO.lastPopulatedAt = 1234;
    mockState.PORTFOLIO.populateStatus = undefined;

    await act(async () => {
      view.update(withTheme(<PortfolioBalance active={false} />));
    });

    expect(mockBalanceHistoryChart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
        wallets: [mockWallet],
        isBalanceChartDataReadyToQuery: false,
        preserveVisibleSeriesWhileNotReady: true,
      }),
      undefined,
    );

    mockBalanceHistoryChart.mockClear();

    await act(async () => {
      view.update(withTheme(<PortfolioBalance active />));
    });

    expect(mockBalanceHistoryChart).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
        wallets: [mockWallet],
        isBalanceChartDataReadyToQuery: true,
        preserveVisibleSeriesWhileNotReady: true,
      }),
      undefined,
    );
  });

  it('renders the Home portfolio balance chart when a full-populate timestamp exists', async () => {
    resetState(true, {completedFullPopulate: true});

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenCalled();
  });

  it('renders the Home portfolio balance chart when visible wallets have zero balance but snapshot rows exist', async () => {
    resetState(true, {completedFullPopulate: true});
    mockWallet.balance = {
      ...mockWallet.balance,
      crypto: '0',
      fiat: 0,
      fiatLastDay: 0,
      sat: 0,
      satSpendable: 0,
    };
    mockKey.totalBalance = 0;
    mockKey.totalBalanceLastDay = 0;

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenCalled();
  });

  it('does not mount the Home portfolio balance chart when snapshot presence settles with no rows', async () => {
    resetState(true, {completedFullPopulate: true});
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      loading: false,
    });

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it.each(portfolioChartSurfaceCases)(
    'does not mount the %s balance chart when all scope wallets are quarantined',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: true,
        quarantinesByWalletId: {
          'wallet-1': makeExcessiveBalanceMismatchMarker('wallet-1'),
        },
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    },
  );

  it('keeps the persisted Home chart expand control before chart diagnostics arrive', async () => {
    resetState(true, {
      completedFullPopulate: true,
      homeChartCollapsed: true,
    });

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    const homeChartCalls = mockBalanceHistoryChart.mock.calls;
    expect(homeChartCalls.length).toBeGreaterThan(0);
    expect(homeChartCalls[homeChartCalls.length - 1][0]).toEqual(
      expect.objectContaining({
        disablePanGesture: true,
      }),
    );
    expect(
      view!.root.findAllByProps({accessibilityLabel: 'Expand portfolio chart'})
        .length,
    ).toBeGreaterThan(0);
  });

  it.each(chartSurfaceCases)(
    'mounts the %s balance chart with a loader while its initial populate scope is still running',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: false,
        populateStatus: makePopulateStatus(),
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          showLoaderWhenNoSnapshots: true,
          isBalanceChartDataReadyToQuery: false,
        }),
        undefined,
      );
    },
  );

  it.each(chartSurfaceCases)(
    'mounts the %s balance chart once its wallet scope is done during initial populate',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: false,
        populateStatus: makePopulateStatus({
          currentWalletId: 'wallet-2',
          txRequestsMade: 4,
          txsProcessed: 1000,
          walletsCompleted: 1,
          walletsTotal: 2,
          walletStatusById: {
            'wallet-1': 'done',
            'wallet-2': 'in_progress',
          },
        }),
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalled();
    },
  );

  it('renders the Home portfolio balance chart after initial populate succeeds', async () => {
    resetState(true);

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenCalled();
  });

  it.each([...chartSurfaceCases])(
    'keeps enabled chart rendering for %s',
    async (_screen, makeScreen) => {
      resetState(true);

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalled();
    },
  );

  it('renders the WalletDetails zero chart when snapshot presence settles with no rows', async () => {
    resetState(true);
    setMockWalletZeroBalance();
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      loading: false,
    });

    await act(async () => {
      renderWithTheme(makeWalletDetailsScreen());
    });
    await finishOpeningTransition('WalletDetails');

    expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
      expect.objectContaining({
        renderZeroBalanceWhenNoSnapshots: true,
        showLoaderWhenNoSnapshots: false,
      }),
      undefined,
    );
  });

  it.each(chartSurfaceCases)(
    'does not render the %s zero chart when a non-zero live-balance scope has no snapshots',
    async (_screen, makeScreen) => {
      resetState(true);
      mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
        checked: true,
        hasAllSnapshots: false,
        hasAnySnapshots: false,
        loading: false,
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    },
  );

  it.each(chartSurfaceCases)(
    'renders the %s zero chart after snapshot presence settles with no rows',
    async (_screen, makeScreen) => {
      resetState(true);
      setMockWalletZeroBalance();
      mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
        checked: true,
        hasAllSnapshots: false,
        hasAnySnapshots: false,
        loading: false,
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          renderZeroBalanceWhenNoSnapshots: true,
          showLoaderWhenNoSnapshots: false,
        }),
        undefined,
      );
    },
  );

  it('renders the WalletDetails zero chart while transaction history loading alone', async () => {
    resetState(true);
    mockIsFocused = true;
    setMockWalletZeroBalance();
    mockUsePortfolioWalletSnapshotPresence.mockReturnValue({
      checked: true,
      hasAllSnapshots: false,
      hasAnySnapshots: false,
      loading: false,
    });
    mockGetTransactionHistory.mockReturnValueOnce(new Promise(() => {}));

    await act(async () => {
      renderWithTheme(makeWalletDetailsScreen({skipInitializeHistory: false}));
      await Promise.resolve();
    });
    await finishOpeningTransition('WalletDetails');

    expect(mockGetTransactionHistory).toHaveBeenCalled();
    expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
      expect.objectContaining({
        renderZeroBalanceWhenNoSnapshots: true,
        showLoaderWhenNoSnapshots: false,
      }),
      undefined,
    );
  });

  it.each(chartSurfaceCases)(
    'mounts the %s balance chart when its wallet scope has zero balance but snapshot rows exist',
    async (_screen, makeScreen) => {
      resetState(true);
      setMockWalletZeroBalance();

      await act(async () => {
        renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalled();
    },
  );

  it('renders the WalletDetails zero balance header with fiat primary and crypto secondary balance', async () => {
    resetState(true);
    setMockWalletZeroBalance();
    mockBuildUIFormattedWallet.mockReturnValueOnce({
      chain: mockWallet.chain,
      cryptoBalance: '0.00',
      cryptoLockedBalance: '0',
      cryptoSpendableBalance: '0.00',
      currencyAbbreviation: mockWallet.currencyAbbreviation,
      fiatBalanceFormat: '$0.00',
      fiatLockedBalanceFormat: '$0.00',
      fiatSpendableBalanceFormat: '$0.00',
      network: mockWallet.network,
      pendingTxps: [],
      tokenAddress: mockWallet.tokenAddress,
      walletName: mockWallet.walletName,
    });

    let view!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(makeWalletDetailsScreen());
    });

    const renderedText = collectRenderedText(view.toJSON());
    expect(renderedText).toContain('$0.00');
    expect(renderedText).toContain('0.00 BTC');
  });

  it.each(portfolioChartSurfaceCases)(
    'keeps the %s chart mounted with stale preservation during later incremental populate after initial success',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: true,
        populateStatus: makePopulateStatus(),
      });

      let view!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        view = renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          showLoaderWhenNoSnapshots: false,
          isBalanceChartDataReadyToQuery: false,
          preserveVisibleSeriesWhileNotReady: true,
        }),
        undefined,
      );
      if (_screen === 'Home') {
        expect(
          view.root.findAllByProps({
            accessibilityLabel: 'Collapse portfolio chart',
          }).length,
        ).toBeGreaterThan(0);
      }
    },
  );

  it.each(memoizedHeaderChartSurfaceCases)(
    'updates the memoized %s chart props when an already-mounted chart enters incremental populate',
    async (_screen, makeScreen) => {
      resetState(true, {completedFullPopulate: true});

      let view!: TestRenderer.ReactTestRenderer;
      await act(async () => {
        view = renderWithTheme(makeScreen());
      });
      await finishOpeningTransition(_screen);

      expect(mockBalanceHistoryChart).toHaveBeenLastCalledWith(
        expect.objectContaining({
          showLoaderWhenNoSnapshots: false,
          isBalanceChartDataReadyToQuery: true,
          preserveVisibleSeriesWhileNotReady: false,
        }),
        undefined,
      );

      mockBalanceHistoryChart.mockClear();
      mockState.PORTFOLIO.populateStatus = makePopulateStatus();

      await act(async () => {
        view.update(withTheme(makeScreen()));
      });

      expect(mockBalanceHistoryChart).toHaveBeenCalledWith(
        expect.objectContaining({
          showLoaderWhenNoSnapshots: false,
          isBalanceChartDataReadyToQuery: false,
          preserveVisibleSeriesWhileNotReady: true,
        }),
        undefined,
      );
    },
  );

  it('treats an unresolved Show Portfolio value as hidden for chart rendering', async () => {
    resetState(undefined);
    mockRouteParams = {context: undefined, id: 'key-1'};

    await act(async () => {
      renderWithTheme(<KeyOverview />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });
});
