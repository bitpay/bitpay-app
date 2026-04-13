/**
 * Tests for app.reducer.ts
 *
 * Each action handled by appReducer is exercised as a pure function:
 *   appReducer(state, action) → newState
 *
 * No Redux store or middleware is needed — reducers are pure functions.
 */

import {appReducer, AppState} from './app.reducer';
import {AppActionTypes} from './app.types';
import {Network} from '../../constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a fresh state by calling reducer with undefined state and unknown action */
const freshState = (): AppState =>
  appReducer(undefined, {type: '@@INIT'} as any);

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe('appReducer — default state', () => {
  it('returns a state with expected defaults when called with undefined and unknown action', () => {
    const state = freshState();
    expect(state.appIsLoading).toBe(true);
    expect(state.appWasInit).toBe(false);
    expect(state.appIsReadyForDeeplinking).toBe(false);
    expect(state.onboardingCompleted).toBe(false);
    expect(state.showWalletConnectStartModal).toBe(false);
    expect(state.showInAppNotification).toBe(false);
    expect(state.showBottomNotificationModal).toBe(false);
    expect(state.showChainSelectorModal).toBe(false);
    expect(state.notificationsAccepted).toBe(false);
    expect(state.pinLockActive).toBe(false);
    expect(state.biometricLockActive).toBe(false);
    expect(state.showPortfolioValue).toBe(true);
    expect(state.hideAllBalances).toBe(false);
    expect(state.brazeContentCards).toEqual([]);
    expect(state.migrationComplete).toBe(false);
    expect(state.EDDSAKeyMigrationCompleteV2).toBe(false);
    expect(state.keyMigrationFailure).toBe(false);
    expect(state.activeModalId).toBeNull();
    expect(state.failedAppInit).toBe(false);
    expect(state.hasViewedZenLedgerWarning).toBe(false);
    expect(state.hasViewedBillsTab).toBe(false);
    expect(state.dismissedMarketingCardIds).toEqual([]);
    expect(state.isImportLedgerModalVisible).toBe(false);
    expect(state.inAppBrowserOpen).toBe(false);
    expect(state.tokensDataLoaded).toBe(false);
    expect(state.showArchaxBanner).toBe(false);
  });

  it('returns same state on unknown action', () => {
    const state = freshState();
    const next = appReducer(state, {type: 'COMPLETELY_UNKNOWN'} as any);
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// IMPORT_LEDGER_MODAL_TOGGLED
// ---------------------------------------------------------------------------

describe('IMPORT_LEDGER_MODAL_TOGGLED', () => {
  it('sets isImportLedgerModalVisible to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.IMPORT_LEDGER_MODAL_TOGGLED,
      payload: true,
    });
    expect(state.isImportLedgerModalVisible).toBe(true);
  });

  it('sets isImportLedgerModalVisible to false', () => {
    const base: AppState = {...freshState(), isImportLedgerModalVisible: true};
    const state = appReducer(base, {
      type: AppActionTypes.IMPORT_LEDGER_MODAL_TOGGLED,
      payload: false,
    });
    expect(state.isImportLedgerModalVisible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NETWORK_CHANGED
// ---------------------------------------------------------------------------

describe('NETWORK_CHANGED', () => {
  it('updates the network field', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.NETWORK_CHANGED,
      payload: Network.testnet,
    });
    expect(state.network).toBe(Network.testnet);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_APP_INIT / APP_INIT_COMPLETE
// ---------------------------------------------------------------------------

describe('SUCCESS_APP_INIT', () => {
  it('sets appIsLoading to false', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SUCCESS_APP_INIT,
    });
    expect(state.appIsLoading).toBe(false);
  });
});

describe('APP_INIT_COMPLETE', () => {
  it('sets appWasInit to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.APP_INIT_COMPLETE,
    });
    expect(state.appWasInit).toBe(true);
  });
});

describe('APP_TOKENS_DATA_LOADED', () => {
  it('sets tokensDataLoaded to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.APP_TOKENS_DATA_LOADED,
    });
    expect(state.tokensDataLoaded).toBe(true);
  });
});

