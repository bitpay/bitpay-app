const getFreshPersistor = (): typeof import('./persistor') => {
  let module: typeof import('./persistor');
  jest.isolateModules(() => {
    module = require('./persistor');
  });
  return module!;
};

describe('flushPersistor', () => {
  it('fails when the persistor has not been initialized', async () => {
    const {flushPersistor} = getFreshPersistor();

    await expect(flushPersistor()).rejects.toThrow(
      'Persistor is not initialized',
    );
  });

  it('waits for the active persistor', async () => {
    const {flushPersistor, setActivePersistor} = getFreshPersistor();
    const flush = jest.fn().mockResolvedValue(undefined);
    setActivePersistor({flush, pause: jest.fn()});

    await flushPersistor();

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('surfaces storage errors reported during the flush', async () => {
    const {flushPersistor, reportPersistWriteError, setActivePersistor} =
      getFreshPersistor();
    const error = new Error('disk full');
    setActivePersistor({
      flush: async () => reportPersistWriteError(error),
      pause: jest.fn(),
    });

    await expect(flushPersistor()).rejects.toBe(error);
  });

  it('surfaces a storage error reported just before the flush', async () => {
    const {flushPersistor, reportPersistWriteError, setActivePersistor} =
      getFreshPersistor();
    const error = new Error('disk full');
    setActivePersistor({
      flush: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
    });
    reportPersistWriteError(error);

    await expect(flushPersistor()).rejects.toBe(error);
  });

  it('clears a read failure when a new store registers its persistor', async () => {
    const {flushPersistor, pausePersistor, setActivePersistor} =
      getFreshPersistor();
    const persistor = {
      flush: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
    };
    setActivePersistor(persistor);
    pausePersistor(new Error('unreadable secrets'));
    setActivePersistor(persistor);

    await expect(flushPersistor()).resolves.toBeUndefined();
  });

  it('surfaces write errors swallowed by redux-persist', async () => {
    const {flushPersistor, reportPersistWriteError, setActivePersistor} =
      getFreshPersistor();
    const createPersistoid = jest.requireActual(
      'redux-persist/lib/createPersistoid',
    ).default;
    const error = new Error('disk full');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const persistor = createPersistoid({
      key: 'root',
      storage: {setItem: jest.fn().mockRejectedValue(error)},
      writeFailHandler: reportPersistWriteError,
    });
    setActivePersistor({...persistor, pause: jest.fn()});
    persistor.update({WALLET: {keys: {}}});

    try {
      await expect(flushPersistor()).rejects.toBe(error);
    } finally {
      log.mockRestore();
    }
  });
});

describe('encrypted persistence lifecycle', () => {
  it.each([
    ['readable key secrets', true, false],
    ['unreadable key secrets', false, false],
    ['unreadable pending session without keys', false, true],
  ])('%s', async (_name, readable, pendingOnly) => {
    const {createStore, combineReducers} = jest.requireActual('redux');
    const {persistReducer, persistStore} = jest.requireActual('redux-persist');
    const autoMergeLevel2 = jest.requireActual(
      'redux-persist/lib/stateReconciler/autoMergeLevel2',
    ).default;
    const {encryptTransform} = jest.requireActual(
      'redux-persist-transform-encrypt',
    );
    const {flushPersistor, pausePersistor, setActivePersistor} =
      getFreshPersistor();
    const initialSecrets = {
      byKeyId: {},
      byKeyIdAndWalletId: {},
      tssSessionByKeyId: {},
      pendingJoinerSession: null,
    };
    const secrets = {
      ...initialSecrets,
      byKeyId: pendingOnly ? {} : {key1: {mnemonic: 'fixture mnemonic'}},
      pendingJoinerSession: pendingOnly
        ? {sessionId: 'session1', partyKey: {xPrivKey: 'fixture private key'}}
        : null,
    };
    const originalTransform = encryptTransform({
      secretKey: 'original-key',
      unencryptedStores: ['WALLET'],
    });
    const original = JSON.stringify({
      WALLET: JSON.stringify(
        originalTransform.in(
          {
            secretsMigrated: true,
            keys: pendingOnly ? {} : {key1: {id: 'key1', wallets: []}},
            pendingJoinerSession: null,
          },
          'WALLET',
        ),
      ),
      WALLET_SECRETS: JSON.stringify(
        originalTransform.in(secrets, 'WALLET_SECRETS'),
      ),
    });
    const storage = {
      getItem: jest.fn().mockResolvedValue(original),
      setItem: jest.fn().mockResolvedValue(undefined),
    };
    const onError = jest.fn((error: Error) => {
      pausePersistor(error);
    });
    const store = createStore(
      persistReducer(
        {
          key: 'root',
          storage,
          timeout: 0,
          stateReconciler: autoMergeLevel2,
          transforms: [
            encryptTransform({
              secretKey: readable ? 'original-key' : 'wrong-key',
              unencryptedStores: ['WALLET'],
              onError,
            }),
          ],
        },
        combineReducers({
          WALLET: (state = {keys: {}}) => state,
          WALLET_SECRETS: (state = initialSecrets) => state,
        }),
      ),
    );
    let persistor: ReturnType<typeof persistStore>;
    await new Promise<void>(resolve => {
      persistor = persistStore(store, null, resolve);
      setActivePersistor(persistor);
    });

    if (readable) {
      await flushPersistor();
      expect(onError).not.toHaveBeenCalled();
      expect(store.getState().WALLET_SECRETS).toEqual(secrets);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
    } else {
      const error = onError.mock.calls[0][0];
      await expect(flushPersistor()).rejects.toBe(error);
      await expect(flushPersistor()).rejects.toBe(error);
      await persistor!.flush();
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  });
});
