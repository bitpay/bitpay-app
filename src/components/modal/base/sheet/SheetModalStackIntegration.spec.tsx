import React from 'react';
import {View} from 'react-native';
import {act, render} from '@test/render';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import SheetModal from './SheetModal';

jest.unmock('@gorhom/bottom-sheet');

type NativeSheet = {
  props: any;
  index: number;
  changes: jest.Mock;
  close: jest.Mock;
  forceClose: jest.Mock;
  snapToIndex: jest.Mock;
};
const mockNativeSheets: NativeSheet[] = [];

// Keep the real SheetModal, Gorhom modal/provider, portal and BottomSheetView.
// Replace only the native animation/layout boundary, including its view context.
jest.mock('@gorhom/bottom-sheet/lib/commonjs/components/bottomSheet', () => {
  const MockReact = require('react');
  const NativeView = require('react-native').View;
  const {useSharedValue} = require('react-native-reanimated');
  const {
    BottomSheetInternalProvider,
  } = require('@gorhom/bottom-sheet/lib/commonjs/contexts/internal');

  return {
    __esModule: true,
    default: MockReact.forwardRef((props: any, ref: any) => {
      const sheet = MockReact.useMemo(() => {
        const entry = {
          props,
          index: -1,
          changes: jest.fn(),
          close: jest.fn(),
          forceClose: jest.fn(),
          snapToIndex: jest.fn(),
        };
        mockNativeSheets.push(entry);
        return entry;
      }, []);
      sheet.props = props;
      MockReact.useImperativeHandle(ref, () => sheet);
      const animatedScrollableState = useSharedValue({contentOffsetY: 0});
      const animatedLayoutState = useSharedValue({footerHeight: 0});
      return (
        <BottomSheetInternalProvider
          value={{
            animatedScrollableState,
            animatedLayoutState,
            enableDynamicSizing: props.enableDynamicSizing,
          }}>
          <NativeView>{props.children}</NativeView>
        </BottomSheetInternalProvider>
      );
    }),
  };
});

// Match the pinned native boundary: both callbacks may omit unchanged indices,
// but a completed animation to -1 always emits onClose, even from index -1.
const startAnimation = (sheet: NativeSheet, target: number) =>
  act(() => {
    if (target !== sheet.index) {
      sheet.props.onAnimate?.(sheet.index, target, 600, 300);
    }
  });
const finishAnimation = (sheet: NativeSheet, target: number) =>
  act(() => {
    if (target !== sheet.index) {
      sheet.changes(target);
      sheet.props.onChange(target, 300, 0);
    }
    if (target === -1) sheet.props.onClose();
    sheet.index = target;
  });
const flushFrames = () => act(() => jest.runOnlyPendingTimers());