describe('APP_READY_FOR_DEEPLINKING', () => {
  it('sets appIsReadyForDeeplinking to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.APP_READY_FOR_DEEPLINKING,
    });
    expect(state.appIsReadyForDeeplinking).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SET_APP_FIRST_OPEN_EVENT_COMPLETE / SET_APP_FIRST_OPEN_DATE
// ---------------------------------------------------------------------------

describe('SET_APP_FIRST_OPEN_EVENT_COMPLETE', () => {
  it('sets firstOpenEventComplete to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_APP_FIRST_OPEN_EVENT_COMPLETE,
    });
    expect(state.appFirstOpenData.firstOpenEventComplete).toBe(true);
  });

  it('preserves existing firstOpenDate', () => {
    const base: AppState = {
      ...freshState(),
      appFirstOpenData: {firstOpenEventComplete: false, firstOpenDate: 12345},
    };
    const state = appReducer(base, {
      type: AppActionTypes.SET_APP_FIRST_OPEN_EVENT_COMPLETE,
    });
    expect(state.appFirstOpenData.firstOpenDate).toBe(12345);
  });
});

describe('SET_APP_FIRST_OPEN_DATE', () => {
  it('sets firstOpenDate to the given timestamp', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_APP_FIRST_OPEN_DATE,
      payload: 99999,
    });
    expect(state.appFirstOpenData.firstOpenDate).toBe(99999);
  });
});

// ---------------------------------------------------------------------------
// SET_ONBOARDING_COMPLETED / SET_APP_INSTALLED
// ---------------------------------------------------------------------------

describe('SET_ONBOARDING_COMPLETED', () => {
  it('sets onboardingCompleted to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_ONBOARDING_COMPLETED,
    });
    expect(state.onboardingCompleted).toBe(true);
  });
});

describe('SET_APP_INSTALLED', () => {
  it('sets appInstalled to true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_APP_INSTALLED,
    });
    expect(state.appInstalled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS WALLET CONNECT START MODAL
// ---------------------------------------------------------------------------

describe('SHOW_WALLET_CONNECT_START_MODAL / DISMISS_WALLET_CONNECT_START_MODAL', () => {
  it('shows the modal', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_WALLET_CONNECT_START_MODAL,
    });
    expect(state.showWalletConnectStartModal).toBe(true);
  });

  it('dismisses the modal', () => {
    const base: AppState = {...freshState(), showWalletConnectStartModal: true};
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_WALLET_CONNECT_START_MODAL,
    });
    expect(state.showWalletConnectStartModal).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS IN_APP_NOTIFICATION
// ---------------------------------------------------------------------------

describe('SHOW_IN_APP_NOTIFICATION / DISMISS_IN_APP_NOTIFICATION', () => {
  it('shows the in-app notification with data', () => {
    const payload = {
      message: 'Test notification',
      context: 'walletConnect' as any,
      request: undefined as any,
    };
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_IN_APP_NOTIFICATION,
      payload,
    });
    expect(state.showInAppNotification).toBe(true);
    expect(state.inAppNotificationData).toEqual(payload);
  });

  it('dismisses the notification and clears data', () => {
    const base: AppState = {
      ...freshState(),
      showInAppNotification: true,
      inAppNotificationData: {
        message: 'msg',
        context: 'walletConnect' as any,
        request: undefined as any,
      },
    };
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_IN_APP_NOTIFICATION,
    });
    expect(state.showInAppNotification).toBe(false);
    expect(state.inAppNotificationData).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS/RESET BOTTOM NOTIFICATION MODAL
// ---------------------------------------------------------------------------

describe('SHOW_BOTTOM_NOTIFICATION_MODAL', () => {
  it('shows the modal with config', () => {
    const config = {title: 'Test', message: 'Body', type: 'info'} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_BOTTOM_NOTIFICATION_MODAL,
      payload: config,
    });
    expect(state.showBottomNotificationModal).toBe(true);
    expect(state.bottomNotificationModalConfig).toEqual(config);
  });
});

