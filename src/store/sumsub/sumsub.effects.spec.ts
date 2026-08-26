/**
 * Tests for sumsub.effects.ts
 */

import configureTestStore from '@test/store';
import {Network} from '../../constants';
import {startKycVerification, startGetKycStatus} from './sumsub.effects';
import {SumSubApi} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

const mockFetchAccessToken = SumSubApi.fetchAccessToken as jest.Mock;
const mockFetchKycStatus = SumSubApi.fetchKycStatus as jest.Mock;
const mockStartKycAttempt = SumSubApi.startKycAttempt as jest.Mock;
const mockLaunchSumSubSdk = launchSumSubSdk as jest.Mock;

// ---------------------------------------------------------------------------
// Helper: build a store seeded with a logged-in user
// ---------------------------------------------------------------------------
const EID = 'user-eid-123';
const API_TOKEN = 'api-token-xyz';
const ACCESS_TOKEN = 'sumsub-access-token';

const NOT_STARTED = {
  path: 'sumsub',
  provider: null,
  tier: -1,
  status: 'notStarted',
  activeAttempt: null,
};

const makeLoggedInStore = () =>
  configureTestStore({
    APP: {network: Network.mainnet},
    BITPAY_ID: {
      user: {[Network.mainnet]: {eid: EID}},
      apiToken: {[Network.mainnet]: API_TOKEN},
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAccessToken.mockResolvedValue(ACCESS_TOKEN);
  mockFetchKycStatus.mockResolvedValue(NOT_STARTED);
  mockStartKycAttempt.mockResolvedValue(undefined);
  mockLaunchSumSubSdk.mockResolvedValue({success: true, status: 'Approved'});
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------
describe('startKycVerification — auth guard', () => {
  it('returns early without launching the SDK when there is no user', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {}, apiToken: {[Network.mainnet]: API_TOKEN}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
  });

  it('returns early without launching the SDK when there is no apiToken', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {[Network.mainnet]: {eid: EID}}, apiToken: {}},
    });

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe('startKycVerification — happy path', () => {
  it('fetches an access token for the current network/user and launches the SDK', async () => {
    const store = makeLoggedInStore();

    await store.dispatch(startKycVerification());

    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'en',
    );
  });

  it('launches the SDK with the app language from APP.defaultLanguage', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet, defaultLanguage: 'es'},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
    });

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      expect.any(Function),
      'es',
    );
  });

  it('re-fetches the authoritative KYC object from the backend after the SDK closes', async () => {
    const store = makeLoggedInStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);

    await store.dispatch(startKycVerification());

    expect(mockFetchKycStatus).toHaveBeenCalledWith(API_TOKEN);
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toEqual(approved);
  });

  it('passes a token-refresh callback that re-fetches the access token', async () => {
    const store = makeLoggedInStore();

    await store.dispatch(startKycVerification());

    // The 2nd arg to launchSumSubSdk is the onTokenExpired callback.
    const onTokenExpired = mockLaunchSumSubSdk.mock.calls[0][1];
    mockFetchAccessToken.mockClear();
    const refreshed = await onTokenExpired();

    expect(refreshed).toBe(ACCESS_TOKEN);
    expect(mockFetchAccessToken).toHaveBeenCalledWith(API_TOKEN);
  });
});

