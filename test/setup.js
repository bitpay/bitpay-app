jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