describe('DISMISS_BOTTOM_NOTIFICATION_MODAL', () => {
  it('dismisses the modal', () => {
    const base: AppState = {...freshState(), showBottomNotificationModal: true};
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_BOTTOM_NOTIFICATION_MODAL,
    });
    expect(state.showBottomNotificationModal).toBe(false);
  });
});

describe('RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG', () => {
  it('clears the modal config', () => {
    const base: AppState = {
      ...freshState(),
      bottomNotificationModalConfig: {title: 'Test'} as any,
    };
    const state = appReducer(base, {
      type: AppActionTypes.RESET_BOTTOM_NOTIFICATION_MODAL_CONFIG,
    });
    expect(state.bottomNotificationModalConfig).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS CHAIN SELECTOR MODAL
// ---------------------------------------------------------------------------

describe('SHOW_CHAIN_SELECTOR_MODAL / DISMISS_CHAIN_SELECTOR_MODAL / CLEAR_CHAIN_SELECTOR_MODAL_OPTIONS', () => {
  it('shows chain selector modal with config', () => {
    const config = {onDismiss: jest.fn()} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_CHAIN_SELECTOR_MODAL,
      payload: config,
    });
    expect(state.showChainSelectorModal).toBe(true);
    expect(state.chainSelectorModalConfig).toEqual(config);
  });

  it('dismisses chain selector modal', () => {
    const base: AppState = {...freshState(), showChainSelectorModal: true};
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_CHAIN_SELECTOR_MODAL,
    });
    expect(state.showChainSelectorModal).toBe(false);
  });

  it('clears chain selector modal options', () => {
    const base: AppState = {
      ...freshState(),
      chainSelectorModalConfig: {onDismiss: jest.fn()} as any,
    };
    const state = appReducer(base, {
      type: AppActionTypes.CLEAR_CHAIN_SELECTOR_MODAL_OPTIONS,
    });
    expect(state.chainSelectorModalConfig).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SET_COLOR_SCHEME
// ---------------------------------------------------------------------------

describe('SET_COLOR_SCHEME', () => {
  it('sets colorScheme to dark', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_COLOR_SCHEME,
      payload: 'dark',
    });
    expect(state.colorScheme).toBe('dark');
  });

  it('sets colorScheme to light', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_COLOR_SCHEME,
      payload: 'light',
    });
    expect(state.colorScheme).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_GENERATE_APP_IDENTITY
// ---------------------------------------------------------------------------

describe('SUCCESS_GENERATE_APP_IDENTITY', () => {
  it('sets identity for the given network', () => {
    const identity = {priv: 'priv-key', pub: 'pub-key', sin: 'sin-val'};
    const state = appReducer(freshState(), {
      type: AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY,
      payload: {network: Network.mainnet, identity},
    });
    expect(state.identity[Network.mainnet]).toEqual(identity);
  });

  it('does not overwrite identity for other networks', () => {
    const base = freshState();
    const state = appReducer(base, {
      type: AppActionTypes.SUCCESS_GENERATE_APP_IDENTITY,
      payload: {
        network: Network.testnet,
        identity: {priv: 'p', pub: 'q', sin: 'r'},
      },
    });
    expect(state.identity[Network.mainnet]).toEqual(
      base.identity[Network.mainnet],
    );
  });
});

// ---------------------------------------------------------------------------
// SET_NOTIFICATIONS_ACCEPTED / SET_CONFIRMED_TX_ACCEPTED / SET_ANNOUNCEMENTS_ACCEPTED
// ---------------------------------------------------------------------------

describe('notification preference actions', () => {
  it('SET_NOTIFICATIONS_ACCEPTED sets notificationsAccepted', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_NOTIFICATIONS_ACCEPTED,
      payload: true,
    });
    expect(state.notificationsAccepted).toBe(true);
  });

  it('SET_CONFIRMED_TX_ACCEPTED sets confirmedTxAccepted', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_CONFIRMED_TX_ACCEPTED,
      payload: true,
    });
    expect(state.confirmedTxAccepted).toBe(true);
  });

  it('SET_ANNOUNCEMENTS_ACCEPTED sets announcementsAccepted', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_ANNOUNCEMENTS_ACCEPTED,
      payload: true,
    });
    expect(state.announcementsAccepted).toBe(true);
  });

  it('SET_EMAIL_NOTIFICATIONS_ACCEPTED sets emailNotifications', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_EMAIL_NOTIFICATIONS_ACCEPTED,
      payload: {accepted: true, email: 'test@example.com'},
    });
    expect(state.emailNotifications.accepted).toBe(true);
    expect(state.emailNotifications.email).toBe('test@example.com');
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS ONBOARDING FINISH MODAL
// ---------------------------------------------------------------------------

