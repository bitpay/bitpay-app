import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {scrollTo} from 'react-native-reanimated';

const {
  useScrollEventsHandlersDefault,
} = require('@gorhom/bottom-sheet/lib/commonjs/hooks/useScrollEventsHandlersDefault');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  scrollTo: jest.fn(),
}));

jest.mock(
  '@gorhom/bottom-sheet/lib/commonjs/hooks/useBottomSheetInternal',
  () => {
    const {SCROLLABLE_STATUS, SHEET_STATE} = jest.requireActual(
      '@gorhom/bottom-sheet/lib/commonjs/constants',
    );
    return {
      useBottomSheetInternal: () => ({
        animatedSheetState: {value: SHEET_STATE.OPENED},
        animatedScrollableState: {set: jest.fn()},
        animatedScrollableStatus: {value: SCROLLABLE_STATUS.LOCKED},
        animatedAnimationState: {get: () => ({})},
        animatedHandleGestureState: {value: 0},
      }),
    };
  },
);

const scrollToMock = scrollTo as jest.Mock;

const renderHandlers = () => {
  let handlers: any;
  const Probe = () => {
    handlers = useScrollEventsHandlersDefault(
      {current: null} as any,
      {value: 0} as any,
    );
    return null;
  };
  act(() => {
    TestRenderer.create(<Probe />);
  });
  return handlers;
};

describe('useScrollEventsHandlersDefault', () => {
  beforeEach(() => {
    scrollToMock.mockReset();
  });

  it('does not call scrollTo again from the events its own scrollTo emits', () => {
    const {handleOnScroll, handleOnEndDrag, handleOnMomentumEnd} =
      renderHandlers();
    const event = {contentOffset: {y: 162}};
    const context = {
      shouldLockInitialPosition: true,
      initialContentOffsetY: 161.99994,
    };
    scrollToMock.mockImplementation(() => {
      handleOnScroll(event, context);
      handleOnMomentumEnd(event, context);
    });

    handleOnScroll(event, context);
    expect(scrollToMock).toHaveBeenCalledTimes(1);

    handleOnMomentumEnd(event, context);
    expect(scrollToMock).toHaveBeenCalledTimes(2);

    handleOnEndDrag(event, context);
    expect(scrollToMock).toHaveBeenCalledTimes(3);
  });
});
