/**
 * Tests for sumsub.effects.ts
 */

import configureTestStore from '@test/store';
import {Network} from '../../constants';
import {
  startKycVerification,
  startGetKycStatus,
  MODAL_HANDOFF_DELAY,
} from './sumsub.effects';
import {SumSubApi} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';
import {ongoingProcessManager} from '../../managers/OngoingProcessManager';

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../api/sumsub', () => ({
  SumSubApi: {
    fetchAccessToken: jest.fn(),
    fetchKycStatus: jest.fn(),
    startKycAttempt: jest.fn(),
  },
}));

jest.mock('../../lib/sumsub', () => ({
  launchSumSubSdk: jest.fn(),
}));

jest.mock('../../managers/OngoingProcessManager', () => ({
  ongoingProcessManager: {show: jest.fn(), hide: jest.fn()},
}));

const mockFetchAccessToken = SumSubApi.fetchAccessToken as jest.Mock;
const mockFetchKycStatus = SumSubApi.fetchKycStatus as jest.Mock;
const mockStartKycAttempt = SumSubApi.startKycAttempt as jest.Mock;
const mockLaunchSumSubSdk = launchSumSubSdk as jest.Mock;
const mockShowOngoingProcess = ongoingProcessManager.show as jest.Mock;

const NET = Network.mainnet;
const EID = 'user-eid-123';
const API_TOKEN = 'api-token-xyz';
const ACCESS_TOKEN = 'sumsub-access-token';
const EMAIL = 'user@bitpay.com';
const PHONE = '+15550001111';

const NOT_STARTED = {
  path: 'sumsub',
  provider: null,
  tier: -1,
  status: 'notStarted',
  activeAttempt: null,
};

const makeStore = (overrides: Record<string, any> = {}) =>
  configureTestStore({
    APP: {network: NET},
    BITPAY_ID: {
      user: {[NET]: {eid: EID, email: EMAIL, phone: PHONE}},
      apiToken: {[NET]: API_TOKEN},
    },
    ...overrides,
  });

const makeLoggedOutStore = () =>
  makeStore({BITPAY_ID: {user: {}, apiToken: {}}});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAccessToken.mockResolvedValue(ACCESS_TOKEN);
  mockFetchKycStatus.mockResolvedValue(NOT_STARTED);
  mockStartKycAttempt.mockResolvedValue(undefined);
  mockLaunchSumSubSdk.mockResolvedValue({success: true, status: 'Approved'});
});

describe('startKycVerification — auth guard', () => {
  it('returns early without launching the SDK when there is no user', async () => {
    const store = makeStore({
      BITPAY_ID: {user: {}, apiToken: {[NET]: API_TOKEN}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });

  it('returns early without launching the SDK when there is no apiToken', async () => {
    const store = makeStore({
      BITPAY_ID: {user: {[NET]: {eid: EID}}, apiToken: {}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });

  it('tells the user to log in instead of failing silently', async () => {
    const store = makeLoggedOutStore();

    await store.dispatch(startKycVerification());

    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
  });
});

describe('startKycVerification — happy path', () => {
  it('fetches an access token for the current network/user and launches the SDK', async () => {
    const store = makeStore();

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'en',
      {email: EMAIL, phone: PHONE},
    );
  });

  it('launches the SDK with the app language from APP.defaultLanguage', async () => {
    const store = makeStore({
      APP: {network: NET, defaultLanguage: 'es'},
      BITPAY_ID: {user: {[NET]: {eid: EID}}, apiToken: {[NET]: API_TOKEN}},
    });

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'es',
      {email: undefined, phone: undefined},
    );
  });

  it('re-fetches the authoritative KYC object from the backend after the SDK closes', async () => {
    const store = makeStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);

    await store.dispatch(startKycVerification());

    expect(mockFetchKycStatus).toHaveBeenCalledWith(API_TOKEN);
    expect(store.getState().SUMSUB.kyc[NET]).toEqual(approved);
  });

  it('passes a token-refresh callback that re-fetches the access token', async () => {
    const store = makeStore();

    await store.dispatch(startKycVerification());

    // The 2nd arg to launchSumSubSdk is the onTokenExpired callback.
    const onTokenExpired = mockLaunchSumSubSdk.mock.calls[0][1];
    mockFetchAccessToken.mockClear();
    const refreshed = await onTokenExpired();

    expect(refreshed).toBe(ACCESS_TOKEN);
    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
  });

  it('never shows the ongoing process modal — a dismissing RN modal is the view controller iOS presents the SDK from', async () => {
    const store = makeStore();

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).toHaveBeenCalled();
    expect(mockShowOngoingProcess).not.toHaveBeenCalled();
  });
});

describe('startKycVerification — startKycAttempt', () => {
  it('opens the attempt before launching the SDK', async () => {
    const store = makeStore();

    await store.dispatch(startKycVerification());

    expect(mockStartKycAttempt).toHaveBeenCalledWith(API_TOKEN);
    expect(mockStartKycAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      mockLaunchSumSubSdk.mock.invocationCallOrder[0],
    );
  });

  it('still launches the SDK when opening the attempt fails', async () => {
    const store = makeStore();
    mockStartKycAttempt.mockRejectedValue(new Error('boom'));

    await store.dispatch(startKycVerification());

    // Bookkeeping must never lock the user out of verification.
    expect(mockLaunchSumSubSdk).toHaveBeenCalled();
  });
});

describe('startKycVerification — sdkStatus fallback', () => {
  it('remembers the raw SDK status when the backend still reports notStarted', async () => {
    const store = makeStore();
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED); // backend lags
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'Incomplete',
    });

    await store.dispatch(startKycVerification());

    // The backend object is stored untouched (no synthetic status)…
    expect(store.getState().SUMSUB.kyc[NET]?.status).toBe('notStarted');
    // …and the SDK's own status is kept separately as the fallback signal.
    expect(store.getState().SUMSUB.sdkStatus[NET]).toBe('Incomplete');
  });

  it('does not keep an sdkStatus once the backend has caught up', async () => {
    const store = makeStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'Incomplete',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().SUMSUB.kyc[NET]).toEqual(approved);
    expect(store.getState().SUMSUB.sdkStatus[NET]).toBeNull();
  });
});

