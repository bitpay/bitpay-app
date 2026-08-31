const mockStartWalletStoreInit = jest.fn();
const mockGetLocationData = jest.fn();

jest.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({remove: jest.fn()})),
    emit: jest.fn(),
  },
  Linking: {
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    openURL: jest.fn(),
  },
  NativeModules: {},
  Platform: {OS: 'ios', select: jest.fn(options => options?.ios)},
  Share: {share: jest.fn()},
}));

jest.mock('@braze/react-native-sdk', () => ({
  addListener: jest.fn(),
  Events: {CONTENT_CARDS_UPDATED: 'CONTENT_CARDS_UPDATED'},
  requestContentCardsRefresh: jest.fn(),
}));

jest.mock('react-native-bootsplash', () => ({hide: jest.fn()}));
jest.mock('react-native-in-app-review', () => ({}));
jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(),
    open: jest.fn(),
  },
}));
jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  checkNotifications: jest.fn(),
  PERMISSIONS: {},
  request: jest.fn(),
  requestNotifications: jest.fn(),
  RESULTS: {},
}));
jest.mock('react-native-quick-actions', () => ({
  clearShortcutItems: jest.fn(),
  popInitialAction: jest.fn(() => Promise.resolve(null)),
  setShortcutItems: jest.fn(),
}));
jest.mock('react-native-uuid', () => ({v4: jest.fn(() => 'uuid')}));
jest.mock('react-native-ssl-public-key-pinning', () => ({
  initializeSslPinning: jest.fn(() => Promise.resolve()),
  isSslPinningAvailable: jest.fn(() => false),
}));
jest.mock('@reown/walletkit', () => ({WalletKitTypes: {}}));
jest.mock('i18next', () => ({
  default: {t: jest.fn((value: string) => value)},
  t: jest.fn((value: string) => value),
}));

jest.mock('bitauth', () => ({generateSin: jest.fn(() => ({priv: 'priv'}))}));
jest.mock('axios', () => ({}));
jest.mock('../../api/bitpay', () => ({init: jest.fn()}));
jest.mock('../../api/graphql', () => ({init: jest.fn()}));
jest.mock('../../api/user', () => ({}));
jest.mock('../../api/auth', () => ({}));

jest.mock('../../constants', () => ({
  Network: {mainnet: 'livenet', testnet: 'testnet'},
}));
jest.mock('../../constants/config', () => ({
  APP_DEEPLINK_PREFIX: 'bitpay://',
  APP_NAME: 'BitPay',
  APP_VERSION: 'test',
  BASE_BITPAY_URLS: {},
  DOWNLOAD_BITPAY_URL: 'https://example.test',
}));
jest.mock('../../constants/device-emitter-events', () => ({
  DeviceEmitterEvents: {
    APP_DATA_INITIALIZED: 'APP_DATA_INITIALIZED',
    APP_INIT_COMPLETED: 'APP_INIT_COMPLETED',
    APP_NAVIGATION_READY: 'APP_NAVIGATION_READY',
    APP_ONBOARDING_COMPLETED: 'APP_ONBOARDING_COMPLETED',
    APP_READY_FOR_DEEPLINKS: 'APP_READY_FOR_DEEPLINKS',
  },
}));
jest.mock('../../constants/shortcuts', () => ({ShortcutList: []}));
jest.mock('../../constants/currencies', () => ({
  getBaseEVMAccountCreationCoinsAndTokens: jest.fn(() => []),
  getBaseSVMAccountCreationCoinsAndTokens: jest.fn(() => []),
}));

jest.mock('@react-navigation/native', () => ({
  getStateFromPath: jest.fn(),
}));
jest.mock('../../navigation/card/CardStack', () => ({CardScreens: {}}));
jest.mock('../../navigation/card-activation/CardActivationGroup', () => ({
  CardActivationScreens: {},
}));
jest.mock('../../navigation/tabs/TabsStack', () => ({TabsScreens: {}}));
jest.mock('../../navigation/wallet/WalletGroup', () => ({WalletScreens: {}}));
jest.mock('../../navigation/tabs/shop/merchant/MerchantGroup', () => ({
  MerchantScreens: {},
}));
jest.mock('../../navigation/tabs/shop/ShopHome', () => ({ShopTabs: {}}));
jest.mock('../../navigation/tabs/shop/ShopStack', () => ({ShopScreens: {}}));
jest.mock('../../navigation/tabs/settings/SettingsGroup', () => ({
  SettingsScreens: {},
}));
jest.mock(
  '../../navigation/tabs/settings/notifications/NotificationsGroup',
  () => ({
    NotificationsSettingsScreens: {},
  }),
);
jest.mock(
  '../../components/modal/in-app-notification/InAppNotification',
  () => ({InAppNotificationMessages: {}}),
);
jest.mock('../../components/styled/Containers', () => ({isNotMobile: false}));

