import {applyMiddleware, createStore, Middleware} from 'redux';
import {createTransform, persistReducer, persistStore} from 'redux-persist';
import {createRehydrationFailureMiddleware} from './persistence-guard';

describe('rehydration failure protection', () => {
  it('pauses persistence before a decrypt error can overwrite the original root', async () => {
    const originalRoot = JSON.stringify({
      TEST: JSON.stringify('corrupted-ciphertext'),
    });
    let storedRoot = originalRoot;
    const storage = {
      getItem: jest.fn(async () => storedRoot),
      setItem: jest.fn(async (_key: string, value: string) => {
        storedRoot = value;
      }),
      removeItem: jest.fn(async () => undefined),
    };
    const transform = createTransform<any, any>(
      state => state,
      () => {
        throw new Error('decrypt failed');
      },
    );
    const onFailure = jest.fn();
    const persistedReducer = persistReducer(
      {key: 'root', storage, transforms: [transform], timeout: 0},
      (state = {TEST: 'initial'}, action) =>
        action.type === 'CHANGE' ? {TEST: 'changed'} : state,
    );
    const store = createStore(
      persistedReducer,
      applyMiddleware(
        createRehydrationFailureMiddleware(onFailure) as Middleware,
      ),
    );

    let persistor: ReturnType<typeof persistStore> | undefined;
    await new Promise<void>(resolve => {
      persistor = persistStore(store, undefined, resolve);
    });

    store.dispatch({type: 'CHANGE'});
    await persistor!.flush();

    expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storedRoot).toBe(originalRoot);
    expect(store.getState().TEST).toBe('changed');
  });
});
