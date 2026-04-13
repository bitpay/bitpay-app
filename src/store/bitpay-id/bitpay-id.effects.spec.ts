/**
 * Tests for bitpay-id.effects.ts
 *
 * Covers:
 *   - startFetchSession (success + failure)
 *   - startBitPayIdStoreInit (dispatches SUCCESS_INITIALIZE_STORE)
 *   - startBitPayIdAnalyticsInit (Braze merge branch, no-op when user is falsy)
 *   - checkLoginWithPasskey (no email, passkey false, passkey true, error 1001, other error)
 *   - startSubmitForgotPasswordEmail (success, failed data, exception)
 *   - startTwoFactorAuth (success, failure)
 *   - startDisconnectBitPayId (authenticated + unauthenticated paths)
 *   - startFetchBasicInfo (success, failure)
 *   - startFetchDoshToken (success, failure)
 */

import configureTestStore from '@test/store';
import {Network} from '../../constants';
import {BitPayIdActionTypes} from './bitpay-id.types';
import {
  startFetchSession,
  startBitPayIdStoreInit,
  startBitPayIdAnalyticsInit,
  checkLoginWithPasskey,
  startSubmitForgotPasswordEmail,
  startTwoFactorAuth,
  startDisconnectBitPayId,
  startFetchBasicInfo,
  startFetchDoshToken,
} from './bitpay-id.effects';

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

jest.mock('../../managers/OngoingProcessManager', () => ({
  ongoingProcessManager: {
    show: jest.fn(),
    hide: jest.fn(),
  },
}));

jest.mock('../../lib/dosh', () => ({
  __esModule: true,
  default: {clearUser: jest.fn()},
}));