jest.mock('../../Root', () => ({
  navigationRef: {isReady: jest.fn(() => true)},
  RootStacks: {},
}));
jest.mock('../../navigation/NavigationService', () => ({
  navigationRef: {isReady: jest.fn(() => true), navigate: jest.fn()},
}));

jest.mock('../../utils/axios', () => ({isAxiosError: jest.fn(() => false)}));
jest.mock('../../utils/helper-methods', () => ({
  sleep: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../utils/hooks', () => ({}));

jest.mock('../wallet/effects', () => ({
  startAddEDDSAKey: jest.fn(() => ({type: 'START_ADD_EDDSA_KEY'})),
  startGetRates: jest.fn(() => ({type: 'START_GET_RATES'})),
  startMigration: jest.fn(() => ({type: 'START_MIGRATION'})),
}));
jest.mock('../wallet/effects/init/init', () => ({
  startWalletStoreInit: (...args: any[]) => mockStartWalletStoreInit(...args),
}));
jest.mock('../wallet/effects/status/status', () => ({
  FormatKeyBalances: jest.fn(() => ({type: 'FORMAT_KEY_BALANCES'})),
  startUpdateAllKeyAndWalletStatus: jest.fn(() => ({
    type: 'START_UPDATE_ALL_KEY_AND_WALLET_STATUS',
  })),
  startUpdateWalletStatus: jest.fn(() => ({
    type: 'START_UPDATE_WALLET_STATUS',
  })),
}));
jest.mock('../wallet/effects/address/address', () => ({
  createWalletAddress: jest.fn(() => ({type: 'CREATE_WALLET_ADDRESS'})),
}));
jest.mock('../wallet/effects/currencies/currencies', () => ({
  startCustomTokensMigration: jest.fn(() => ({
    type: 'START_CUSTOM_TOKENS_MIGRATION',
  })),
  startPolMigration: jest.fn(() => ({type: 'START_POL_MIGRATION'})),
}));
jest.mock('../wallet/utils/wallet', () => ({
  findKeyByKeyId: jest.fn(),
  findWalletByIdHashed: jest.fn(),
  getAllWalletClients: jest.fn(() => []),
}));
jest.mock('../wallet/wallet.actions', () => ({
  setCustomTokensMigrationComplete: jest.fn(() => ({
    type: 'SET_CUSTOM_TOKENS_MIGRATION_COMPLETE',
  })),
  setPolygonMigrationComplete: jest.fn(() => ({
    type: 'SET_POLYGON_MIGRATION_COMPLETE',
  })),
  setWalletScanning: jest.fn(() => ({type: 'SET_WALLET_SCANNING'})),
  updatePortfolioBalance: jest.fn(() => ({type: 'UPDATE_PORTFOLIO_BALANCE'})),
}));
jest.mock('../wallet', () => ({WalletActions: {}}));

jest.mock('../analytics/analytics.effects', () => ({
  Analytics: {
    initialize: jest.fn(() => ({type: 'ANALYTICS_INITIALIZE'})),
    identify: jest.fn(() => ({type: 'ANALYTICS_IDENTIFY'})),
    isMergingUser: jest.fn(() => false),
    track: jest.fn(() => ({type: 'ANALYTICS_TRACK'})),
  },
}));
jest.mock('../bitpay-id', () => ({BitPayIdEffects: {}}));
jest.mock('../card', () => ({CardActions: {}, CardEffects: {}}));
jest.mock('../sumsub', () => ({
  SumSubEffects: {startGetKycStatus: jest.fn(() => ({type: 'GET_KYC_STATUS'}))},
}));
jest.mock('../coinbase', () => ({
  coinbaseInitialize: jest.fn(() => ({type: 'COINBASE_INITIALIZE'})),
}));
jest.mock('../zenledger', () => ({
  zenledgerInitialize: jest.fn(() => ({type: 'ZENLEDGER_INITIALIZE'})),
}));
jest.mock('../location', () => ({
  LocationEffects: {
    getLocationData: (...args: any[]) => mockGetLocationData(...args),
  },
}));
jest.mock('../wallet-connect-v2/wallet-connect-v2.effects', () => ({
  walletConnectV2Init: jest.fn(() => ({type: 'WALLET_CONNECT_INIT'})),
}));
jest.mock('../external-services/external-services.effects', () => ({
  prefetchExternalServicesData: jest.fn(() => ({
    type: 'PREFETCH_EXTERNAL_SERVICES',
  })),
}));
jest.mock('../buy-crypto/buy-crypto.effects', () => ({
  goToBuyCrypto: jest.fn(),
}));
jest.mock('../sell-crypto/sell-crypto.effects', () => ({
  goToSellCrypto: jest.fn(),
}));
jest.mock('../swap-crypto/swap-crypto.effects', () => ({
  goToSwapCrypto: jest.fn(),
}));
jest.mock('../wallet/effects/send/send', () => ({
  receiveCrypto: jest.fn(),
  sendCrypto: jest.fn(),
}));

jest.mock('../contact/contact.actions', () => ({
  setContactBridgeUsdcMigrationComplete: jest.fn(() => ({
    type: 'SET_CONTACT_BRIDGE_USDC_MIGRATION_COMPLETE',
  })),
  setContactMigrationComplete: jest.fn(() => ({
    type: 'SET_CONTACT_MIGRATION_COMPLETE',
  })),
  setContactMigrationCompleteV2: jest.fn(() => ({
    type: 'SET_CONTACT_MIGRATION_COMPLETE_V2',
  })),
  setContactTokenAddressMigrationComplete: jest.fn(() => ({
    type: 'SET_CONTACT_TOKEN_ADDRESS_MIGRATION_COMPLETE',
  })),
}));
jest.mock('../contact/contact.effects', () => ({
  startContactBridgeUsdcMigration: jest.fn(() => ({
    type: 'START_CONTACT_BRIDGE_USDC_MIGRATION',
  })),
  startContactMigration: jest.fn(() => ({type: 'START_CONTACT_MIGRATION'})),
  startContactPolMigration: jest.fn(() => ({
    type: 'START_CONTACT_POL_MIGRATION',
  })),
  startContactTokenAddressMigration: jest.fn(() => ({
    type: 'START_CONTACT_TOKEN_ADDRESS_MIGRATION',
  })),
  startContactV2Migration: jest.fn(() => ({
    type: 'START_CONTACT_V2_MIGRATION',
  })),
}));
jest.mock('../shop-catalog', () => ({
  getAvailableGiftCards: jest.fn(),
  getCategoriesWithIntegrations: jest.fn(),
}));
jest.mock('../shop-catalog/shop-catalog.actions', () => ({
  setShopMigrationComplete: jest.fn(() => ({type: 'SET_SHOP_MIGRATION'})),
  successFetchCatalog: jest.fn(payload => ({
    payload,
    type: 'SUCCESS_FETCH_CATALOG',
  })),
}));
jest.mock('../shop/shop.actions', () => ({
  clearedShopCatalogFields: jest.fn(() => ({type: 'CLEARED_SHOP_CATALOG'})),
}));
jest.mock('./showPortfolio.effects', () => ({
  setShowPortfolioValueWithRuntimeReset: jest.fn(),
}));

jest.mock('./app.actions', () => ({
  appInitCompleted: jest.fn(() => ({type: 'APP_INIT_COMPLETED'})),
  appIsReadyForDeeplinking: jest.fn(() => ({type: 'APP_READY'})),
  failedAppInit: jest.fn(() => ({type: 'FAILED_APP_INIT'})),
  failedGenerateAppIdentity: jest.fn(() => ({type: 'FAILED_IDENTITY'})),
  setAnnouncementsAccepted: jest.fn(() => ({type: 'SET_ANNOUNCEMENTS'})),
  setAppFirstOpenEventComplete: jest.fn(() => ({type: 'SET_FIRST_OPEN_DONE'})),
  setAppFirstOpenEventDate: jest.fn(date => ({
    date,
    type: 'SET_FIRST_OPEN_DATE',
  })),
  setAppInstalled: jest.fn(() => ({type: 'SET_APP_INSTALLED'})),
  setBrazeEid: jest.fn(eid => ({eid, type: 'SET_BRAZE_EID'})),
  setConfirmedTxAccepted: jest.fn(() => ({type: 'SET_CONFIRMED_TX'})),
  setEDDSAKeyMigrationComplete: jest.fn(() => ({type: 'SET_EDDSA_DONE'})),
  setEmailNotificationsAccepted: jest.fn(() => ({type: 'SET_EMAIL_NOTIFS'})),
  setInAppBrowserOpen: jest.fn(payload => ({
    payload,
    type: 'SET_IN_APP_BROWSER_OPEN',
  })),
  setMigrationComplete: jest.fn(() => ({type: 'SET_MIGRATION_DONE'})),
  setNotificationsAccepted: jest.fn(() => ({type: 'SET_NOTIFS'})),
  setUserFeedback: jest.fn(() => ({type: 'SET_USER_FEEDBACK'})),
  showBlur: jest.fn(value => ({payload: value, type: 'SHOW_BLUR'})),
  successAppInit: jest.fn(() => ({type: 'SUCCESS_APP_INIT'})),
  successGenerateAppIdentity: jest.fn((network, identity) => ({
    identity,
    network,
    type: 'SUCCESS_IDENTITY',
  })),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  openExternalUrl,
  openUrlWithInAppBrowser,
  startAppInit,
} from './app.effects';
import {logManager} from '../../managers/LogManager';
import {Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, reject, resolve};
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const makeState = () =>
  ({
    APP: {
      appFirstOpenData: {
        firstOpenDate: 1,
        firstOpenEventComplete: true,
      },
      appInstalled: true,
      appIsLoading: true,
      brazeEid: 'eid',
      colorScheme: 'light',
      defaultAltCurrency: {isoCode: 'USD'},
      EDDSAKeyMigrationCompleteV2: true,
      identity: {livenet: {priv: 'priv'}},
      migrationComplete: true,
      network: 'livenet',
      onboardingCompleted: true,
    },
    BITPAY_ID: {apiToken: {livenet: undefined}},
    CONTACT: {
      contactBridgeUsdcMigrationComplete: true,
      contactMigrationComplete: true,
      contactMigrationCompleteV2: true,
      contactTokenAddressMigrationComplete: true,
    },
    SHOP: {},
    SHOP_CATALOG: {shopMigrationComplete: true},
    WALLET: {
      customTokensMigrationComplete: true,
      keys: {},
      polygonMigrationComplete: true,
    },
  } as any);

describe('startAppInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not wait for wallet store init before completing app init', async () => {
    const walletInit = deferred<{walletInitSuccess: boolean}>();
    const locationData = deferred<void>();
    mockStartWalletStoreInit.mockReturnValue(walletInit.promise);
    mockGetLocationData.mockReturnValue(locationData.promise);

    const actions: any[] = [];
    const dispatch = jest.fn(action => {
      actions.push(action);
      return action;
    });
    const getState = jest.fn(makeState);

    const initPromise = startAppInit()(dispatch, getState, undefined as any);
    await flushMicrotasks();

    expect(mockStartWalletStoreInit).toHaveBeenCalledTimes(1);
    expect(actions).toContainEqual({type: 'SUCCESS_APP_INIT'});
    expect(actions).toContainEqual({type: 'APP_INIT_COMPLETED'});

    walletInit.resolve({walletInitSuccess: true});
    locationData.resolve();
    await initPromise;
  });
});

const resetUrlMocks = () => {
  jest.clearAllMocks();
  (Linking.openURL as jest.Mock).mockReset();
  (InAppBrowser.isAvailable as jest.Mock).mockReset();
  (InAppBrowser.open as jest.Mock).mockReset();
};

describe('openUrlWithInAppBrowser', () => {
  beforeEach(resetUrlMocks);

  it('resolves true after the in app browser session ends', async () => {
    const browserSession = deferred<{type: string}>();
    const onOpen = jest.fn();
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockReturnValue(browserSession.promise);

    const didOpenPromise = openUrlWithInAppBrowser('https://bitpay.com')(
      jest.fn(),
      jest.fn(),
      undefined as any,
    );
    didOpenPromise.then(onOpen);
    await flushMicrotasks();

    expect(onOpen).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();

    browserSession.resolve({type: 'dismiss'});

    await expect(didOpenPromise).resolves.toBe(true);
  });

  it('returns true when the in app browser fails but the external handler opens the url', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockRejectedValue(
      new Error('No activity'),
    );
    (Linking.openURL as jest.Mock).mockResolvedValue(true);

    const didOpen = await openUrlWithInAppBrowser('https://bitpay.com')(
      jest.fn(),
      jest.fn(),
      undefined as any,
    );

    expect(didOpen).toBe(true);
    expect(InAppBrowser.open).toHaveBeenCalledWith(
      'https://bitpay.com',
      expect.any(Object),
    );
    expect(Linking.openURL).toHaveBeenCalledWith('https://bitpay.com');
  });

  it('returns false when the in app browser and external handler fail without exposing the url', async () => {
    const url =
      'https://CLAIM-CODE.merchant.example/redeem/SIGNED-TOKEN?signature=SECRET';
    const openError = new Error(`Unable to open URL: ${url}`);
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
    (InAppBrowser.open as jest.Mock).mockRejectedValue(openError);
    (Linking.openURL as jest.Mock).mockRejectedValue(openError);

    const didOpen = await openUrlWithInAppBrowser(url)(
      jest.fn(),
      jest.fn(),
      undefined as any,
    );

    const logs = [
      ...(logManager.info as jest.Mock).mock.calls,
      ...(logManager.error as jest.Mock).mock.calls,
    ]
      .flat()
      .join(' ')
      .toLowerCase();
    expect(didOpen).toBe(false);
    expect(InAppBrowser.open).toHaveBeenCalledWith(url, expect.any(Object));
    expect(logs).toContain('https');
    expect(logs).not.toContain('claim-code');
    expect(logs).not.toContain('signed-token');
    expect(logs).not.toContain('secret');
  });

  it('returns false when only the external handler is available and it fails', async () => {
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);
    (Linking.openURL as jest.Mock).mockRejectedValue(
      new Error('Unable to open URL: https://bitpay.com'),
    );

    const didOpen = await openUrlWithInAppBrowser('https://bitpay.com')(
      jest.fn(),
      jest.fn(),
      undefined as any,
    );

    expect(didOpen).toBe(false);
    expect(InAppBrowser.open).not.toHaveBeenCalled();
  });
});

describe('openExternalUrl', () => {
  beforeEach(resetUrlMocks);

  it('does not fall back when the device opens the url', async () => {
    (Linking.openURL as jest.Mock).mockResolvedValue(true);
    const dispatch = jest.fn();

    const didOpen = await openExternalUrl('https://bitpay.com')(
      dispatch,
      jest.fn(),
      undefined as any,
    );

    expect(didOpen).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('https://bitpay.com');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('falls back to the in app browser when the device rejects', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValue(
      new Error('Unable to open URL: https://bitpay.com'),
    );
    const dispatch = jest.fn();

    const didOpen = await openExternalUrl('https://bitpay.com')(
      dispatch,
      jest.fn(),
      undefined as any,
    );

    expect(didOpen).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns false without falling back and redacts sensitive url data', async () => {
    const url =
      'https://CLAIM-CODE.merchant.example/redeem/SIGNED-TOKEN?signature=SECRET';
    (Linking.openURL as jest.Mock).mockRejectedValue(
      new Error(`Unable to open URL: ${url}`),
    );
    const dispatch = jest.fn();

    const didOpen = await openExternalUrl(url, false)(
      dispatch,
      jest.fn(),
      undefined as any,
    );

    expect(didOpen).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(logManager.error).toHaveBeenCalledWith('Error opening https URL.');

    const logs = [
      ...(logManager.info as jest.Mock).mock.calls,
      ...(logManager.error as jest.Mock).mock.calls,
    ]
      .flat()
      .join(' ')
      .toLowerCase();
    expect(logs).toContain('https');
    expect(logs).not.toContain('claim-code');
    expect(logs).not.toContain('signed-token');
    expect(logs).not.toContain('secret');
  });
});
