import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {ThemeProvider} from 'styled-components/native';
import KeyOverview from './KeyOverview';
import WalletDetails from './WalletDetails';
import AccountDetails from './AccountDetails';
import PortfolioBalance from '../../tabs/home/components/PortfolioBalance';
import usePortfolioWalletSnapshotPresence from '../../../portfolio/ui/hooks/usePortfolioWalletSnapshotPresence';

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
const mockDispatch: jest.Mock = jest.fn((action: any): any =>
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action,
);
const mockNavigation = {
  dispatch: jest.fn(),
  navigate: jest.fn(),
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
  useIsFocused: () => false,
  useNavigation: () => mockNavigation,
  useRoute: () => ({
    params: mockRouteParams,
  }),
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

jest.mock('../../../portfolio/ui/common', () => ({
  resolveActivePortfolioDisplayQuoteCurrency: jest.fn(
    ({defaultAltCurrencyIsoCode}: {defaultAltCurrencyIsoCode?: string}) =>
      defaultAltCurrencyIsoCode || 'USD',
  ),
}));

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
jest.mock('../../tabs/home/components/LinkingButtons', () => () => null);
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
  AllocationDonutLegendCard: () => null,
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
  findWalletById: jest.fn(() => mockWallet),
  getRemainingWalletCount: jest.fn(() => 0),
  isSegwit: jest.fn(() => false),
  isTaproot: jest.fn(() => false),
  mapAbbreviationAndName: jest.fn(() => ({
    currencyAbbreviation: 'btc',
    currencyName: 'Bitcoin',
  })),
}));

jest.mock('../../../utils/portfolio/assets', () => ({
  getQuoteCurrency: jest.fn(
    ({
      defaultAltCurrencyIsoCode,
      portfolioQuoteCurrency,
    }: {
      defaultAltCurrencyIsoCode?: string;
      portfolioQuoteCurrency?: string;
    }) => portfolioQuoteCurrency || defaultAltCurrencyIsoCode || 'USD',
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
  isPopulateLoadingForWallets: jest.fn(() => false),
  walletHasNonZeroLiveBalance: jest.fn(() => true),
  walletsHaveNonZeroLiveBalance: jest.fn(() => true),
}));

jest.mock('../../../utils/portfolio/allocation', () => ({
  buildAllocationDataFromWalletRows: jest.fn(() => ({
    legendItems: [],
    rows: [],
    slices: [],
    totalFiat: 0,
  })),
}));

jest.mock('../../../store/wallet/effects', () => ({
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
const mockWalletsHaveNonZeroLiveBalance = jest.requireMock(
  '../../../utils/portfolio/assets',
).walletsHaveNonZeroLiveBalance as jest.Mock;
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

const resetState = (
  showPortfolioValue: boolean | undefined,
  options: {
    completedFullPopulate?: boolean;
    excessiveBalanceMismatchesByWalletId?: Record<string, any>;
    homeChartCollapsed?: boolean;
    invalidDecimalsByWalletId?: Record<string, any>;
    populateStatus?: any;
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
      defaultAltCurrency: {isoCode: 'USD', name: 'US Dollar'},
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
      excessiveBalanceMismatchesByWalletId:
        options.excessiveBalanceMismatchesByWalletId || {},
      invalidDecimalsByWalletId: options.invalidDecimalsByWalletId || {},
      lastFullPopulateCompletedAt,
      lastPopulatedAt,
      populateStatus: options.populateStatus,
      quoteCurrency: 'USD',
    },
    RATE: {
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

const renderWithTheme = (element: React.ReactElement) =>
  TestRenderer.create(
    <ThemeProvider theme={testTheme as any}>{element}</ThemeProvider>,
  );

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

const chartSurfaceCases: Array<[string, () => React.ReactElement, string]> = [
  [
    'Key Overview',
    () => {
      mockRouteParams = {context: undefined, id: 'key-1'};
      return <KeyOverview />;
    },
    'key_overview_balance_chart',
  ],
  [
    'WalletDetails',
    () => (
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
      />
    ),
    'wallet_details_balance_chart',
  ],
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

describe('portfolio chart visibility guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletsHaveNonZeroLiveBalance.mockReturnValue(true);
    resetState(false);
  });

  it('does not mount the Key Overview balance chart or loader when Show Portfolio is disabled', async () => {
    mockRouteParams = {context: undefined, id: 'key-1'};

    await act(async () => {
      renderWithTheme(<KeyOverview />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
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

  it('does not mount the Home portfolio balance chart or loader when Show Portfolio is disabled after initial success', async () => {
    resetState(false, {completedFullPopulate: true});

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = renderWithTheme(<PortfolioBalance />);
    });

    expect(view!.toJSON()).toBeNull();
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-info-button'}),
    ).toHaveLength(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-toggle'}),
    ).toHaveLength(0);
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-change-row'}),
    ).toHaveLength(0);
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it('does not mount the Home portfolio balance chart or loader before initial populate completes', async () => {
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
    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    expect(
      view!.root.findAllByProps({testID: 'portfolio-balance-change-row'})
        .length,
    ).toBeGreaterThan(0);
  });

  it('renders the Home portfolio balance chart when a full-populate timestamp exists', async () => {
    resetState(true, {completedFullPopulate: true});

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).toHaveBeenCalled();
  });

  it('does not mount the Home portfolio balance chart when all visible wallets have zero balance', async () => {
    resetState(true, {completedFullPopulate: true});
    mockWalletsHaveNonZeroLiveBalance.mockReturnValue(false);

    await act(async () => {
      renderWithTheme(<PortfolioBalance />);
    });

    expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
  });

  it.each([
    ['Home', () => <PortfolioBalance />, 'home_portfolio_balance_chart'],
    ...chartSurfaceCases,
  ])(
    'does not mount the %s balance chart when all scope wallets are excessive-mismatch quarantined',
    async (_screen, makeScreen) => {
      mockWalletsHaveNonZeroLiveBalance.mockImplementation(
        (wallets: any[]) => Array.isArray(wallets) && wallets.length > 0,
      );
      resetState(true, {
        completedFullPopulate: true,
        excessiveBalanceMismatchesByWalletId: {
          'wallet-1': makeExcessiveBalanceMismatchMarker('wallet-1'),
        },
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });

      expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    },
  );

  it('honors the persisted Home chart collapsed state before chart diagnostics arrive', async () => {
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
      view!.root.findAllByProps({accessibilityLabel: 'Expand portfolio chart'}),
    ).toHaveLength(0);
  });

  it.each(chartSurfaceCases)(
    'does not mount the %s balance chart or loader during initial populate',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: false,
        populateStatus: makePopulateStatus(),
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });

      expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
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

      expect(mockBalanceHistoryChart).toHaveBeenCalled();
    },
  );

  it.each(chartSurfaceCases)(
    'does not mount the %s balance chart when its wallet scope has zero balance',
    async (_screen, makeScreen) => {
      resetState(true);
      mockWalletsHaveNonZeroLiveBalance.mockReturnValue(false);

      await act(async () => {
        renderWithTheme(makeScreen());
      });

      expect(mockBalanceHistoryChart).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['Home', () => <PortfolioBalance />, 'home_portfolio_balance_chart'],
    ...chartSurfaceCases,
  ])(
    'keeps %s chart rendering during later incremental populate after initial success',
    async (_screen, makeScreen) => {
      resetState(true, {
        completedFullPopulate: true,
        populateStatus: makePopulateStatus(),
      });

      await act(async () => {
        renderWithTheme(makeScreen());
      });

      expect(mockBalanceHistoryChart).toHaveBeenCalled();
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
