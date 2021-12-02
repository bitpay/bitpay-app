import mockRNDeviceInfo from '../node_modules/react-native-device-info/jest/react-native-device-info-mock';

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('react-native-device-info', () => mockRNDeviceInfo);

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android', // or 'ios'
  select: () => null,
}));