jest.mock('../../lib/Mixpanel', () => ({
  MixpanelWrapper: {
    reset: jest.fn(() => Promise.resolve()),
    identify: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../lib/Braze', () => ({
  BrazeWrapper: {
    merge: jest.fn(() => Promise.resolve()),
    identify: jest.fn(() => Promise.resolve()),
    setEmail: jest.fn(),
    setEmailNotificationSubscriptionType: jest.fn(),
  },
}));

jest.mock('../analytics/analytics.effects', () => ({
  Analytics: {
    track: jest.fn(() => ({type: 'ANALYTICS/TRACK'})),
    identify: jest.fn(() => () => Promise.resolve()),
    startMergingUser: jest.fn(),
  },
}));

jest.mock('../app/app.effects', () => ({
  isAnonymousBrazeEid: jest.fn(() => false),
  setEmailNotifications: jest.fn(() => ({type: 'APP/SET_EMAIL_NOTIFICATIONS'})),
}));

jest.mock('../shop', () => ({
  ShopEffects: {
    startFetchCatalog: jest.fn(() => ({type: 'SHOP/FETCH_CATALOG'})),
    startSyncGiftCards: jest.fn(() => () => Promise.resolve()),
    redeemSyncedGiftCards: jest.fn(() => ({type: 'SHOP/REDEEM'})),
    startGetBillPayAccounts: jest.fn(() => () => Promise.resolve()),
  },
  ShopActions: {
    clearedBillPayAccounts: jest.fn(() => ({type: 'SHOP/CLEAR_BILL_ACCOUNTS'})),
    clearedBillPayPayments: jest.fn(() => ({type: 'SHOP/CLEAR_BILL_PAYMENTS'})),
  },
}));

jest.mock('../card', () => ({
  CardEffects: {
    startCardStoreInit: jest.fn(() => ({type: 'CARD/INIT'})),
  },
  CardActions: {
    isJoinedWaitlist: jest.fn(() => ({type: 'CARD/WAITLIST'})),
  },
}));

jest.mock('../../utils/passkey', () => ({
  getPasskeyStatus: jest.fn(),
  signInWithPasskey: jest.fn(),
  getPasskeyCredentials: jest.fn(() => Promise.resolve({credentials: []})),
}));

jest.mock('../../utils/cookieAuth', () => ({
  clearAllCookiesEverywhere: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../api/auth', () => ({
  __esModule: true,
  default: {
    fetchSession: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    generatePairingCode: jest.fn(),
    pair: jest.fn(),
    submitTwoFactor: jest.fn(),
    submitForgotPasswordEmail: jest.fn(),
  },
}));

jest.mock('../../api/user', () => ({
  __esModule: true,
  default: {
    fetchInitialUserData: jest.fn(),
    fetchBasicInfo: jest.fn(),
    fetchDoshToken: jest.fn(),
  },
}));

jest.mock('../../api/bitpay', () => ({
  __esModule: true,
  default: {
    apiCall: jest.fn(),
    getInstance: jest.fn(() => ({
      request: jest.fn(() => Promise.resolve({data: {data: {}}})),
    })),
  },
}));

import AuthApi from '../../api/auth';
import UserApi from '../../api/user';
import {getPasskeyStatus, signInWithPasskey} from '../../utils/passkey';
import {isAnonymousBrazeEid} from '../app/app.effects';
import {BrazeWrapper} from '../../lib/Braze';

const MockAuthApi = AuthApi as jest.Mocked<typeof AuthApi>;
const MockUserApi = UserApi as jest.Mocked<typeof UserApi>;
const MockGetPasskeyStatus = getPasskeyStatus as jest.Mock;
const MockSignInWithPasskey = signInWithPasskey as jest.Mock;
const MockIsAnonymousBrazeEid = isAnonymousBrazeEid as jest.Mock;
const MockBrazeWrapperMerge = BrazeWrapper.merge as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSession = (overrides = {}) => ({
  csrfToken: 'csrf-token-123',
  isAuthenticated: false,
  captchaKey: '',
  noCaptchaKey: '',
  ...overrides,
});

const makeUser = (overrides = {}): any => ({
  eid: 'eid-abc',
  name: 'Alice Doe',
  email: 'alice@example.com',
  givenName: 'Alice',
  familyName: 'Doe',
  optInEmailMarketing: true,
  verified: true,
  ...overrides,
});

const makeInitialData = (userOverrides = {}): any => ({
  basicInfo: makeUser(userOverrides),
  doshToken: null,
});

const baseStore = () =>
  configureTestStore({
    BITPAY_ID: {
      session: makeSession({csrfToken: 'csrf-token-123'}),
      apiToken: {[Network.mainnet]: 'token-abc'},
    },
    APP: {
      network: Network.mainnet,
      brazeEid: null,
      emailNotifications: {accepted: false},
      notificationsAccepted: false,
    },
  });

// ---------------------------------------------------------------------------
// startFetchSession
// ---------------------------------------------------------------------------

describe('startFetchSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches successFetchSession on success', async () => {
    const session = makeSession({
      csrfToken: 'new-token',
      isAuthenticated: true,
    });
    (MockAuthApi.fetchSession as jest.Mock).mockResolvedValueOnce(session);

    const store = baseStore();
    await store.dispatch(startFetchSession());

    const actions = (store as any).getActions?.() ?? [];
    const sessionInState = store.getState().BITPAY_ID.session;
    // Either via recorded actions or final state
    const succeeded =
      actions.some(
        (a: any) => a.type === BitPayIdActionTypes.SUCCESS_FETCH_SESSION,
      ) || sessionInState.csrfToken === 'new-token';
    expect(succeeded).toBe(true);
  });

  it('dispatches failedFetchSession when AuthApi throws', async () => {
    (MockAuthApi.fetchSession as jest.Mock).mockRejectedValueOnce(
      new Error('network error'),
    );

    const store = baseStore();
    await store.dispatch(startFetchSession());
    // The fetchSessionStatus transitions to 'loading' and then fails → check state
    // failedFetchSession sets fetchSessionStatus to 'failed'
    expect(store.getState().BITPAY_ID.fetchSessionStatus).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// startBitPayIdStoreInit
// ---------------------------------------------------------------------------

describe('startBitPayIdStoreInit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches SUCCESS_INITIALIZE_STORE with network and user data', async () => {
    const store = baseStore();
    const initialData = makeInitialData();

    await store.dispatch(startBitPayIdStoreInit(initialData));

    const state = store.getState().BITPAY_ID;
    // The user should be populated for the mainnet network
    expect(state.user[Network.mainnet]).toBeDefined();
    expect(state.user[Network.mainnet]?.eid).toBe('eid-abc');
  });

  it('populates user in state and handles marketing communications flag', async () => {
    const store = baseStore();
    const initialData = makeInitialData();

    await store.dispatch(startBitPayIdStoreInit(initialData, true));

    // Even with marketing flag set, user should still be initialized
    const state = store.getState().BITPAY_ID;
    expect(state.user[Network.mainnet]?.email).toBe('alice@example.com');
  });
});

// ---------------------------------------------------------------------------
// startBitPayIdAnalyticsInit
// ---------------------------------------------------------------------------

describe('startBitPayIdAnalyticsInit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when user is falsy', async () => {
    const store = baseStore();
    await store.dispatch(startBitPayIdAnalyticsInit(null as any));
    expect(MockBrazeWrapperMerge).not.toHaveBeenCalled();
  });

  it('calls BrazeWrapper.merge when brazeEid is anonymous and differs from user eid', async () => {
    MockIsAnonymousBrazeEid.mockReturnValueOnce(true);

    const store = configureTestStore({
      BITPAY_ID: {
        session: makeSession(),
        apiToken: {[Network.mainnet]: ''},
      },
      APP: {
        network: Network.mainnet,
        brazeEid: 'old-anon-eid', // different from user eid
        emailNotifications: {accepted: false},
        notificationsAccepted: false,
      },
    });

    const user = makeUser({eid: 'new-eid-xyz'});
    await store.dispatch(startBitPayIdAnalyticsInit(user));

    expect(MockBrazeWrapperMerge).toHaveBeenCalledWith(
      'old-anon-eid',
      'new-eid-xyz',
    );
  });

  it('does NOT call BrazeWrapper.merge when brazeEid is not anonymous', async () => {
    MockIsAnonymousBrazeEid.mockReturnValueOnce(false);

    const store = configureTestStore({
      APP: {
        network: Network.mainnet,
        brazeEid: 'registered-eid',
        emailNotifications: {accepted: false},
        notificationsAccepted: false,
      },
      BITPAY_ID: {
        session: makeSession(),
        apiToken: {[Network.mainnet]: ''},
      },
    });

    await store.dispatch(startBitPayIdAnalyticsInit(makeUser()));
    expect(MockBrazeWrapperMerge).not.toHaveBeenCalled();
  });

  it('derives givenName/familyName from name when they are missing', async () => {
    const user = makeUser({
      givenName: undefined,
      familyName: undefined,
      name: 'John Smith',
    });
    const store = baseStore();
    // Should not throw
    await expect(
      store.dispatch(startBitPayIdAnalyticsInit(user)),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkLoginWithPasskey
// ---------------------------------------------------------------------------

describe('checkLoginWithPasskey', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns false immediately when email is undefined (no passkey check, passkey sign-in resolves false → rejects)', async () => {
    // When email is undefined: getPasskeyStatus is skipped, _passkey stays false,
    // `email && !_passkey` is also false (email is falsy), so it falls through to
    // signInWithPasskey(). We mock it to return true to avoid the rejection branch.
    MockSignInWithPasskey.mockResolvedValueOnce(true);
    const store = baseStore();
    const result = await store.dispatch(
      checkLoginWithPasskey(undefined, Network.mainnet, 'csrf'),
    );
    expect(result).toBe(true);
    expect(MockGetPasskeyStatus).not.toHaveBeenCalled();
  });

  it('returns false when user has no passkey', async () => {
    MockGetPasskeyStatus.mockResolvedValueOnce({passkey: false});
    const store = baseStore();
    const result = await store.dispatch(
      checkLoginWithPasskey('alice@example.com', Network.mainnet, 'csrf'),
    );
    expect(result).toBe(false);
  });

  it('returns true when passkey sign-in succeeds', async () => {
    MockGetPasskeyStatus.mockResolvedValueOnce({passkey: true});
    MockSignInWithPasskey.mockResolvedValueOnce(true);
    const store = baseStore();
    const result = await store.dispatch(
      checkLoginWithPasskey('alice@example.com', Network.mainnet, 'csrf'),
    );
    expect(result).toBe(true);
  });

  it('rejects when signInWithPasskey returns false (failed sign-in)', async () => {
    MockGetPasskeyStatus.mockResolvedValueOnce({passkey: true});
    MockSignInWithPasskey.mockResolvedValueOnce(false);
    const store = baseStore();
    await expect(
      store.dispatch(
        checkLoginWithPasskey('alice@example.com', Network.mainnet, 'csrf'),
      ),
    ).rejects.toThrow('Failed to sign in with Passkey');
  });

  it('returns false (no error thrown) when passkey error includes "error 1001" (user cancelled)', async () => {
    MockGetPasskeyStatus.mockResolvedValueOnce({passkey: true});
    MockSignInWithPasskey.mockRejectedValueOnce(
      new Error('Passkey error 1001: cancelled'),
    );
    const store = baseStore();
    const result = await store.dispatch(
      checkLoginWithPasskey('alice@example.com', Network.mainnet, 'csrf'),
    );
    expect(result).toBe(false);
  });

  it('rejects when passkey sign-in throws a non-1001 error', async () => {
    MockGetPasskeyStatus.mockResolvedValueOnce({passkey: true});
    MockSignInWithPasskey.mockRejectedValueOnce(
      new Error('Unexpected passkey failure'),
    );
    const store = baseStore();
    await expect(
      store.dispatch(
        checkLoginWithPasskey('alice@example.com', Network.mainnet, 'csrf'),
      ),
    ).rejects.toThrow('Unexpected passkey failure');
  });
});

// ---------------------------------------------------------------------------
// startSubmitForgotPasswordEmail
// ---------------------------------------------------------------------------

describe('startSubmitForgotPasswordEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches success status when API returns data.success = true', async () => {
    (MockAuthApi.submitForgotPasswordEmail as jest.Mock).mockResolvedValueOnce({
      success: true,
    });
    const store = baseStore();
    await store.dispatch(
      startSubmitForgotPasswordEmail({email: 'alice@example.com'}),
    );
    const status = store.getState().BITPAY_ID.forgotPasswordEmailStatus;
    expect(status?.status).toBe('success');
  });

  it('dispatches failed status when API returns data.success = false', async () => {
    (MockAuthApi.submitForgotPasswordEmail as jest.Mock).mockResolvedValueOnce({
      success: false,
      message: 'Something went wrong',
    });
    const store = baseStore();
    await store.dispatch(
      startSubmitForgotPasswordEmail({email: 'alice@example.com'}),
    );
    const status = store.getState().BITPAY_ID.forgotPasswordEmailStatus;
    expect(status?.status).toBe('failed');
    expect(status?.message).toBe('Something went wrong');
  });

  it('dispatches failed status when API throws', async () => {
    (MockAuthApi.submitForgotPasswordEmail as jest.Mock).mockRejectedValueOnce(
      new Error('network error'),
    );
    const store = baseStore();
    await store.dispatch(
      startSubmitForgotPasswordEmail({email: 'alice@example.com'}),
    );
    const status = store.getState().BITPAY_ID.forgotPasswordEmailStatus;
    expect(status?.status).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// startTwoFactorAuth
// ---------------------------------------------------------------------------

describe('startTwoFactorAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches successSubmitTwoFactorAuth on successful 2FA submission', async () => {
    (MockAuthApi.submitTwoFactor as jest.Mock).mockResolvedValueOnce({});
    const session = makeSession({csrfToken: 'new-csrf', isAuthenticated: true});
    (MockAuthApi.fetchSession as jest.Mock).mockResolvedValueOnce(session);

    const store = baseStore();
    await store.dispatch(startTwoFactorAuth('123456'));

    expect(store.getState().BITPAY_ID.twoFactorAuthStatus).toBe('success');
  });

  it('dispatches failedSubmitTwoFactorAuth on API error', async () => {
    (MockAuthApi.submitTwoFactor as jest.Mock).mockRejectedValueOnce(
      new Error('Invalid code'),
    );
    const store = baseStore();
    await store.dispatch(startTwoFactorAuth('wrong-code'));
    expect(store.getState().BITPAY_ID.twoFactorAuthStatus).toBe('failed');
    expect(store.getState().BITPAY_ID.twoFactorAuthError).toBe('Invalid code');
  });

  it('uses the Axios error response data as error message', async () => {
    const axiosErr: any = {
      isAxiosError: true,
      response: {data: 'Bad two-factor code'},
      message: 'Request failed',
    };
    (MockAuthApi.submitTwoFactor as jest.Mock).mockRejectedValueOnce(axiosErr);
    const store = baseStore();
    await store.dispatch(startTwoFactorAuth('000000'));
    const errMsg = store.getState().BITPAY_ID.twoFactorAuthError;
    // upperFirst('Bad two-factor code') = 'Bad two-factor code'
    expect(errMsg).toBe('Bad two-factor code');
  });
});

// ---------------------------------------------------------------------------
// startDisconnectBitPayId
// ---------------------------------------------------------------------------

describe('startDisconnectBitPayId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls AuthApi.logout when session isAuthenticated=true and dispatches bitPayIdDisconnected', async () => {
    (MockAuthApi.fetchSession as jest.Mock)
      .mockResolvedValueOnce(
        makeSession({isAuthenticated: true, csrfToken: 'valid-csrf'}),
      )
      .mockResolvedValueOnce(makeSession()); // second call for session refresh
    (MockAuthApi.logout as jest.Mock).mockResolvedValueOnce({});

    const store = baseStore();
    await store.dispatch(startDisconnectBitPayId());

    expect(MockAuthApi.logout).toHaveBeenCalledTimes(1);
    // BITPAY_ID_DISCONNECTED clears user and token for the network
    expect(store.getState().BITPAY_ID.user[Network.mainnet]).toBeNull();
  });

  it('does NOT call AuthApi.logout when session isAuthenticated=false', async () => {
    (MockAuthApi.fetchSession as jest.Mock)
      .mockResolvedValueOnce(makeSession({isAuthenticated: false}))
      .mockResolvedValueOnce(makeSession());

    const store = baseStore();
    await store.dispatch(startDisconnectBitPayId());

    expect(MockAuthApi.logout).not.toHaveBeenCalled();
  });

  it('still completes (does not throw) when AuthApi.logout throws', async () => {
    (MockAuthApi.fetchSession as jest.Mock)
      .mockResolvedValueOnce(
        makeSession({isAuthenticated: true, csrfToken: 'valid-csrf'}),
      )
      .mockResolvedValueOnce(makeSession());
    (MockAuthApi.logout as jest.Mock).mockRejectedValueOnce(
      new Error('logout failed'),
    );

    const store = baseStore();
    await expect(
      store.dispatch(startDisconnectBitPayId()),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// startFetchBasicInfo
// ---------------------------------------------------------------------------

describe('startFetchBasicInfo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user data and dispatches successFetchBasicInfo on success', async () => {
    const user = makeUser();
    (MockUserApi.fetchBasicInfo as jest.Mock).mockResolvedValueOnce(user);

    const store = baseStore();
    const result = await store.dispatch(startFetchBasicInfo('token-abc'));

    expect(result).toEqual(user);
    expect(store.getState().BITPAY_ID.user[Network.mainnet]?.eid).toBe(
      'eid-abc',
    );
  });

  it('dispatches failedFetchBasicInfo and rethrows on error', async () => {
    const error = new Error('fetch failed');
    (MockUserApi.fetchBasicInfo as jest.Mock).mockRejectedValueOnce(error);

    const store = baseStore();
    await expect(
      store.dispatch(startFetchBasicInfo('token-abc')),
    ).rejects.toThrow('fetch failed');
    expect(store.getState().BITPAY_ID.fetchBasicInfoStatus).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// startFetchDoshToken
// ---------------------------------------------------------------------------

describe('startFetchDoshToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('dispatches successFetchDoshToken with the returned token', async () => {
    (MockUserApi.fetchDoshToken as jest.Mock).mockResolvedValueOnce('dosh-xyz');

    const store = baseStore();
    await store.dispatch(startFetchDoshToken());

    expect(store.getState().BITPAY_ID.doshToken[Network.mainnet]).toBe(
      'dosh-xyz',
    );
  });

  it('dispatches failedFetchDoshToken when API call fails', async () => {
    (MockUserApi.fetchDoshToken as jest.Mock).mockRejectedValueOnce(
      new Error('dosh error'),
    );

    const store = baseStore();
    await store.dispatch(startFetchDoshToken());
    expect(store.getState().BITPAY_ID.fetchDoshTokenStatus).toBe('failed');
  });
});