describe('SHOW_ONBOARDING_FINISH_MODAL / DISMISS_ONBOARDING_FINISH_MODAL', () => {
  it('shows the onboarding finish modal', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_ONBOARDING_FINISH_MODAL,
    });
    expect(state.showOnboardingFinishModal).toBe(true);
  });

  it('dismisses the onboarding finish modal', () => {
    const base: AppState = {...freshState(), showOnboardingFinishModal: true};
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_ONBOARDING_FINISH_MODAL,
    });
    expect(state.showOnboardingFinishModal).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SET_DEFAULT_LANGUAGE
// ---------------------------------------------------------------------------

describe('SET_DEFAULT_LANGUAGE', () => {
  it('sets defaultLanguage', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_DEFAULT_LANGUAGE,
      payload: 'fr',
    });
    expect(state.defaultLanguage).toBe('fr');
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS/RESET DECRYPT PASSWORD MODAL
// ---------------------------------------------------------------------------

describe('SHOW_DECRYPT_PASSWORD_MODAL / DISMISS / RESET', () => {
  it('shows the modal with config', () => {
    const config = {onSubmitHandler: jest.fn()} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_DECRYPT_PASSWORD_MODAL,
      payload: config,
    });
    expect(state.showDecryptPasswordModal).toBe(true);
    expect(state.decryptPasswordConfig).toEqual(config);
  });

  it('dismisses the modal', () => {
    const base: AppState = {...freshState(), showDecryptPasswordModal: true};
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_DECRYPT_PASSWORD_MODAL,
    });
    expect(state.showDecryptPasswordModal).toBe(false);
  });

  it('resets the config', () => {
    const base: AppState = {
      ...freshState(),
      decryptPasswordConfig: {onSubmitHandler: jest.fn()} as any,
    };
    const state = appReducer(base, {
      type: AppActionTypes.RESET_DECRYPT_PASSWORD_CONFIG,
    });
    expect(state.decryptPasswordConfig).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS PIN MODAL & PIN FLAGS
// ---------------------------------------------------------------------------

describe('PIN modal and flags', () => {
  it('SHOW_PIN_MODAL sets showPinModal=true and pinModalConfig', () => {
    const config = {type: 'set-pin'} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_PIN_MODAL,
      payload: config,
    });
    expect(state.showPinModal).toBe(true);
    expect(state.pinModalConfig).toEqual(config);
  });

  it('DISMISS_PIN_MODAL sets showPinModal=false and clears config', () => {
    const base: AppState = {
      ...freshState(),
      showPinModal: true,
      pinModalConfig: {type: 'set-pin'} as any,
    };
    const state = appReducer(base, {type: AppActionTypes.DISMISS_PIN_MODAL});
    expect(state.showPinModal).toBe(false);
    expect(state.pinModalConfig).toBeUndefined();
  });

  it('PIN_LOCK_ACTIVE sets pinLockActive', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.PIN_LOCK_ACTIVE,
      payload: true,
    });
    expect(state.pinLockActive).toBe(true);
  });

  it('CURRENT_PIN sets currentPin', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.CURRENT_PIN,
      payload: '1234',
    });
    expect(state.currentPin).toBe('1234');
  });

  it('CURRENT_SALT sets currentSalt', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.CURRENT_SALT,
      payload: 'abc-salt',
    });
    expect(state.currentSalt).toBe('abc-salt');
  });

  it('PIN_BANNED_UNTIL sets pinBannedUntil', () => {
    const ts = Date.now() + 60000;
    const state = appReducer(freshState(), {
      type: AppActionTypes.PIN_BANNED_UNTIL,
      payload: ts,
    });
    expect(state.pinBannedUntil).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// SHOW_BLUR / SHOW_PORTFOLIO_VALUE / TOGGLE_HIDE_ALL_BALANCES
// ---------------------------------------------------------------------------

describe('blur and portfolio flags', () => {
  it('SHOW_BLUR sets showBlur', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_BLUR,
      payload: true,
    });
    expect(state.showBlur).toBe(true);
  });

  it('SHOW_PORTFOLIO_VALUE sets showPortfolioValue', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_PORTFOLIO_VALUE,
      payload: false,
    });
    expect(state.showPortfolioValue).toBe(false);
  });

  it('TOGGLE_HIDE_ALL_BALANCES with explicit payload sets value', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.TOGGLE_HIDE_ALL_BALANCES,
      payload: true,
    });
    expect(state.hideAllBalances).toBe(true);
  });

  it('TOGGLE_HIDE_ALL_BALANCES without payload toggles value', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.TOGGLE_HIDE_ALL_BALANCES,
    });
    // default is false, so toggling gives true
    expect(state.hideAllBalances).toBe(true);
  });

  it('TOGGLE_HIDE_ALL_BALANCES toggles again from true to false', () => {
    const base: AppState = {...freshState(), hideAllBalances: true};
    const state = appReducer(base, {
      type: AppActionTypes.TOGGLE_HIDE_ALL_BALANCES,
    });
    expect(state.hideAllBalances).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BRAZE_INITIALIZED / BRAZE_CONTENT_CARDS_FETCHED / SET_BRAZE_EID
// ---------------------------------------------------------------------------

describe('Braze actions', () => {
  it('BRAZE_INITIALIZED sets brazeContentCardSubscription', () => {
    const sub = {remove: jest.fn()} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.BRAZE_INITIALIZED,
      payload: {contentCardSubscription: sub},
    });
    expect(state.brazeContentCardSubscription).toEqual(sub);
  });

  it('BRAZE_CONTENT_CARDS_FETCHED updates brazeContentCards when non-empty', () => {
    const cards = [{id: 'card-1'} as any];
    const state = appReducer(freshState(), {
      type: AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED,
      payload: {contentCards: cards},
    });
    expect(state.brazeContentCards).toEqual(cards);
  });

  it('BRAZE_CONTENT_CARDS_FETCHED returns same state when both old and new are empty', () => {
    const base = freshState(); // brazeContentCards: []
    const next = appReducer(base, {
      type: AppActionTypes.BRAZE_CONTENT_CARDS_FETCHED,
      payload: {contentCards: []},
    });
    expect(next).toBe(base);
  });

  it('SET_BRAZE_EID sets brazeEid', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_BRAZE_EID,
      payload: 'eid-xyz',
    });
    expect(state.brazeEid).toBe('eid-xyz');
  });
});

