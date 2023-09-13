import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';
jest.mock('react-native-device-info', () => mockRNDeviceInfo);

import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android', // or 'ios'
  select: () => null,
}));

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
global.__reanimatedWorkletInit = jest.fn();
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

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
    })),
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      addListener: jest.fn(),
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

jest.mock('@walletconnect/core', () => ({
  __esModule: true,
  default: () => jest.fn(),
  Core: jest.fn(),
}));

jest.mock('@walletconnect/web3wallet', () => ({
  __esModule: true,
  default: () => jest.fn(),
  Web3Wallet: jest.fn(() => ({
    init: jest.fn(),
  })),
}));

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
