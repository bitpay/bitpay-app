import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';
jest.mock('react-native-device-info', () => mockRNDeviceInfo);

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-clipboard/clipboard', () =>
  require('@react-native-clipboard/clipboard/jest/clipboard-mock'),
);

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = {
    OS: 'android',
    Version: 24,
    isPad: false,
    isTV: false,
    isTesting: true,
    select: spec => spec['android'] ?? null,
  };
  return {...Platform, default: Platform};
});

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
global.__reanimatedWorkletInit = jest.fn();
jest.mock(
  'react-native/Libraries/Animated/NativeAnimatedHelper',
  () => ({}),
  {virtual: true},
);

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock'),
);

jest.mock('react-native-fs', () => {
  return {
    mkdir: jest.fn(),
    moveFile: jest.fn(),
    copyFile: jest.fn(),
    pathForBundle: jest.fn(),
    pathForGroup: jest.fn(),
    getFSInfo: jest.fn(),
    getAllExternalFilesDirs: jest.fn(),
    unlink: jest.fn(),
    exists: jest.fn(),
    stopDownload: jest.fn(),
    resumeDownload: jest.fn(),
    isResumable: jest.fn(),
    stopUpload: jest.fn(),
    completeHandlerIOS: jest.fn(),
    readDir: jest.fn(),
    readDirAssets: jest.fn(),
    existsAssets: jest.fn(),
    readdir: jest.fn(),
    setReadable: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    read: jest.fn(),
    readFileAssets: jest.fn(),
    hash: jest.fn(),
    copyFileAssets: jest.fn(),
    copyFileAssetsIOS: jest.fn(),
    copyAssetsVideoIOS: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    write: jest.fn(),
    downloadFile: jest.fn(),
    uploadFiles: jest.fn(),
    touch: jest.fn(),
    MainBundlePath: jest.fn(),
    CachesDirectoryPath: jest.fn(),
    DocumentDirectoryPath: jest.fn(),
    ExternalDirectoryPath: jest.fn(),
    ExternalStorageDirectoryPath: jest.fn(),
    TemporaryDirectoryPath: jest.fn(),
    LibraryDirectoryPath: jest.fn(),
    PicturesDirectoryPath: jest.fn(),
  };
});

jest.mock('react-native-text-input-mask', () => 'TextInputMask');

jest.mock('rn-swipe-button', () => ({
  default: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    createNavigationContainerRef: jest.fn(() => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      addListener: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
    })),
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      addListener: jest.fn(),
    }),
    useTheme: () => ({
      dark: false,
      colors: {
        primary: '#4f6ef7',
        background: '#ffffff',
        card: '#ffffff',
        text: '#000000',
        border: '#e5e5e5',
        notification: '#ff3b30',
      },
    }),
  };
});

jest.mock('mixpanel-react-native', () => ({
  __esModule: true,
  default: () => jest.fn(),
  MixpanelProperties: {},
  Mixpanel: jest.fn(() => ({
    init: jest.fn(),
  })),
}));

jest.mock('react-native-appsflyer', () => ({
  __esModule: true,
  default: {
    initSdk: jest.fn(() => Promise.resolve()),
    logEvent: jest.fn(),
    getAppsFlyerUID: jest.fn(callback => callback(null, 'mock-appsflyer-id')),
    onDeepLink: jest.fn(() => jest.fn()),
    setResolveDeepLinkURLs: jest.fn((_hosts, onSuccess) => onSuccess?.()),
  },
}));

jest.mock('@walletconnect/core', () => ({
  __esModule: true,
  default: () => jest.fn(),
  Core: jest.fn(),
}), {virtual: true});

jest.mock('@reown/walletkit', () => ({
  __esModule: true,
  default: () => jest.fn(),
  WalletKit: jest.fn(() => ({
    init: jest.fn(),
  })),
}), {virtual: true});

jest.mock('react-native-share', () => ({
  default: jest.fn(),
}));

jest.mock('react-native-localize', () => ({
  getLocales: () => [
    {countryCode: 'GB', languageTag: 'en-GB', languageCode: 'en', isRTL: false},
    {countryCode: 'US', languageTag: 'en-US', languageCode: 'en', isRTL: false},
    {countryCode: 'FR', languageTag: 'fr-FR', languageCode: 'fr', isRTL: false},
  ],

  getNumberFormatSettings: () => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  }),

  getCalendar: () => 'gregorian', // or "japanese", "buddhist"
  getCountry: () => 'US', // the country code you want
  getCurrencies: () => ['USD', 'EUR'], // can be empty array
  getTemperatureUnit: () => 'celsius', // or "fahrenheit"
  getTimeZone: () => 'Europe/Paris', // the timezone you want
  uses24HourClock: () => true,
  usesMetricSystem: () => true,

  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('axios');

jest.mock('i18next', () => ({
  t: key => key,
}));

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  default: {
    open: jest.fn(() => Promise.resolve('mocked transport instance')),
  },
}));

// SafeAreaView is deprecated in RN 0.82 and fails to load its native deps in tests.
// This mock intercepts the require inside react-native/index.js's SafeAreaView getter.
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  function SafeAreaView({children, style, testID}) {
    return React.createElement('View', {style, testID}, children);
  }
  SafeAreaView.displayName = 'SafeAreaView';
  return {default: SafeAreaView};
});

// Braze — ESM-only dist; mock to avoid parse errors
jest.mock('@braze/react-native-sdk', () => ({
  __esModule: true,
  default: {
    logCustomEvent: jest.fn(),
    setCustomUserAttribute: jest.fn(),
    changeUser: jest.fn(),
    requestPushPermission: jest.fn(),
    logPurchase: jest.fn(),
    setEmail: jest.fn(),
    setFirstName: jest.fn(),
  },
  Braze: {},
}));