// ---------------------------------------------------------------------------
// SHOW/DISMISS BIOMETRIC MODAL & BIOMETRIC FLAGS
// ---------------------------------------------------------------------------

describe('BIOMETRIC_MODAL actions', () => {
  it('SHOW_BIOMETRIC_MODAL sets showBiometricModal=true and config', () => {
    const config = {onSubmit: jest.fn()} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_BIOMETRIC_MODAL,
      payload: config,
    });
    expect(state.showBiometricModal).toBe(true);
    expect(state.biometricModalConfig).toEqual(config);
  });

  it('DISMISS_BIOMETRIC_MODAL sets showBiometricModal=false and clears config', () => {
    const base: AppState = {
      ...freshState(),
      showBiometricModal: true,
      biometricModalConfig: {onSubmit: jest.fn()} as any,
    };
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_BIOMETRIC_MODAL,
    });
    expect(state.showBiometricModal).toBe(false);
    expect(state.biometricModalConfig).toBeUndefined();
  });

  it('BIOMETRIC_LOCK_ACTIVE sets biometricLockActive', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.BIOMETRIC_LOCK_ACTIVE,
      payload: true,
    });
    expect(state.biometricLockActive).toBe(true);
  });

  it('LOCK_AUTHORIZED_UNTIL sets lockAuthorizedUntil', () => {
    const ts = Date.now() + 5000;
    const state = appReducer(freshState(), {
      type: AppActionTypes.LOCK_AUTHORIZED_UNTIL,
      payload: ts,
    });
    expect(state.lockAuthorizedUntil).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// SET_HOME_CAROUSEL_CONFIG / SET_HOME_CAROUSEL_LAYOUT_TYPE
// ---------------------------------------------------------------------------

describe('home carousel config', () => {
  it('SET_HOME_CAROUSEL_CONFIG replaces config when array is provided', () => {
    const config = [
      {id: 'explore', show: true},
      {id: 'links', show: true},
    ] as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_HOME_CAROUSEL_CONFIG,
      payload: config,
    });
    expect(state.homeCarouselConfig).toEqual(config);
  });

  it('SET_HOME_CAROUSEL_CONFIG appends a single item', () => {
    const item = {id: 'links', show: true} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_HOME_CAROUSEL_CONFIG,
      payload: item,
    });
    expect(state.homeCarouselConfig).toHaveLength(1);
    expect(state.homeCarouselConfig[0]).toEqual(item);
  });

  it('SET_HOME_CAROUSEL_LAYOUT_TYPE sets the layout type', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_HOME_CAROUSEL_LAYOUT_TYPE,
      payload: 'listView',
    });
    expect(state.homeCarouselLayoutType).toBe('listView');
  });
});