describe('startKycVerification — failure handling', () => {
  it('shows an error modal and does not re-fetch when the SDK returns "Failed"', async () => {
    const store = makeStore();
    mockLaunchSumSubSdk.mockResolvedValue({
      success: false,
      status: 'Failed',
      errorType: 'NetworkError',
      errorMsg: 'boom',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
    expect(mockFetchKycStatus).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });

  it('waits out the SumSub view controller dismissal before the error modal', async () => {
    const store = makeStore();
    mockLaunchSumSubSdk.mockResolvedValue({
      success: false,
      status: 'Failed',
      errorMsg: 'boom',
    });

    const startedAt = Date.now();
    let shownAfter: number | null = null;
    const unsubscribe = store.subscribe(() => {
      if (
        shownAfter === null &&
        store.getState().APP.showBottomNotificationModal
      ) {
        shownAfter = Date.now() - startedAt;
      }
    });

    await store.dispatch(startKycVerification());
    unsubscribe();

    // Fails if the await is dropped or moved below the dispatch.
    expect(shownAfter).toBeGreaterThanOrEqual(MODAL_HANDOFF_DELAY - 50);
  });

  it('resolves (does not reject) when the SDK throws', async () => {
    const store = makeStore();
    mockLaunchSumSubSdk.mockRejectedValue(new Error('SDK exploded'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });

  it('surfaces a message and opens no attempt when the user is not eligible for a token', async () => {
    const store = makeStore();
    mockFetchAccessToken.mockResolvedValue(null);

    await store.dispatch(startKycVerification());

    expect(mockStartKycAttempt).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });

  it('resolves when fetching the access token fails', async () => {
    const store = makeStore();
    mockFetchAccessToken.mockRejectedValue(new Error('token endpoint down'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });

  it('never leaks the raw server error into the modal', async () => {
    const store = makeStore();
    mockFetchAccessToken.mockRejectedValue(
      new Error('Region not supported for identity verification'),
    );

    await store.dispatch(startKycVerification());

    const {message} = store.getState().APP.bottomNotificationModalConfig!;
    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
    expect(message).toBe('The verification process encountered an error.');
    expect(message).not.toContain('Region not supported');
  });
});

describe('startGetKycStatus', () => {
  it('fetches and stores the whole backend object', async () => {
    const store = makeStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);

    const result = await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).toHaveBeenCalledWith(API_TOKEN);
    expect(result).toEqual(approved);
    expect(store.getState().SUMSUB.kyc[NET]).toEqual(approved);
  });

  it('stores the tier and status together as one object', async () => {
    const store = makeStore();
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED);

    await store.dispatch(startGetKycStatus());

    const kyc = store.getState().SUMSUB.kyc[NET];
    expect(kyc?.status).toBe('notStarted');
    expect(kyc?.tier).toBe(-1);
  });

  it('clears a stale sdkStatus once the backend advances past notStarted', async () => {
    const store = makeStore({SUMSUB: {sdkStatus: {[NET]: 'Incomplete'}}});
    mockFetchKycStatus.mockResolvedValue({
      path: 'sumsub',
      tier: 0,
      status: 'requiresAction',
    });

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.sdkStatus[NET]).toBeNull();
  });

  it('keeps the sdkStatus while the backend still reports notStarted', async () => {
    const store = makeStore({SUMSUB: {sdkStatus: {[NET]: 'Incomplete'}}});
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED);

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.sdkStatus[NET]).toBe('Incomplete');
  });

  it('does nothing when there is no logged-in user', async () => {
    const store = makeLoggedOutStore();

    await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).not.toHaveBeenCalled();
  });

  it('resolves without throwing when the status request fails', async () => {
    const store = makeStore();
    mockFetchKycStatus.mockRejectedValue(new Error('status endpoint down'));

    await expect(store.dispatch(startGetKycStatus())).resolves.toBeNull();
    expect(store.getState().SUMSUB.kyc[NET]).toBeNull();
  });
});

describe('startGetKycStatus — home banner baseline', () => {
  it('records the first status seen for an account as its baseline', async () => {
    const store = makeStore();
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[NET]).toEqual({
      eid: EID,
      state: 'success',
    });
  });

  it('does not overwrite an existing baseline, so transitions stay visible', async () => {
    const store = makeStore({
      SUMSUB: {bannerAck: {[NET]: {eid: EID, state: 'notStarted'}}},
    });
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[NET]).toEqual({
      eid: EID,
      state: 'notStarted',
    });
  });

  it('reseeds when the baseline belongs to a different account', async () => {
    const store = makeStore({
      SUMSUB: {bannerAck: {[NET]: {eid: 'someone-else', state: 'notStarted'}}},
    });
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[NET]).toEqual({
      eid: EID,
      state: 'success',
    });
  });
});