// ---------------------------------------------------------------------------
// Server-side attempt
// ---------------------------------------------------------------------------
describe('startKycVerification — startKycAttempt', () => {
  it('opens the attempt before launching the SDK', async () => {
    const store = makeLoggedInStore();

    await store.dispatch(startKycVerification());

    expect(mockStartKycAttempt).toHaveBeenCalledWith(API_TOKEN);
    expect(mockStartKycAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      mockLaunchSumSubSdk.mock.invocationCallOrder[0],
    );
  });

  it('never opens an attempt when the user is not eligible for a token', async () => {
    const store = makeLoggedInStore();
    mockFetchAccessToken.mockResolvedValue(null);

    await store.dispatch(startKycVerification());

    expect(mockStartKycAttempt).not.toHaveBeenCalled();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
  });

  it('still launches the SDK when opening the attempt fails', async () => {
    const store = makeLoggedInStore();
    mockStartKycAttempt.mockRejectedValue(new Error('boom'));

    await store.dispatch(startKycVerification());

    // Bookkeeping must never lock the user out of verification.
    expect(mockLaunchSumSubSdk).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SDK-status fallback while the backend lags behind a just-finished session
// ---------------------------------------------------------------------------
describe('startKycVerification — sdkStatus fallback', () => {
  it('remembers the raw SDK status when the backend still reports notStarted', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED); // backend lags
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'Incomplete',
    });

    await store.dispatch(startKycVerification());

    // The backend object is stored untouched (no synthetic status)…
    expect(store.getState().SUMSUB.kyc[Network.mainnet]?.status).toBe(
      'notStarted',
    );
    // …and the SDK's own status is kept separately as the fallback signal.
    expect(store.getState().SUMSUB.sdkStatus[Network.mainnet]).toBe(
      'Incomplete',
    );
  });

  it('does not keep an sdkStatus once the backend has caught up', async () => {
    const store = makeLoggedInStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);
    mockLaunchSumSubSdk.mockResolvedValue({
      success: true,
      status: 'Incomplete',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toEqual(approved);
    expect(store.getState().SUMSUB.sdkStatus[Network.mainnet]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Failure / edge cases
// ---------------------------------------------------------------------------
describe('startKycVerification — failure handling', () => {
  it('shows an error modal and does not re-fetch when the SDK returns "Failed"', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockResolvedValue({
      success: false,
      status: 'Failed',
      errorType: 'NetworkError',
      errorMsg: 'boom',
    });

    await store.dispatch(startKycVerification());

    expect(store.getState().APP.showBottomNotificationModal).toBe(true);
    expect(mockFetchKycStatus).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
  });

  it('resolves (does not reject) when the SDK throws', async () => {
    const store = makeLoggedInStore();
    mockLaunchSumSubSdk.mockRejectedValue(new Error('SDK exploded'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
  });

  it('does not launch the SDK when the token is null (user not eligible)', async () => {
    const store = makeLoggedInStore();
    mockFetchAccessToken.mockResolvedValue(null);

    await store.dispatch(startKycVerification());

    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
    expect(store.getState().APP.showBottomNotificationModal).not.toBe(true);
  });

  it('resolves when fetching the access token fails', async () => {
    const store = makeLoggedInStore();
    mockFetchAccessToken.mockRejectedValue(new Error('token endpoint down'));

    await expect(
      store.dispatch(startKycVerification()),
    ).resolves.toBeUndefined();
    expect(mockLaunchSumSubSdk).not.toHaveBeenCalled();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// startGetKycStatus
// ---------------------------------------------------------------------------
describe('startGetKycStatus', () => {
  it('fetches and stores the whole backend object', async () => {
    const store = makeLoggedInStore();
    const approved = {path: 'sumsub', tier: 0, status: 'approved'};
    mockFetchKycStatus.mockResolvedValue(approved);

    const result = await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).toHaveBeenCalledWith(API_TOKEN);
    expect(result).toEqual(approved);
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toEqual(approved);
  });

  it('stores the tier and status together as one object', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED);

    await store.dispatch(startGetKycStatus());

    const kyc = store.getState().SUMSUB.kyc[Network.mainnet];
    expect(kyc?.status).toBe('notStarted');
    expect(kyc?.tier).toBe(-1);
  });

  it('clears a stale sdkStatus once the backend advances past notStarted', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
      SUMSUB: {sdkStatus: {[Network.mainnet]: 'Incomplete'}},
    });
    mockFetchKycStatus.mockResolvedValue({
      path: 'sumsub',
      tier: 0,
      status: 'requiresAction',
    });

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.sdkStatus[Network.mainnet]).toBeNull();
  });

  it('keeps the sdkStatus while the backend still reports notStarted', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
      SUMSUB: {sdkStatus: {[Network.mainnet]: 'Incomplete'}},
    });
    mockFetchKycStatus.mockResolvedValue(NOT_STARTED);

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.sdkStatus[Network.mainnet]).toBe(
      'Incomplete',
    );
  });

  it('does nothing when there is no logged-in user', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {user: {}, apiToken: {[Network.mainnet]: API_TOKEN}},
    });

    await store.dispatch(startGetKycStatus());

    expect(mockFetchKycStatus).not.toHaveBeenCalled();
  });

  it('resolves without throwing when the status request fails', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockRejectedValue(new Error('status endpoint down'));

    await expect(store.dispatch(startGetKycStatus())).resolves.toBeNull();
    expect(store.getState().SUMSUB.kyc[Network.mainnet]).toBeNull();
  });
});

describe('startGetKycStatus — home banner baseline', () => {
  it('records the first status seen for an account as its baseline', async () => {
    const store = makeLoggedInStore();
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[Network.mainnet]).toEqual({
      eid: EID,
      state: 'success',
    });
  });

  it('does not overwrite an existing baseline, so transitions stay visible', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
      SUMSUB: {
        bannerAck: {[Network.mainnet]: {eid: EID, state: 'notStarted'}},
      },
    });
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[Network.mainnet]).toEqual({
      eid: EID,
      state: 'notStarted',
    });
  });

  it('reseeds when the baseline belongs to a different account', async () => {
    const store = configureTestStore({
      APP: {network: Network.mainnet},
      BITPAY_ID: {
        user: {[Network.mainnet]: {eid: EID}},
        apiToken: {[Network.mainnet]: API_TOKEN},
      },
      SUMSUB: {
        bannerAck: {
          [Network.mainnet]: {eid: 'someone-else', state: 'notStarted'},
        },
      },
    });
    mockFetchKycStatus.mockResolvedValue({...NOT_STARTED, status: 'approved'});

    await store.dispatch(startGetKycStatus());

    expect(store.getState().SUMSUB.bannerAck[Network.mainnet]).toEqual({
      eid: EID,
      state: 'success',
    });
  });
});