// ---------------------------------------------------------------------------
// UPDATE_SETTINGS_LIST_CONFIG
// ---------------------------------------------------------------------------

describe('UPDATE_SETTINGS_LIST_CONFIG', () => {
  it('adds the item when not already in the list', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.UPDATE_SETTINGS_LIST_CONFIG,
      payload: 'advancedSettings' as any,
    });
    expect(state.settingsListConfig).toContain('advancedSettings');
  });

  it('removes the item when already present', () => {
    const base: AppState = {
      ...freshState(),
      settingsListConfig: ['advancedSettings' as any],
    };
    const state = appReducer(base, {
      type: AppActionTypes.UPDATE_SETTINGS_LIST_CONFIG,
      payload: 'advancedSettings' as any,
    });
    expect(state.settingsListConfig).not.toContain('advancedSettings');
  });
});

// ---------------------------------------------------------------------------
// ADD_ALT_CURRENCIES_LIST / SET_DEFAULT_ALT_CURRENCY
// ---------------------------------------------------------------------------

describe('alt currency actions', () => {
  it('ADD_ALT_CURRENCIES_LIST sets the list', () => {
    const list = [{isoCode: 'EUR', name: 'Euro'}];
    const state = appReducer(freshState(), {
      type: AppActionTypes.ADD_ALT_CURRENCIES_LIST,
      altCurrencyList: list,
    });
    expect(state.altCurrencyList).toEqual(list);
  });

  it('SET_DEFAULT_ALT_CURRENCY updates defaultAltCurrency', () => {
    const currency = {isoCode: 'GBP', name: 'British Pound'};
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_DEFAULT_ALT_CURRENCY,
      defaultAltCurrency: currency,
    });
    expect(state.defaultAltCurrency).toEqual(currency);
  });

  it('SET_DEFAULT_ALT_CURRENCY prepends to recentDefaultAltCurrency up to 3', () => {
    const currencies = [
      {isoCode: 'EUR', name: 'Euro'},
      {isoCode: 'GBP', name: 'British Pound'},
      {isoCode: 'JPY', name: 'Japanese Yen'},
    ];

    let state = freshState();
    for (const c of currencies) {
      state = appReducer(state, {
        type: AppActionTypes.SET_DEFAULT_ALT_CURRENCY,
        defaultAltCurrency: c,
      });
    }

    // Add a 4th — should still only have 3 (uniqBy + slice 0,3)
    state = appReducer(state, {
      type: AppActionTypes.SET_DEFAULT_ALT_CURRENCY,
      defaultAltCurrency: {isoCode: 'CAD', name: 'Canadian Dollar'},
    });

    expect(state.recentDefaultAltCurrency).toHaveLength(3);
    expect(state.recentDefaultAltCurrency[0].isoCode).toBe('CAD');
  });

  it('SET_DEFAULT_ALT_CURRENCY deduplicates the same iso code in recentDefaultAltCurrency', () => {
    const base: AppState = {
      ...freshState(),
      recentDefaultAltCurrency: [{isoCode: 'EUR', name: 'Euro'}],
    };
    const state = appReducer(base, {
      type: AppActionTypes.SET_DEFAULT_ALT_CURRENCY,
      defaultAltCurrency: {isoCode: 'EUR', name: 'Euro'},
    });
    expect(state.recentDefaultAltCurrency).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// SET_DEFAULT_CHAIN_FILTER_OPTION / SET_LOCAL_CHAIN_FILTER_OPTION
// ---------------------------------------------------------------------------

describe('chain filter options', () => {
  it('SET_DEFAULT_CHAIN_FILTER_OPTION sets selectedChainFilterOption', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_DEFAULT_CHAIN_FILTER_OPTION,
      selectedChainFilterOption: 'eth' as any,
    });
    expect(state.selectedChainFilterOption).toBe('eth');
  });

  it('SET_DEFAULT_CHAIN_FILTER_OPTION with undefined clears selectedChainFilterOption', () => {
    const base: AppState = {
      ...freshState(),
      selectedChainFilterOption: 'eth' as any,
    };
    const state = appReducer(base, {
      type: AppActionTypes.SET_DEFAULT_CHAIN_FILTER_OPTION,
      selectedChainFilterOption: undefined,
    });
    expect(state.selectedChainFilterOption).toBeUndefined();
  });

  it('SET_LOCAL_CHAIN_FILTER_OPTION sets selectedLocalChainFilterOption', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_LOCAL_CHAIN_FILTER_OPTION,
      selectedLocalChainFilterOption: 'btc' as any,
    });
    expect(state.selectedLocalChainFilterOption).toBe('btc');
  });

  it('SET_LOCAL_ASSETS_DROPDOWN sets selectedLocalAssetsDropdown', () => {
    const dropdown = {label: 'All', value: undefined} as any;
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_LOCAL_ASSETS_DROPDOWN,
      selectedLocalAssetsDropdown: dropdown,
    });
    expect(state.selectedLocalAssetsDropdown).toEqual(dropdown);
  });
});

