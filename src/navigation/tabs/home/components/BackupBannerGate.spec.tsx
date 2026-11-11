import React from 'react';
import {Provider} from 'react-redux';
import {act, cleanup, fireEvent, render} from '@test/render';
import configureTestStore from '@test/store';
import BackupBannerGate, {BACKUP_NUDGE_DELAY_MS} from './BackupBannerGate';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({navigate: mockNavigate}),
}));

jest.mock('../../../../store/app', () => ({
  AppActions: jest.requireActual('../../../../store/app/app.actions'),
  AppEffects: {
    requestNotificationsPermissions: jest.fn(),
    setNotifications: jest.fn((accepted: boolean) => ({
      type: 'TEST/SET_NOTIFICATIONS',
      payload: accepted,
    })),
  },
}));

jest.mock('../../../../components/modal/transact-menu/TransactMenu', () => ({
  isTransactMenuOpen: jest.fn(() => false),
}));

const mockAppEffects = jest.requireMock('../../../../store/app').AppEffects;
const mockIsTransactMenuOpen = jest.requireMock(
  '../../../../components/modal/transact-menu/TransactMenu',
).isTransactMenuOpen as jest.Mock;

const BANNER_TITLE = 'Back up your recovery phrase';
const OTHER_SHEET_TITLE = 'Back up your recovery phrase first';
const BANNER_DESCRIPTION = 'Needed before you can buy, send or receive.';

const buildStore = ({
  onboardingKeyStatus = 'idle',
  notificationsInteractionDone = false,
  backupNudgeShown = false,
  backupComplete = false,
  wallets = [{isComplete: () => true}],
}: {
  onboardingKeyStatus?: string;
  notificationsInteractionDone?: boolean;
  backupNudgeShown?: boolean;
  backupComplete?: boolean;
  wallets?: Array<{isComplete: () => boolean; pendingTssSession?: boolean}>;
} = {}) =>
  configureTestStore({
    APP: {
      onboardingKeyStatus,
      notificationsInteractionDone,
      backupNudgeShown,
      showBottomNotificationModal: false,
    },
    WALLET: {
      keys: {
        'key-1': {
          id: 'key-1',
          backupComplete,
          isReadOnly: false,
          properties: {mnemonic: 'mnemonic'},
          wallets,
        },
      },
    },
  });

const renderGate = (store: ReturnType<typeof buildStore>, active = true) =>
  render(
    <Provider store={store}>
      <BackupBannerGate active={active} />
    </Provider>,
  );

const flushPromises = () => act(() => Promise.resolve());

describe('BackupBannerGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAppEffects.requestNotificationsPermissions.mockResolvedValue(true);
    mockIsTransactMenuOpen.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('asks for notifications, then nudges once, then keeps the banner', async () => {
    const store = buildStore();
    const {queryByText, getByText} = renderGate(store);

    await flushPromises();
    expect(
      mockAppEffects.requestNotificationsPermissions,
    ).toHaveBeenCalledTimes(1);
    expect(store.getState().APP.notificationsInteractionDone).toBe(true);
    expect(store.getState().APP.showBottomNotificationModal).toBe(false);
    expect(queryByText(BANNER_DESCRIPTION)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    const {APP} = store.getState();
    expect(APP.backupNudgeShown).toBe(true);
    expect(APP.showBottomNotificationModal).toBe(true);
    expect(APP.bottomNotificationModalConfig?.title).toBe(BANNER_TITLE);

    fireEvent.press(getByText('Back Up Now'));
    expect(mockNavigate).toHaveBeenCalledWith('BackupOnboarding', {
      keyId: 'key-1',
      context: 'home',
    });
  });

  it('only turns on the banner when another sheet is open as the nudge is due', () => {
    const store = buildStore({notificationsInteractionDone: true});
    const {getByText} = renderGate(store);

    act(() => {
      store.dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: OTHER_SHEET_TITLE,
          message: '',
          enableBackdropDismiss: true,
          actions: [],
        }),
      );
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    const {APP} = store.getState();
    expect(APP.backupNudgeShown).toBe(true);
    expect(APP.bottomNotificationModalConfig?.title).toBe(OTHER_SHEET_TITLE);
    expect(getByText(BANNER_DESCRIPTION)).toBeTruthy();
  });

  it('only turns on the banner when the transact menu is open as the nudge is due', () => {
    mockIsTransactMenuOpen.mockReturnValue(true);
    const store = buildStore({notificationsInteractionDone: true});
    const {getByText} = renderGate(store);

    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(store.getState().APP.backupNudgeShown).toBe(true);
    expect(store.getState().APP.showBottomNotificationModal).toBe(false);
    expect(getByText(BANNER_DESCRIPTION)).toBeTruthy();
  });

  it('turns on the banner when Home loses focus before the nudge', () => {
    const store = buildStore({notificationsInteractionDone: true});
    const {rerender} = renderGate(store);

    rerender(
      <Provider store={store}>
        <BackupBannerGate active={false} />
      </Provider>,
    );
    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(store.getState().APP.backupNudgeShown).toBe(true);
    expect(store.getState().APP.showBottomNotificationModal).toBe(false);
  });

  it('waits until the key is ready and Home is in front', async () => {
    const creatingStore = buildStore({onboardingKeyStatus: 'creating'});
    renderGate(creatingStore);
    await flushPromises();
    cleanup();
    renderGate(buildStore(), false);
    await flushPromises();

    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(
      mockAppEffects.requestNotificationsPermissions,
    ).not.toHaveBeenCalled();
    expect(creatingStore.getState().APP.backupNudgeShown).toBe(false);
  });

  it.each([
    ['has no wallets', []],
    ['has an incomplete wallet', [{isComplete: (): boolean => false}]],
    [
      'has a pending shared wallet',
      [{isComplete: (): boolean => true, pendingTssSession: true}],
    ],
  ])('does not prompt when the key %s', async (_condition, wallets) => {
    const store = buildStore({wallets});
    const {queryByText} = renderGate(store);

    await flushPromises();
    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(
      mockAppEffects.requestNotificationsPermissions,
    ).not.toHaveBeenCalled();
    expect(store.getState().APP.backupNudgeShown).toBe(false);
    expect(queryByText(BANNER_DESCRIPTION)).toBeNull();
  });

  it('does not nudge or show the banner once the phrase is backed up', () => {
    const store = buildStore({
      notificationsInteractionDone: true,
      backupNudgeShown: true,
      backupComplete: true,
    });
    const {queryByText} = renderGate(store);

    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(queryByText(BANNER_DESCRIPTION)).toBeNull();
    expect(store.getState().APP.showBottomNotificationModal).toBe(false);
  });

  it('shows the banner without nudging again after the nudge was shown', () => {
    const store = buildStore({
      notificationsInteractionDone: true,
      backupNudgeShown: true,
    });
    const {getByText} = renderGate(store);

    act(() => {
      jest.advanceTimersByTime(BACKUP_NUDGE_DELAY_MS);
    });

    expect(getByText(BANNER_DESCRIPTION)).toBeTruthy();
    expect(store.getState().APP.showBottomNotificationModal).toBe(false);
  });
});
