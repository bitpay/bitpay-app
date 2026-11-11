jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

jest.mock('../wallet/effects/create/create', () => ({
  startCreateKey: jest.fn(),
}));

jest.mock('../../constants/currencies', () => ({
  getBaseKeyCreationCoinsAndTokens: jest.fn(() => ['btc']),
}));

jest.mock('../../components/backup/TopToast', () => ({
  showTopToast: jest.fn(),
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    error: jest.fn(),
  },
}));

jest.mock('./keyNotifications.effects', () => ({
  unsubscribeKeyNotifications: jest.fn((keyId: string) => ({
    type: 'TEST/UNSUBSCRIBE_KEY_NOTIFICATIONS',
    payload: keyId,
  })),
}));

import {
  cancelOnboardingKeyCreation,
  startOnboardingKeyCreation,
} from './onboardingKey.effects';

const mockNetInfo = jest.requireMock('@react-native-community/netinfo')
  .default as {fetch: jest.Mock; addEventListener: jest.Mock};
const mockStartCreateKey = jest.requireMock('../wallet/effects/create/create')
  .startCreateKey as jest.Mock;
const mockShowTopToast = jest.requireMock('../../components/backup/TopToast')
  .showTopToast as jest.Mock;

const makeStore = () => {
  const state: Record<string, any> = {
    APP: {onboardingKeyStatus: 'idle', homeCarouselConfig: []},
    WALLET: {keys: {}},
  };
  const dispatched: any[] = [];
  const getState = () => state;
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    dispatched.push(action);
    if (action?.type === 'APP/SET_ONBOARDING_KEY_STATUS') {
      state.APP.onboardingKeyStatus = action.payload;
    }
    if (action?.type === 'WALLET/DELETE_KEY') {
      delete state.WALLET.keys[action.payload.keyId];
    }
    if (action?.type === 'WALLET/SUCCESS_CREATE_KEY') {
      const {key} = action.payload;
      state.WALLET.keys[key.id] = key;
    }
    return action;
  });
  return {dispatch, dispatched, state};
};

const types = (dispatched: any[]) => dispatched.map(action => action.type);

const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

const mockCreatedKey = (store: ReturnType<typeof makeStore>, id: string) => {
  const creation = deferred<{id: string}>();
  mockStartCreateKey.mockImplementation(
    (_currencies, _context, isCurrentRequest: () => boolean) => () =>
      creation.promise.then(key => {
        if (!isCurrentRequest()) {
          throw new Error('Key creation cancelled');
        }
        store.dispatch({type: 'WALLET/SUCCESS_CREATE_KEY', payload: {key}});
        return key;
      }),
  );
  return () => creation.resolve({id});
};