// ---------------------------------------------------------------------------
// Migration flags
// ---------------------------------------------------------------------------

describe('migration flags', () => {
  it('SET_MIGRATION_COMPLETE sets migrationComplete=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_MIGRATION_COMPLETE,
    });
    expect(state.migrationComplete).toBe(true);
  });

  it('SET_EDDSA_KEY_MIGRATION_COMPLETE sets EDDSAKeyMigrationCompleteV2=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_EDDSA_KEY_MIGRATION_COMPLETE,
    });
    expect(state.EDDSAKeyMigrationCompleteV2).toBe(true);
  });

  it('SET_KEY_MIGRATION_FAILURE sets keyMigrationFailure=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_KEY_MIGRATION_FAILURE,
    });
    expect(state.keyMigrationFailure).toBe(true);
  });

  it('SET_MIGRATION_MMKV_STORAGE_COMPLETE sets migrationMMKVStorageComplete=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_MIGRATION_MMKV_STORAGE_COMPLETE,
    });
    expect(state.migrationMMKVStorageComplete).toBe(true);
  });

  it('SET_KEY_MIGRATION_MMKV_STORAGE_FAILURE sets migrationMMKVStorageFailure=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_KEY_MIGRATION_MMKV_STORAGE_FAILURE,
    });
    expect(state.migrationMMKVStorageFailure).toBe(true);
  });

  it('SET_SHOW_KEY_MIGRATION_FAILURE_MODAL sets showKeyMigrationFailureModal', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_SHOW_KEY_MIGRATION_FAILURE_MODAL,
      payload: true,
    });
    expect(state.showKeyMigrationFailureModal).toBe(true);
  });

  it('SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN sets flag=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_KEY_MIGRATION_FAILURE_MODAL_HAS_BEEN_SHOWN,
    });
    expect(state.keyMigrationFailureModalHasBeenShown).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ACTIVE_MODAL_UPDATED / FAILED_APP_INIT / CHECKING_BIOMETRIC_FOR_SENDING
