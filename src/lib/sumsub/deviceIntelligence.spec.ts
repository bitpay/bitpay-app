import axios from 'axios';
import {DEVICE_EVENT_TIMEOUT_MS, submitDeviceEvent} from './deviceIntelligence';

jest.mock('axios', () => ({post: jest.fn()}));
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {getDeviceType: () => 'Handset'},
  getUniqueId: () => 'device-id',
}));
jest.mock('../../constants/config', () => ({
  BASE_BITPAY_URLS: {livenet: 'https://bitpay.com'},
  NO_CACHE_HEADERS: {},
}));
jest.mock('@sumsub/fisherman', () => ({
  init: jest.fn(async () => ({
    fingerprint: async () => ({visitorId: 'visitor'}),
  })),
  updateAccessToken: jest.fn(),
}));
jest.mock('../../api/bitpay', () => ({apiCall: jest.fn()}));

const post = axios.post as jest.Mock;

describe('submitDeviceEvent', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not stay blocked behind a hung event', async () => {
    post.mockReturnValueOnce(new Promise(() => {}));
    post.mockResolvedValue({data: {data: 'token'}});

    const hung = submitDeviceEvent({network: 'livenet' as any, event: 'login'});
    const next = submitDeviceEvent({
      network: 'livenet' as any,
      event: 'signup',
    });
    const hungError = hung.catch(e => e);

    // The hung event's timer is armed after a few microtask hops.
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
    jest.advanceTimersByTime(DEVICE_EVENT_TIMEOUT_MS);

    expect(String(await hungError)).toMatch('timed out');
    await expect(next).resolves.toBe('visitor');
  });
});
