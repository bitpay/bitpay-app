import {legacy_createStore as createStore} from 'redux';
import {createFocusGatedStore} from './focusGatedStore';

type State = {
  revision: number;
};

type Action = {
  type: 'increment';
};

describe('createFocusGatedStore', () => {
  it('keeps getState live and suppresses notifications while blurred', () => {
    const sourceStore = createStore(
      (state: State = {revision: 0}, action: Action) =>
        action.type === 'increment' ? {revision: state.revision + 1} : state,
    );
    const focusGate = createFocusGatedStore(sourceStore, true);
    const listener = jest.fn();
    const unsubscribe = focusGate.store.subscribe(listener);

    focusGate.store.dispatch({type: 'increment'});

    expect(listener).toHaveBeenCalledTimes(1);
    expect(focusGate.store.getState()).toEqual({revision: 1});

    focusGate.setFocused(false);
    focusGate.store.dispatch({type: 'increment'});
    focusGate.store.dispatch({type: 'increment'});

    expect(listener).toHaveBeenCalledTimes(1);
    expect(focusGate.store.getState()).toEqual({revision: 3});

    focusGate.setFocused(true);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(focusGate.store.getState()).toEqual({revision: 3});

    sourceStore.dispatch({type: 'increment'});

    expect(listener).toHaveBeenCalledTimes(3);
    expect(focusGate.store.getState()).toEqual({revision: 4});

    unsubscribe();
  });

  it('tracks duplicate listener subscriptions independently', () => {
    const sourceStore = createStore(
      (state: State = {revision: 0}, action: Action) =>
        action.type === 'increment' ? {revision: state.revision + 1} : state,
    );
    const focusGate = createFocusGatedStore(sourceStore, true);
    const listener = jest.fn();
    const unsubscribeFirst = focusGate.store.subscribe(listener);
    const unsubscribeSecond = focusGate.store.subscribe(listener);

    focusGate.setFocused(false);
    focusGate.store.dispatch({type: 'increment'});
    expect(listener).not.toHaveBeenCalled();

    focusGate.setFocused(true);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    listener.mockClear();
    focusGate.setFocused(false);
    focusGate.store.dispatch({type: 'increment'});
    focusGate.setFocused(true);

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribeSecond();
  });
});
