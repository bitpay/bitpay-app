import Braze from '@braze/react-native-sdk';
import {BrazeClientWrapper} from '.';

jest.mock('@braze/react-native-sdk', () => ({
  initialize: jest.fn(),
  logCustomEvent: jest.fn(),
  changeUser: jest.fn(),
  requestImmediateDataFlush: jest.fn(),
  requestPushPermission: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn(),
  RESULTS: {
    GRANTED: 'granted',
    LIMITED: 'limited',
  },
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('BrazeClientWrapper without SDK configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables Braze without calling the native SDK', async () => {
    const wrapper = new BrazeClientWrapper();

    await wrapper.init();

    expect(wrapper.getStatus()).toBe('disabled');
    expect(wrapper.isReady()).toBe(false);
    expect(Braze.initialize).not.toHaveBeenCalled();
  });

  it('ignores SDK operations while disabled', async () => {
    const wrapper = new BrazeClientWrapper();
    await wrapper.init();

    await wrapper.identify('user-id', {country: 'AR'});
    await wrapper.screen('Home');
    await wrapper.track('Opened App');

    expect(Braze.changeUser).not.toHaveBeenCalled();
    expect(Braze.logCustomEvent).not.toHaveBeenCalled();
  });
});