// ---------------------------------------------------------------------------

describe('misc flags', () => {
  it('ACTIVE_MODAL_UPDATED sets activeModalId', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.ACTIVE_MODAL_UPDATED,
      payload: 'pin',
    });
    expect(state.activeModalId).toBe('pin');
  });

  it('ACTIVE_MODAL_UPDATED can clear activeModalId to null', () => {
    const base: AppState = {...freshState(), activeModalId: 'pin'};
    const state = appReducer(base, {
      type: AppActionTypes.ACTIVE_MODAL_UPDATED,
      payload: null,
    });
    expect(state.activeModalId).toBeNull();
  });

  it('FAILED_APP_INIT sets failedAppInit', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.FAILED_APP_INIT,
      payload: true,
    });
    expect(state.failedAppInit).toBe(true);
  });

  it('CHECKING_BIOMETRIC_FOR_SENDING sets the flag', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.CHECKING_BIOMETRIC_FOR_SENDING,
      payload: true,
    });
    expect(state.checkingBiometricForSending).toBe(true);
  });

  it('SET_HAS_VIEWED_ZENLEDGER_WARNING sets hasViewedZenLedgerWarning=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_HAS_VIEWED_ZENLEDGER_WARNING,
    });
    expect(state.hasViewedZenLedgerWarning).toBe(true);
  });

  it('SET_HAS_VIEWED_BILLS_TAB sets hasViewedBillsTab=true', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SET_HAS_VIEWED_BILLS_TAB,
    });
    expect(state.hasViewedBillsTab).toBe(true);
  });

  it('USER_FEEDBACK sets userFeedback', () => {
    const feedback = {
      time: 1234,
      version: '1.0',
      sent: true,
      rate: 'love' as any,
    };
    const state = appReducer(freshState(), {
      type: AppActionTypes.USER_FEEDBACK,
      payload: feedback,
    });
    expect(state.userFeedback).toEqual(feedback);
  });

  it('IN_APP_BROWSER_OPEN sets inAppBrowserOpen', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.IN_APP_BROWSER_OPEN,
      payload: true,
    });
    expect(state.inAppBrowserOpen).toBe(true);
  });

  it('SHOW_ARCHAX_BANNER sets showArchaxBanner', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.SHOW_ARCHAX_BANNER,
      payload: true,
    });
    expect(state.showArchaxBanner).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DISMISS_MARKETING_CONTENT_CARD
// ---------------------------------------------------------------------------

describe('DISMISS_MARKETING_CONTENT_CARD', () => {
  it('adds the card ID to dismissedMarketingCardIds', () => {
    const state = appReducer(freshState(), {
      type: AppActionTypes.DISMISS_MARKETING_CONTENT_CARD,
      payload: 'card-abc',
    });
    expect(state.dismissedMarketingCardIds).toContain('card-abc');
  });

  it('does not duplicate a card ID that is already dismissed', () => {
    const base: AppState = {
      ...freshState(),
      dismissedMarketingCardIds: ['card-abc'],
    };
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_MARKETING_CONTENT_CARD,
      payload: 'card-abc',
    });
    // returns same state reference since it's already there
    expect(state).toBe(base);
    expect(state.dismissedMarketingCardIds).toHaveLength(1);
  });

  it('returns same state if payload is falsy', () => {
    const base = freshState();
    const state = appReducer(base, {
      type: AppActionTypes.DISMISS_MARKETING_CONTENT_CARD,
      payload: '' as any,
    });
    expect(state).toBe(base);
  });

  it('can accumulate multiple different card IDs', () => {
    let state = freshState();
    state = appReducer(state, {
      type: AppActionTypes.DISMISS_MARKETING_CONTENT_CARD,
      payload: 'card-1',
    });
    state = appReducer(state, {
      type: AppActionTypes.DISMISS_MARKETING_CONTENT_CARD,
      payload: 'card-2',
    });
    expect(state.dismissedMarketingCardIds).toEqual(['card-1', 'card-2']);
  });
});
