import {Alert, AppState, Linking, Platform} from 'react-native';
import type {AlertButton, AppStateStatus} from 'react-native';
import {URL} from '../constants';
import {vaultError} from './vault-diagnostics';
import {vaultStartupAlert} from './vault-startup-alert';

jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  AppState: {currentState: 'active', addEventListener: jest.fn()},
  Linking: {openURL: jest.fn()},
  Platform: {OS: 'ios'},
}));
jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    t: (key: string, options?: {id: string}) =>
      key.replace('{{id}}', options?.id ?? ''),
  },
}));

const listeners = new Map<string, Set<(state?: AppStateStatus) => void>>();
const removals: jest.Mock[] = [];
const controllers: Array<() => void> = [];
const retry = jest.fn();
const show = () => {
  const dispose = vaultStartupAlert(
    vaultError('SOURCE_CONFLICT', 'inventory'),
    retry,
  );
  controllers.push(dispose);
  return dispose;
};
const emit = (event: string, state?: AppStateStatus) => {
  if (event === 'change' && state) AppState.currentState = state;
  listeners.get(event)?.forEach(listener => listener(state));
};
const buttons = (index = (Alert.alert as jest.Mock).mock.calls.length - 1) =>
  (Alert.alert as jest.Mock).mock.calls[index][2] as AlertButton[];
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  listeners.clear();
  removals.length = 0;
  controllers.length = 0;
  AppState.currentState = 'active';
  (Platform as {OS: string}).OS = 'ios';
  (Linking.openURL as jest.Mock).mockReset().mockResolvedValue(undefined);
  (AppState.addEventListener as jest.Mock).mockImplementation(
    (event: string, listener: (state?: AppStateStatus) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
      const remove = jest.fn(() => listeners.get(event)!.delete(listener));
      removals.push(remove);
      return {remove};
    },
  );
});
afterEach(() => {
  controllers.forEach(dispose => dispose());
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('shows once while active with the literal guidance and diagnostic reference', () => {
  show();
  emit('change', 'active');
  jest.runAllTimers();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Wallet data could not be opened',
    'Your local data was preserved. Retry or contact support. Do not uninstall the app or clear its data. Reference: SOURCE_CONFLICT/inventory.',
    expect.any(Array),
    {cancelable: false},
  );
  expect(buttons().map(button => button.text)).toEqual([
    'Retry',
    'Help & Support',
  ]);
});

it.each(['background', 'inactive'] as const)(
  'waits for an active app from %s',
  state => {
    AppState.currentState = state;
    show();
    expect(Alert.alert).not.toHaveBeenCalled();
    emit('change', 'active');
    emit('change', 'active');
    jest.advanceTimersByTime(0);
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  },
);

it('retries exactly once and ignores both stale button callbacks', async () => {
  show();
  const [again, help] = buttons();
  again.onPress!();
  again.onPress!();
  help.onPress!();
  await settle();
  expect(retry).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).not.toHaveBeenCalled();
});

