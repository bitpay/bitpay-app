import React from 'react';
import {NativeModules} from 'react-native';
import {StackActions} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {act, fireEvent, render} from '@test/render';
import configureTestStore from '@test/store';
import {AppActions} from '../../../store/app';
import {appReduxPersistBlackList} from '../../../store/app/app.reducer';
import {createPin, hashPinLegacy} from '../../../utils/pin';
import PinModal from './PinModal';

const mockNavigationDispatch = jest.fn();

jest.mock('../../../Root', () => ({
  navigationRef: {
    navigate: jest.fn(),
    dispatch: (action: unknown) => mockNavigationDispatch(action),
  },
}));

jest.mock('../base/sheet/SheetModal', () => ({
  __esModule: true,
  default: ({
    isVisible,
    children,
  }: {
    isVisible: boolean;
    children: React.ReactNode;
  }) => (isVisible ? children : null),
}));

const CORRECT_PIN = '8264';
const WRONG_PIN = '5173';
const {hashedPin, salt} = createPin(CORRECT_PIN.split(''));

let uptime: number | string;
const getRelativeTime = jest.fn(() => Promise.resolve(String(uptime)));

type TestStore = ReturnType<typeof configureTestStore>;

const freshAppState = () => configureTestStore({}).getState().APP;

const createStore = (app: Record<string, unknown> = {}): TestStore => {
  const store = configureTestStore({APP: {...freshAppState(), ...app}});
  store.dispatch(AppActions.currentPin(hashedPin));
  store.dispatch(AppActions.currentSalt(salt));
  store.dispatch(AppActions.showPinModal({type: 'check'}));
  return store;
};

// Simulates a relaunch: only the persisted part of APP survives.
const relaunch = (store: TestStore): TestStore => {
  const persisted = {...store.getState().APP} as Record<string, unknown>;
  appReduxPersistBlackList.forEach(key => delete persisted[key]);
  return createStore(persisted);
};

const mount = (store: TestStore) =>
  render(
    <Provider store={store}>
      <PinModal />
    </Provider>,
  );

const flush = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      jest.advanceTimersByTime(0);
      await Promise.resolve();
    });
  }
};

const enterPin = async (screen: ReturnType<typeof mount>, pin: string) => {
  for (const digit of pin.split('')) {
    fireEvent.press(screen.getByText(digit));
  }
  await flush();
};

// The delete key is the last key on the keypad.
const longPressDelete = (screen: ReturnType<typeof mount>) => {
  const keys = screen.container.findAll(
    node => typeof node.props.onLongPress === 'function',
  );
  fireEvent(keys[keys.length - 1], 'longPress');
};

const app = (store: TestStore) => store.getState().APP;

