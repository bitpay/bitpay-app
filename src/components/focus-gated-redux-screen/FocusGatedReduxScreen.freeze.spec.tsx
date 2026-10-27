import React, {useSyncExternalStore} from 'react';
import {Text} from 'react-native';
import {Screen} from 'react-native-screens';
import TestRenderer, {act} from 'react-test-renderer';
import {Provider, useSelector} from 'react-redux';
import {createStore} from 'redux';
import FocusGatedReduxScreen from './FocusGatedReduxScreen';

const mockFocus = (() => {
  let focused = true;
  const listeners = new Set<() => void>();
  return {
    get: () => focused,
    set: (next: boolean) => {
      focused = next;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
})();

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => {
    const {useSyncExternalStore: useStore} = require('react');
    return useStore(mockFocus.subscribe, mockFocus.get);
  },
}));

const reducer = (state = {count: 0}, action: {type: string}) =>
  action.type === 'inc' ? {count: state.count + 1} : state;

const Counter = () => (
  <Text testID="count">{useSelector((s: {count: number}) => s.count)}</Text>
);

describe('FocusGatedReduxScreen under freezeOnBlur', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocus.set(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps receiving store updates after being blurred and refocused', () => {
    const store = createStore(reducer);
    const Navigator = () => {
      const focused = useSyncExternalStore(mockFocus.subscribe, mockFocus.get);
      return (
        <Screen
          enabled
          activityState={focused ? 2 : 0}
          freezeOnBlur
          shouldFreeze={!focused}>
          <FocusGatedReduxScreen>
            <Counter />
          </FocusGatedReduxScreen>
        </Screen>
      );
    };
    let renderer!: TestRenderer.ReactTestRenderer;
    const shown = () =>
      renderer.root.findByProps({testID: 'count'}).props.children;

    act(() => {
      renderer = TestRenderer.create(
        <Provider store={store}>
          <Navigator />
        </Provider>,
      );
    });

    for (let round = 1; round <= 3; round++) {
      act(() => mockFocus.set(false));
      act(() => {
        jest.runAllTimers();
      });
      act(() => {
        store.dispatch({type: 'inc'});
        store.dispatch({type: 'inc'});
      });
      act(() => mockFocus.set(true));
      act(() => {
        jest.runAllTimers();
      });
      act(() => {
        store.dispatch({type: 'inc'});
      });

      expect(shown()).toBe(store.getState().count);
    }

    act(() => renderer.unmount());
  });
});