it('opens the support URL and presents once on return, retiring the old buttons', async () => {
  show();
  const old = buttons();
  old[1].onPress!();
  old[1].onPress!();
  await settle();
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledWith(URL.HELP_AND_SUPPORT);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  emit('change', 'background');
  jest.advanceTimersByTime(1000);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  emit('change', 'active');
  emit('change', 'active');
  jest.advanceTimersByTime(0);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  old[0].onPress!();
  expect(retry).not.toHaveBeenCalled();
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('leaves a usable alert when opening support fails', async () => {
  (Linking.openURL as jest.Mock).mockRejectedValueOnce(
    new Error('synthetic open failure'),
  );
  show();
  buttons()[1].onPress!();
  await settle();
  jest.advanceTimersByTime(0);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('ignores a late openURL result after the user has returned', async () => {
  let finish!: () => void;
  (Linking.openURL as jest.Mock).mockReturnValueOnce(
    new Promise<void>(resolve => {
      finish = resolve;
    }),
  );
  show();
  buttons()[1].onPress!();
  await settle();
  emit('change', 'background');
  emit('change', 'active');
  jest.advanceTimersByTime(0);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  finish();
  await settle();
  jest.runAllTimers();
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('handles Android blur and focus without duplicating the returned alert', async () => {
  (Platform as {OS: string}).OS = 'android';
  show();
  emit('blur'); // The initial native Alert itself may take focus.
  emit('focus');
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  buttons()[1].onPress!();
  await settle();
  emit('blur');
  jest.advanceTimersByTime(1000);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  emit('focus');
  emit('focus');
  jest.advanceTimersByTime(0);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  emit('focus');
  jest.runAllTimers();
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('uses a one-second fallback when support produces no lifecycle event', async () => {
  show();
  buttons()[1].onPress!();
  await settle();
  jest.advanceTimersByTime(999);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(1);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it('dispose cancels timers and all listeners, including late native callbacks', async () => {
  (Platform as {OS: string}).OS = 'android';
  const dispose = show();
  const old = buttons();
  old[1].onPress!();
  await settle();
  expect(jest.getTimerCount()).toBe(1);
  const lateListeners = [...listeners.values()].flatMap(group => [...group]);
  dispose();
  dispose();
  expect(jest.getTimerCount()).toBe(0);
  expect(removals).toHaveLength(3);
  removals.forEach(remove => expect(remove).toHaveBeenCalledTimes(1));
  lateListeners.forEach(listener => listener('active'));
  old[0].onPress!();
  old[1].onPress!();
  await settle();
  jest.runAllTimers();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(retry).not.toHaveBeenCalled();
});

it('invalidates a fallback on delayed departure and presents one usable alert on return', async () => {
  show();
  buttons()[1].onPress!();
  await settle();
  jest.advanceTimersByTime(1000);
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  const fallback = buttons();
  emit('change', 'background');
  fallback[0].onPress!();
  expect(retry).not.toHaveBeenCalled();
  emit('change', 'active');
  emit('change', 'active');
  jest.advanceTimersByTime(0);
  expect(Alert.alert).toHaveBeenCalledTimes(3);
  fallback[0].onPress!();
  fallback[1].onPress!();
  await settle();
  jest.runAllTimers();
  expect(retry).not.toHaveBeenCalled();
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expect(Alert.alert).toHaveBeenCalledTimes(3);
  buttons()[0].onPress!();
  expect(retry).toHaveBeenCalledTimes(1);
});

it.each([
  ['D13', '/D13'],
  ['D00', '/D00'],
  [undefined, ''],
  ['D18', ''],
  [13, ''],
])('D16: uses validated detail %p in the reference', (detail, suffix) => {
  const error = vaultError(
    'INVALID_LEGACY_INPUT',
    'classify',
    'SOURCE_INVALID',
    undefined,
    detail as any,
  );
  Object.assign(error, {
    detail: 'synthetic public detail',
    message: 'synthetic private message',
    stack: 'synthetic private stack',
    cause: 'synthetic private cause',
  });
  controllers.push(vaultStartupAlert(error, retry));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Wallet data could not be opened',
    `Your local data was preserved. Retry or contact support. Do not uninstall the app or clear its data. Reference: INVALID_LEGACY_INPUT/classify${suffix}.`,
    expect.any(Array),
    {cancelable: false},
  );
});

it('D16: an unclassified failure cannot supply an on-screen detail or raw contents', () => {
  const error = Object.assign(new Error('synthetic private message'), {
    detail: 'D13',
  });
  controllers.push(vaultStartupAlert(error, retry));
  expect(Alert.alert).toHaveBeenCalledWith(
    'Wallet data could not be opened',
    'Your local data was preserved. Retry or contact support. Do not uninstall the app or clear its data. Reference: STARTUP_FAILURE/startup.',
    expect.any(Array),
    {cancelable: false},
  );
});