describe('onboarding key creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfo.fetch.mockResolvedValue({isConnected: true});
  });

  it('creates the key in the background and shows it on Home', async () => {
    const store = makeStore();
    const finish = mockCreatedKey(store, 'key-1');

    const creation = store.dispatch(startOnboardingKeyCreation());
    await Promise.resolve();
    expect(store.state.APP.onboardingKeyStatus).toBe('creating');

    finish();
    await creation;

    expect(store.dispatched).toContainEqual({
      type: 'APP/SET_HOME_CAROUSEL_CONFIG',
      payload: {id: 'key-1', show: true},
    });
    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(store.state.WALLET.keys['key-1']).toBeDefined();
  });

  it('waits for a connection before creating the key', async () => {
    const store = makeStore();
    mockNetInfo.fetch.mockResolvedValue({isConnected: false});
    let onConnectionChange: (state: {isConnected: boolean}) => void = () => {};
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockImplementation(listener => {
      onConnectionChange = listener;
      return unsubscribe;
    });
    const finish = mockCreatedKey(store, 'key-1');

    const creation = store.dispatch(startOnboardingKeyCreation());
    await new Promise(resolve => setImmediate(resolve));

    expect(store.state.APP.onboardingKeyStatus).toBe('waiting');
    expect(mockShowTopToast).toHaveBeenCalledWith({
      text: 'Waiting for a connection to finish setting up your key',
      kind: 'offline',
    });
    expect(mockStartCreateKey).not.toHaveBeenCalled();

    onConnectionChange({isConnected: true});
    await new Promise(resolve => setImmediate(resolve));
    finish();
    await creation;

    expect(unsubscribe).toHaveBeenCalled();
    expect(mockShowTopToast).toHaveBeenLastCalledWith(null);
    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(store.state.WALLET.keys['key-1']).toBeDefined();
  });

  it('does not publish a key that finishes after the person chose to import instead', async () => {
    const store = makeStore();
    const finish = mockCreatedKey(store, 'key-1');

    const creation = store.dispatch(startOnboardingKeyCreation());
    await Promise.resolve();
    store.dispatch(cancelOnboardingKeyCreation());
    finish();
    await creation;

    expect(store.state.WALLET.keys['key-1']).toBeUndefined();
    expect(types(store.dispatched)).not.toContain(
      'APP/SET_HOME_CAROUSEL_CONFIG',
    );
    expect(types(store.dispatched)).not.toContain('WALLET/SUCCESS_CREATE_KEY');
    expect(types(store.dispatched)).not.toContain('WALLET/DELETE_KEY');
    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
  });

  it('ignores an offline answer that arrives after the person chose to import', async () => {
    const store = makeStore();
    const connection = deferred<{isConnected: boolean}>();
    mockNetInfo.fetch.mockReturnValue(connection.promise);

    const creation = store.dispatch(startOnboardingKeyCreation());
    store.dispatch(cancelOnboardingKeyCreation());
    connection.resolve({isConnected: false});
    await creation;

    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(mockShowTopToast).not.toHaveBeenCalled();
    expect(mockNetInfo.addEventListener).not.toHaveBeenCalled();
    expect(mockStartCreateKey).not.toHaveBeenCalled();
  });

  it('stops waiting for a connection when the person chooses to import', async () => {
    const store = makeStore();
    mockNetInfo.fetch.mockResolvedValue({isConnected: false});
    const unsubscribe = jest.fn();
    mockNetInfo.addEventListener.mockReturnValue(unsubscribe);

    const creation = store.dispatch(startOnboardingKeyCreation());
    await new Promise(resolve => setImmediate(resolve));
    expect(store.state.APP.onboardingKeyStatus).toBe('waiting');

    store.dispatch(cancelOnboardingKeyCreation());
    await creation;

    expect(unsubscribe).toHaveBeenCalled();
    expect(mockShowTopToast).toHaveBeenLastCalledWith(null);
    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(mockStartCreateKey).not.toHaveBeenCalled();
  });

  it('keeps the offline toast of a newer request when an older wait ends', async () => {
    const store = makeStore();
    mockNetInfo.fetch.mockResolvedValue({isConnected: false});
    mockNetInfo.addEventListener.mockReturnValue(jest.fn());

    const first = store.dispatch(startOnboardingKeyCreation());
    await new Promise(resolve => setImmediate(resolve));
    store.dispatch(startOnboardingKeyCreation());
    await first;
    await new Promise(resolve => setImmediate(resolve));

    expect(mockShowTopToast).toHaveBeenLastCalledWith({
      text: 'Waiting for a connection to finish setting up your key',
      kind: 'offline',
    });
    expect(store.state.APP.onboardingKeyStatus).toBe('waiting');
    expect(mockStartCreateKey).not.toHaveBeenCalled();
  });

  it('hides the offline toast when a newer request finishes online', async () => {
    const store = makeStore();
    mockNetInfo.fetch.mockResolvedValueOnce({isConnected: false});
    mockNetInfo.addEventListener.mockReturnValue(jest.fn());

    const first = store.dispatch(startOnboardingKeyCreation());
    await new Promise(resolve => setImmediate(resolve));
    const finish = mockCreatedKey(store, 'key-2');
    const second = store.dispatch(startOnboardingKeyCreation());
    finish();
    await Promise.all([first, second]);

    expect(mockShowTopToast).toHaveBeenLastCalledWith(null);
    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(store.state.WALLET.keys['key-2']).toBeDefined();
  });

  it('deletes the key it already created when the person chooses to import', async () => {
    const store = makeStore();
    store.state.WALLET.keys['imported-before'] = {id: 'imported-before'};
    const finish = mockCreatedKey(store, 'key-1');

    const creation = store.dispatch(startOnboardingKeyCreation());
    finish();
    await creation;
    store.state.APP.homeCarouselConfig = [{id: 'key-1', show: true}];
    store.dispatch(cancelOnboardingKeyCreation());

    expect(store.state.WALLET.keys['key-1']).toBeUndefined();
    expect(store.state.WALLET.keys['imported-before']).toBeDefined();
    expect(store.dispatched).toContainEqual({
      type: 'TEST/UNSUBSCRIBE_KEY_NOTIFICATIONS',
      payload: 'key-1',
    });
    expect(store.dispatched).toContainEqual({
      type: 'APP/SET_HOME_CAROUSEL_CONFIG',
      payload: [],
    });
  });

  it('offers to try again when creating the key fails', async () => {
    const store = makeStore();
    mockStartCreateKey.mockReturnValue(() =>
      Promise.reject(new Error('network')),
    );

    await store.dispatch(startOnboardingKeyCreation());

    expect(store.state.APP.onboardingKeyStatus).toBe('failed');
    const sheet = store.dispatched.find(
      action => action.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
    );
    expect(sheet.payload.actions.map((a: any) => a.text)).toEqual([
      'Try Again',
      'Not Now',
    ]);

    const finish = mockCreatedKey(store, 'key-2');
    const retry = sheet.payload.actions[0].action();
    finish();
    await retry;

    expect(store.state.APP.onboardingKeyStatus).toBe('idle');
    expect(store.state.WALLET.keys['key-2']).toBeDefined();
  });
});
