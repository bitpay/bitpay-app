import type {Action, AnyAction, Store} from 'redux';

export type FocusGatedStoreController<
  State,
  StoreAction extends Action = AnyAction,
> = {
  store: Store<State, StoreAction>;
  setFocused: (focused: boolean) => void;
};

export const createFocusGatedStore = <
  State,
  StoreAction extends Action = AnyAction,
>(
  sourceStore: Store<State, StoreAction>,
  initiallyFocused: boolean,
): FocusGatedStoreController<State, StoreAction> => {
  let focused = initiallyFocused;
  const subscriptions = new Set<{listener: () => void}>();

  const gatedStore = Object.create(sourceStore) as Store<State, StoreAction>;

  Object.defineProperties(gatedStore, {
    getState: {
      configurable: true,
      enumerable: true,
      value: () => sourceStore.getState(),
    },
    subscribe: {
      configurable: true,
      enumerable: true,
      value: (listener: () => void) => {
        const subscription = {listener};
        subscriptions.add(subscription);
        const unsubscribeFromSource = sourceStore.subscribe(() => {
          if (!focused) {
            return;
          }

          listener();
        });

        return () => {
          subscriptions.delete(subscription);
          unsubscribeFromSource();
        };
      },
    },
  });

  return {
    store: gatedStore,
    setFocused: nextFocused => {
      if (focused === nextFocused) {
        return;
      }

      focused = nextFocused;

      if (focused) {
        Array.from(subscriptions).forEach(({listener}) => listener());
      }
    },
  };
};
