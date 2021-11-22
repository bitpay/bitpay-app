jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});