describe('SheetModal with the real Gorhom stack', () => {
  beforeEach(() => {
    mockNativeSheets.length = 0;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  function mountPair() {
    const hideA = jest.fn();
    const hideB = jest.fn();
    const closeA = jest.fn();
    const closeB = jest.fn();
    const tree = (visibleA: boolean, visibleB: boolean) => (
      <BottomSheetModalProvider>
        <SheetModal
          modalLibrary="bottom-sheet"
          isVisible={visibleA}
          onBackdropPress={closeA}
          onModalHide={hideA}
          snapPoints={['50%']}>
          <View testID="sheet-A" />
        </SheetModal>
        <SheetModal
          modalLibrary="bottom-sheet"
          isVisible={visibleB}
          onBackdropPress={closeB}
          onModalHide={hideB}
          snapPoints={['50%']}>
          <View testID="sheet-B" />
        </SheetModal>
      </BottomSheetModalProvider>
    );
    const view = render(tree(true, false));
    flushFrames();
    const a = mockNativeSheets[0];
    const update = (visibleA: boolean, visibleB: boolean) =>
      view.rerender(tree(visibleA, visibleB));
    const interrupt = () => {
      startAnimation(a, 0);
      update(true, true);
      flushFrames();
      const b = mockNativeSheets[1];
      startAnimation(b, 0);
      finishAnimation(b, 0);
      expect(a.close).toHaveBeenCalledTimes(1);
      return b;
    };
    return {view, a, update, interrupt, hideA, hideB, closeA};
  }

  it.each([false, true])(
    'removes a parent-hidden interrupted sheet before the top sheet closes (hidden before minimization completion: %s)',
    hideBeforeCompletion => {
      const pair = mountPair();
      const b = pair.interrupt();
      if (hideBeforeCompletion) pair.update(false, true);
      // A never completed its opening: native index is still -1, so only
      // onClose fires here. No synthetic onChange(0) or onChange(-1).
      finishAnimation(pair.a, -1);
      if (!hideBeforeCompletion) pair.update(false, true);
      expect(pair.a.changes).not.toHaveBeenCalled();
      expect(pair.hideA).toHaveBeenCalledTimes(1);
      expect(pair.view.queryByTestId('sheet-A')).toBeNull();
      expect(pair.closeA).not.toHaveBeenCalled();

      pair.update(false, false);
      finishAnimation(b, -1);
      flushFrames();
      expect(pair.a.snapToIndex).not.toHaveBeenCalled();
      expect(pair.hideA).toHaveBeenCalledTimes(1);
      expect(pair.hideB).toHaveBeenCalledTimes(1);
      expect(pair.view.queryByTestId('sheet-A')).toBeNull();
    },
  );

  it('still restores an interrupted sheet whose parent remains visible', () => {
    const pair = mountPair();
    const b = pair.interrupt();
    finishAnimation(pair.a, -1);
    pair.update(true, false);
    finishAnimation(b, -1);
    expect(pair.a.snapToIndex).toHaveBeenCalledTimes(1);
    expect(pair.a.snapToIndex).toHaveBeenCalledWith(0);
    startAnimation(pair.a, 0);
    finishAnimation(pair.a, 0);
    expect(pair.hideA).not.toHaveBeenCalled();
    expect(pair.view.getByTestId('sheet-A')).toBeTruthy();
  });

  it('waits for native readiness when hidden before the first animation starts', () => {
    const pair = mountPair();
    pair.update(false, false);
    expect(pair.a.forceClose).not.toHaveBeenCalled();
    expect(pair.hideA).not.toHaveBeenCalled();
    startAnimation(pair.a, 0);
    expect(pair.a.forceClose).toHaveBeenCalledTimes(1);
    finishAnimation(pair.a, -1);
    expect(pair.hideA).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss before the native sheet mounts on the presentation frame', () => {
    const onHide = jest.fn();
    const close = jest.fn();
    const tree = (visible: boolean) => (
      <BottomSheetModalProvider>
        <SheetModal
          modalLibrary="bottom-sheet"
          isVisible={visible}
          onBackdropPress={close}
          onModalHide={onHide}
          snapPoints={['50%']}>
          <View />
        </SheetModal>
      </BottomSheetModalProvider>
    );
    const view = render(tree(true));
    view.rerender(tree(false));
    expect(mockNativeSheets).toHaveLength(0);
    expect(onHide).not.toHaveBeenCalled();
    flushFrames();
    expect(mockNativeSheets).toHaveLength(1);
    const sheet = mockNativeSheets[0];
    expect(sheet.forceClose).not.toHaveBeenCalled();
    startAnimation(sheet, 0);
    expect(sheet.forceClose).toHaveBeenCalledTimes(1);
    finishAnimation(sheet, -1);
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps hidden interrupted sheets out of the stack across ten cycles', () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      const pair = mountPair();
      const b = pair.interrupt();
      if (cycle % 2 === 0) pair.update(false, true);
      finishAnimation(pair.a, -1);
      if (cycle % 2 !== 0) pair.update(false, true);
      expect(pair.hideA).toHaveBeenCalledTimes(1);
      pair.update(false, false);
      finishAnimation(b, -1);
      flushFrames();
      expect(pair.a.snapToIndex).not.toHaveBeenCalled();
      expect(pair.hideA).toHaveBeenCalledTimes(1);
      expect(pair.view.queryByTestId('sheet-A')).toBeNull();
      pair.view.unmount();
      mockNativeSheets.length = 0;
    }
  });
});
