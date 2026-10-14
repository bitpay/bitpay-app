import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {useLatestCallback} from './useLatestCallback';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useLatestCallback', () => {
  it('keeps its identity while invoking the latest implementation', () => {
    const placeholderNavigation = jest.fn(() => {
      throw new Error(
        'Actions cannot be dispatched from a placeholder screen.',
      );
    });
    const activeNavigation = jest.fn();
    let onPress: (() => void) | undefined;

    const Harness = ({navigate}: {navigate: () => void}) => {
      onPress = useLatestCallback(navigate);
      return null;
    };

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <Harness navigate={placeholderNavigation} />,
      );
    });
    const preloadedOnPress = onPress;

    act(() => {
      renderer.update(<Harness navigate={activeNavigation} />);
    });

    expect(onPress).toBe(preloadedOnPress);
    expect(() => onPress?.()).not.toThrow();
    expect(activeNavigation).toHaveBeenCalledTimes(1);
    expect(placeholderNavigation).not.toHaveBeenCalled();
  });
});