// @shopify/react-native-skia — ESM; mock Canvas/Path/Skia primitives
jest.mock('@shopify/react-native-skia', () => ({
  __esModule: true,
  Canvas: 'Canvas',
  Path: 'Path',
  Skia: {Path: jest.fn(() => ({moveTo: jest.fn(), lineTo: jest.fn(), close: jest.fn()}))},
  useValue: jest.fn(() => ({current: 0})),
  useComputedValue: jest.fn(() => ({current: 0})),
  runTiming: jest.fn(),
  useTouchHandler: jest.fn(() => ({})),
  useSharedValueEffect: jest.fn(),
  Group: 'Group',
  Fill: 'Fill',
}));

// react-native-in-app-review — native module
jest.mock('react-native-in-app-review', () => ({
  __esModule: true,
  default: {RequestInAppReview: jest.fn(), isAvailable: jest.fn(() => false)},
}));

// react-native-webview — uses TurboModuleRegistry; mock to avoid native errors
jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: 'WebView',
  WebView: 'WebView',
}));

// @preeternal/react-native-cookie-manager — ESM module; mock to avoid parse errors
jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    clearAll: jest.fn(() => Promise.resolve()),
    clearByName: jest.fn(() => Promise.resolve()),
    getAll: jest.fn(() => Promise.resolve({})),
    set: jest.fn(() => Promise.resolve()),
  },
}));

// react-native-bootsplash — uses TurboModuleRegistry; mock to avoid native errors
jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: {
    hide: jest.fn(() => Promise.resolve()),
    show: jest.fn(() => Promise.resolve()),
    isVisible: jest.fn(() => Promise.resolve(false)),
    getContainerStyle: jest.fn(() => ({})),
    useHideAnimation: jest.fn(() => ({})),
  },
}));

// react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}) => children,
  SafeAreaProvider: ({children}) => children,
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaInsetsContext: {Consumer: ({children}) => children({top: 0, bottom: 0, left: 0, right: 0})},
}));

// Sentry — ESM-only dist; mock to avoid parse errors
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setTags: jest.fn(),
  setContext: jest.fn(),
  withScope: jest.fn(cb => cb({setTag: jest.fn(), setExtra: jest.fn()})),
  Severity: {Error: 'error', Warning: 'warning', Info: 'info'},
  ReactNavigationInstrumentation: jest.fn(),
  ReactNativeTracing: jest.fn(),
}));


// BitcoreTSS — pulls in ESM-only crypto libs (paillier-bigint, bigint-mod-arith).
// Wallet address tests don't need TSS, so mock the whole package.
jest.mock('@bitpay-labs/bitcore-tss', () => ({__esModule: true, default: {}}));

// Solana — ESM-only packages; mock entirely so Jest doesn't try to parse .mjs
jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn(key => ({toBase58: () => key, toString: () => key})),
  Transaction: jest.fn(),
  SystemProgram: {transfer: jest.fn()},
  LAMPORTS_PER_SOL: 1000000000,
}));
jest.mock('@solana/kit', () => ({}));
jest.mock('@solana-program/token-2022', () => ({findAssociatedTokenPda: jest.fn()}));

// Ethers — large lib, mock for unit tests
jest.mock('ethers', () => ({
  ethers: {utils: {isAddress: jest.fn(() => true), getAddress: jest.fn(a => a)}, BigNumber: {from: jest.fn()}},
  utils: {isAddress: jest.fn(() => true), getAddress: jest.fn(a => a)},
  BigNumber: {from: jest.fn()},
}));

// @gorhom/bottom-sheet — requires BottomSheetModalProvider context; minimal mock
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const noop = () => {};
  class BottomSheetModal extends React.Component {
    present() {}
    dismiss() {}
    snapToIndex() {}
    close() {}
    render() { return this.props.children || null; }
  }
  return {
    __esModule: true,
    default: ({children}) => children,
    BottomSheet: ({children}) => children,
    BottomSheetModal,
    BottomSheetView: ({children}) => children,
    BottomSheetModalProvider: ({children}) => children,
    BottomSheetBackdrop: noop,
    BottomSheetScrollView: ({children}) => children,
    BottomSheetFlatList: ({children}) => children,
    BottomSheetTextInput: 'TextInput',
    useBottomSheet: () => ({close: noop, expand: noop, collapse: noop, snapToIndex: noop}),
    useBottomSheetModal: () => ({dismiss: noop, dismissAll: noop, present: noop}),
  };
});

// react-native-vision-camera — TurboModule; mock to avoid native errors
jest.mock('react-native-vision-camera', () => ({
  __esModule: true,
  Camera: 'Camera',
  useCameraDevice: jest.fn(() => ({id: 'mock-device'})),
  useCameraPermission: jest.fn(() => ({hasPermission: false, requestPermission: jest.fn()})),
  useCameraFormat: jest.fn(() => undefined),
  useCodeScanner: jest.fn(() => ({})),
  getCameraDevice: jest.fn(() => null),
}));

// react-native-document-picker — TurboModule; mock to avoid native errors
jest.mock('react-native-document-picker', () => ({
  __esModule: true,
  default: {
    pick: jest.fn(() => Promise.resolve([])),
    pickSingle: jest.fn(() => Promise.resolve(null)),
    releaseSecureAccess: jest.fn(() => Promise.resolve()),
    isCancel: jest.fn(() => false),
    types: {allFiles: 'public.item', pdf: 'com.adobe.pdf', images: 'public.image'},
  },
  isCancel: jest.fn(() => false),
  types: {allFiles: 'public.item', pdf: 'com.adobe.pdf', images: 'public.image'},
}));