describe('PinModal', () => {
  const originalTimer = NativeModules.Timer;

  beforeEach(() => {
    jest.useFakeTimers();
    uptime = 1000;
    getRelativeTime.mockClear();
    getRelativeTime.mockImplementation(() => Promise.resolve(String(uptime)));
    NativeModules.Timer = {getRelativeTime};
  });

  afterEach(() => {
    NativeModules.Timer = originalTimer;
    jest.useRealTimers();
  });

  it('bans for one minute after three wrong PINs', async () => {
    const store = createStore();
    const screen = mount(store);

    await enterPin(screen, WRONG_PIN);
    await enterPin(screen, WRONG_PIN);
    expect(app(store).pinFailedAttempts).toBe(2);
    expect(app(store).pinBannedUntil).toBeUndefined();

    await enterPin(screen, WRONG_PIN);
    expect(app(store).pinFailedAttempts).toBe(3);
    expect(app(store).pinBannedUntil).toBe(1000 + 60);

    // keypad is ignored while banned
    await enterPin(screen, CORRECT_PIN);
    expect(app(store).pinFailedAttempts).toBe(3);
    expect(app(store).showPinModal).toBe(true);
    screen.unmount();
  });

  it('records the attempt and the ban before the timer answers', async () => {
    const store = createStore();
    const screen = mount(store);
    await enterPin(screen, WRONG_PIN);
    await enterPin(screen, WRONG_PIN);

    getRelativeTime.mockImplementation(() => new Promise(() => {}));
    await enterPin(screen, WRONG_PIN);

    expect(app(store).pinFailedAttempts).toBe(3);
    expect(app(store).pinBannedUntil).toBeDefined();
    screen.unmount();
  });

  it('does not reset the count on a long-press of delete', async () => {
    const store = createStore();
    const screen = mount(store);

    await enterPin(screen, WRONG_PIN);
    await enterPin(screen, WRONG_PIN);
    longPressDelete(screen);
    await flush();
    expect(app(store).pinFailedAttempts).toBe(2);

    await enterPin(screen, WRONG_PIN);
    expect(app(store).pinFailedAttempts).toBe(3);
    expect(app(store).pinBannedUntil).toBe(1000 + 60);
    screen.unmount();
  });

  it('keeps the count across a relaunch', async () => {
    const store = createStore();
    const first = mount(store);
    await enterPin(first, WRONG_PIN);
    await enterPin(first, WRONG_PIN);
    first.unmount();

    const relaunched = relaunch(store);
    const second = mount(relaunched);
    expect(app(relaunched).pinFailedAttempts).toBe(2);

    await enterPin(second, WRONG_PIN);
    expect(app(relaunched).pinFailedAttempts).toBe(3);
    expect(app(relaunched).pinBannedUntil).toBe(1000 + 60);
    second.unmount();
  });

  it('keeps a ban running across a relaunch', async () => {
    const store = createStore();
    const first = mount(store);
    for (let i = 0; i < 3; i++) {
      await enterPin(first, WRONG_PIN);
    }
    first.unmount();

    uptime = 1030;
    const relaunched = relaunch(store);
    const second = mount(relaunched);
    await flush();
    expect(app(relaunched).pinBannedUntil).toBe(1060);

    await enterPin(second, CORRECT_PIN);
    expect(app(relaunched).showPinModal).toBe(true);
    second.unmount();
  });

  it('escalates the ban: 60s, then 300s, then 3600s', async () => {
    const store = createStore();
    const screen = mount(store);

    for (const seconds of [60, 300, 3600, 3600]) {
      const start = Number(uptime);
      for (let i = 0; i < 3; i++) {
        await enterPin(screen, WRONG_PIN);
      }
      expect(app(store).pinBannedUntil).toBe(start + seconds);

      uptime = start + seconds - 1;
      await flush(1000);
      expect(app(store).pinBannedUntil).toBe(start + seconds);

      uptime = start + seconds;
      await flush(1000);
      expect(app(store).pinBannedUntil).toBeUndefined();
    }
    expect(app(store).pinFailedAttempts).toBe(12);
    screen.unmount();
  });

  it('resets the count on a correct PIN', async () => {
    const store = createStore();
    const screen = mount(store);

    await enterPin(screen, WRONG_PIN);
    await enterPin(screen, WRONG_PIN);
    expect(app(store).pinFailedAttempts).toBe(2);

    await enterPin(screen, CORRECT_PIN);
    expect(app(store).pinFailedAttempts).toBe(0);
    expect(app(store).showPinModal).toBe(false);
    screen.unmount();
  });

  it('keeps the deadline when the timer returns -1', async () => {
    const store = createStore();
    const screen = mount(store);
    for (let i = 0; i < 3; i++) {
      await enterPin(screen, WRONG_PIN);
    }
    expect(app(store).pinBannedUntil).toBe(1060);

    uptime = '-1';
    await flush(5000);
    expect(app(store).pinBannedUntil).toBe(1060);

    uptime = 1059;
    await flush(1000);
    expect(app(store).pinBannedUntil).toBe(1060);

    uptime = 1060;
    await flush(1000);
    expect(app(store).pinBannedUntil).toBeUndefined();
    screen.unmount();
  });

  it('clamps a deadline from before a reboot to the current ban length', async () => {
    uptime = 10;
    const store = createStore({pinFailedAttempts: 6, pinBannedUntil: 500000});
    const screen = mount(store);
    await flush();
    expect(app(store).pinBannedUntil).toBe(10 + 300);
    screen.unmount();
  });

  it.each(['set', 'check'] as const)(
    'reports a cancelled backup PIN %s',
    type => {
      const onClose = jest.fn();
      const store = createStore();
      store.dispatch(AppActions.showPinModal({type, onClose}));
      const screen = mount(store);

      fireEvent.press(screen.getByLabelText('Back'));

      expect(onClose).toHaveBeenCalledWith(false);
      expect(app(store).showPinModal).toBe(false);
      screen.unmount();
    },
  );

  it('reports successful PIN setup to the backup flow', async () => {
    const onClose = jest.fn();
    const store = createStore();
    store.dispatch(AppActions.showPinModal({type: 'set', onClose}));
    const screen = mount(store);

    await enterPin(screen, CORRECT_PIN);
    await enterPin(screen, CORRECT_PIN);

    expect(onClose).toHaveBeenCalledWith(true);
    expect(app(store).pinLockActive).toBe(true);
    expect(app(store).showPinModal).toBe(false);
    screen.unmount();
  });

  it('replaces the onboarding lock screen with the terms once the PIN is set', async () => {
    const store = createStore();
    store.dispatch(
      AppActions.showPinModal({type: 'set', context: 'onboarding'}),
    );
    const screen = mount(store);

    await enterPin(screen, CORRECT_PIN);
    await enterPin(screen, CORRECT_PIN);
    await flush(10);

    expect(mockNavigationDispatch).toHaveBeenCalledWith(
      StackActions.replace('TermsOfUse'),
    );
    expect(app(store).pinInteractionDone).toBe(true);
    screen.unmount();
  });

  it('removes the back button when a global PIN check replaces a cancelable check', () => {
    const store = createStore();
    store.dispatch(
      AppActions.showPinModal({type: 'check', onClose: jest.fn()}),
    );
    const screen = mount(store);

    expect(screen.getByLabelText('Back')).toBeTruthy();

    act(() => store.dispatch(AppActions.showPinModal({type: 'check'})));

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(app(store).showPinModal).toBe(true);
    screen.unmount();
  });

  it('keeps a replacement global lock open when an earlier PIN check finishes', async () => {
    let releaseTimer: (uptime: string) => void = () => {};
    getRelativeTime.mockImplementation(
      () =>
        new Promise<string>(resolve => {
          releaseTimer = resolve;
        }),
    );
    const onClose = jest.fn();
    const store = createStore();
    store.dispatch(AppActions.currentPin(hashPinLegacy(['3', '7', '2', '9'])));
    store.dispatch(AppActions.currentSalt(undefined));
    store.dispatch(AppActions.showPinModal({type: 'check', onClose}));
    const screen = mount(store);

    await enterPin(screen, '3729');
    act(() => store.dispatch(AppActions.showPinModal({type: 'check'})));
    await act(async () => releaseTimer('1000'));

    expect(app(store).showPinModal).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    screen.unmount();
  });

  it('allows a replacement global PIN check while the earlier timer is pending', async () => {
    let releaseTimer: (uptime: string) => void = () => {};
    getRelativeTime.mockImplementationOnce(
      () =>
        new Promise<string>(resolve => {
          releaseTimer = resolve;
        }),
    );
    const onClose = jest.fn();
    const store = createStore();
    store.dispatch(AppActions.showPinModal({type: 'check', onClose}));
    const screen = mount(store);

    await enterPin(screen, CORRECT_PIN);
    act(() => store.dispatch(AppActions.showPinModal({type: 'check'})));
    await enterPin(screen, CORRECT_PIN);

    expect(getRelativeTime).toHaveBeenCalledTimes(2);
    expect(app(store).showPinModal).toBe(false);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => releaseTimer('1000'));
    expect(onClose).not.toHaveBeenCalled();
    screen.unmount();
  });

  it('keeps replacement PIN input blocked until its own check finishes', async () => {
    let releaseEarlierTimer: (uptime: string) => void = () => {};
    let releaseCurrentTimer: (uptime: string) => void = () => {};
    getRelativeTime
      .mockImplementationOnce(
        () =>
          new Promise<string>(resolve => {
            releaseEarlierTimer = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>(resolve => {
            releaseCurrentTimer = resolve;
          }),
      );
    const onClose = jest.fn();
    const store = createStore();
    store.dispatch(AppActions.showPinModal({type: 'check', onClose}));
    const screen = mount(store);

    await enterPin(screen, CORRECT_PIN);
    act(() => store.dispatch(AppActions.showPinModal({type: 'check'})));
    await enterPin(screen, CORRECT_PIN);
    await act(async () => releaseEarlierTimer('1000'));

    expect(app(store).showPinModal).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    longPressDelete(screen);
    await enterPin(screen, WRONG_PIN);

    expect(getRelativeTime).toHaveBeenCalledTimes(2);
    expect(app(store).pinFailedAttempts).toBe(0);

    await act(async () => releaseCurrentTimer('1000'));
    expect(app(store).showPinModal).toBe(false);
    screen.unmount();
  });
});
