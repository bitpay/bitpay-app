import React, {useMemo, useSyncExternalStore} from 'react';
import {Text, View} from 'react-native';
import {Screen} from 'react-native-screens';
import TestRenderer, {act} from 'react-test-renderer';
import {BitPayDarkTheme, BitPayLightTheme} from '../themes/bitpay';
import {ThemeProvider, ThemeRelay, useTheme} from './ThemeContext';

const createStore = <T,>(initialValue: T) => {
  let value = initialValue;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    set: (nextValue: T) => {
      value = nextValue;
      listeners.forEach(listener => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

describe('ThemeRelay', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      renderer?.unmount();
    });
    renderer = undefined;
    jest.useRealTimers();
  });

  it('applies a theme change made while the screen was frozen to memoized descendants', () => {
    const themeStore = createStore(BitPayLightTheme);
    const focusStore = createStore(true);
    let themedTextRenderCount = 0;

    const ThemedText = () => {
      themedTextRenderCount += 1;
      return (
        <Text testID="themed-text">{useTheme().dark ? 'dark' : 'light'}</Text>
      );
    };

    const Card = () => (
      <View>
        <ThemedText />
      </View>
    );

    const ThemedContainer = ({children}: {children: React.ReactNode}) => (
      <View style={{backgroundColor: useTheme().colors.background}}>
        {children}
      </View>
    );

    const ScreenContent = () => {
      useSyncExternalStore(focusStore.subscribe, focusStore.getSnapshot);
      const card = useMemo(() => <Card />, []);
      return <ThemedContainer>{card}</ThemedContainer>;
    };

    const Navigator = React.memo(() => {
      const focused = useSyncExternalStore(
        focusStore.subscribe,
        focusStore.getSnapshot,
      );
      return (
        <Screen
          enabled
          activityState={focused ? 2 : 0}
          freezeOnBlur
          shouldFreeze={!focused}>
          <ThemeRelay>
            <ScreenContent />
          </ThemeRelay>
        </Screen>
      );
    });

    const App = () => (
      <ThemeProvider
        theme={useSyncExternalStore(
          themeStore.subscribe,
          themeStore.getSnapshot,
        )}>
        <Navigator />
      </ThemeProvider>
    );

    act(() => {
      renderer = TestRenderer.create(<App />);
    });
    act(() => {
      focusStore.set(false);
    });
    act(() => {
      jest.runAllTimers();
    });

    const renderCountBeforeThemeChange = themedTextRenderCount;
    act(() => {
      themeStore.set(BitPayDarkTheme);
    });
    expect(themedTextRenderCount).toBe(renderCountBeforeThemeChange);

    act(() => {
      focusStore.set(true);
    });

    expect(
      renderer!.root.findByProps({testID: 'themed-text'}).props.children,
    ).toBe('dark');
  });
});
