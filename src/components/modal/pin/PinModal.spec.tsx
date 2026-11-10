import React from 'react';
import {NativeModules} from 'react-native';
import {Provider} from 'react-redux';
import {act, fireEvent, render} from '@test/render';
import configureTestStore from '@test/store';
import {AppActions} from '../../../store/app';
import {appReduxPersistBlackList} from '../../../store/app/app.reducer';
import {createPin} from '../../../utils/pin';
import PinModal from './PinModal';

jest.mock('../../../Root', () => ({
  navigationRef: {navigate: jest.fn()},
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

describe('PinModal lockout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    uptime = 1000;
    getRelativeTime.mockClear();
    getRelativeTime.mockImplementation(() => Promise.resolve(String(uptime)));
    NativeModules.Timer = {getRelativeTime};
  });

  afterEach(() => {
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
});
