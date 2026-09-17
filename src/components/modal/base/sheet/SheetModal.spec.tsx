import React from 'react';
import {act, fireEvent, render} from '@test/render';
import SheetModal from './SheetModal';

const mockPresent = jest.fn();
const mockDismiss = jest.fn();
const mockOnBackdropPress = jest.fn();
const mockOnModalHide = jest.fn();
const mockCancelAnimationFrame = jest.fn();
let mockBottomSheetModalProps: any;
let mockBottomSheetBackdropProps: any;
let mockGestureEnabled = true;
let mockGestureOnEnd: ((event: unknown, success: boolean) => void) | undefined;
let mockAnimationFrames = new Map<number, (timestamp: number) => void>();
let mockNextAnimationFrameId = 1;

jest.mock('@gorhom/bottom-sheet', () => {
  const MockReact = require('react');
  const {View} = require('react-native');

  const BottomSheetModal = MockReact.forwardRef((props: any, ref: any) => {
    mockBottomSheetModalProps = props;
    MockReact.useImperativeHandle(ref, () => ({
      present: mockPresent,
      dismiss: mockDismiss,
    }));
    const backdrop = props.backdropComponent?.({
      animatedIndex: {value: 0},
      animatedPosition: {value: 0},
      style: {},
    });
    return MockReact.createElement(
      View,
      {testID: 'bottom-sheet-modal'},
      backdrop,
      props.children,
    );
  });

  const BottomSheetBackdrop = (props: any) => {
    mockBottomSheetBackdropProps = props;
    return MockReact.createElement(View, {
      testID: 'gorhom-backdrop',
      accessible: props.accessible,
    });
  };

  const BottomSheetView = ({children}: any) =>
    MockReact.createElement(View, {testID: 'bottom-sheet-view'}, children);

  return {BottomSheetBackdrop, BottomSheetModal, BottomSheetView};
});

jest.mock('react-native-gesture-handler', () => {
  const actualGestureHandler = jest.requireActual(
    'react-native-gesture-handler',
  );
  const MockReact = require('react');
  const {Pressable} = require('react-native');

  return {
    ...actualGestureHandler,
    Gesture: {
      Tap: () => {
        const gesture = {
          enabled: (enabled: boolean) => {
            mockGestureEnabled = enabled;
            return gesture;
          },
          onEnd: (callback: (event: unknown, success: boolean) => void) => {
            mockGestureOnEnd = callback;
            return gesture;
          },
        };
        return gesture;
      },
    },
    GestureDetector: ({children}: any) =>
      MockReact.createElement(
        Pressable,
        {
          testID: 'controlled-backdrop-gesture',
          onPress: () => {
            if (mockGestureEnabled) {
              mockGestureOnEnd?.({}, true);
            }
          },
        },
        children,
      ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native');

  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
  };
});

jest.mock('../BaseModal', () => {
  const MockReact = require('react');
  const {View} = require('react-native');
  return ({isVisible}: any) =>
    MockReact.createElement(View, {
      testID: 'legacy-modal',
      accessibilityState: {expanded: isVisible},
    });
});

const bottomSheetProps = (isVisible: boolean, extraProps: object = {}) => ({
  isVisible,
  modalLibrary: 'bottom-sheet' as const,
  onBackdropPress: mockOnBackdropPress,
  onModalHide: mockOnModalHide,
  ...extraProps,
});

const confirmPresentation = () => {
  act(() => mockBottomSheetModalProps.onChange(0));
};

const confirmDismissal = () => {
  act(() => mockBottomSheetModalProps.onDismiss());
};

const flushAnimationFrames = () => {
  const callbacks = [...mockAnimationFrames.values()];
  mockAnimationFrames.clear();
  callbacks.forEach(callback => callback(0));
};

describe('SheetModal bottom-sheet lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomSheetModalProps = undefined;
    mockBottomSheetBackdropProps = undefined;
    mockGestureEnabled = true;
    mockGestureOnEnd = undefined;
    mockAnimationFrames = new Map();
    mockNextAnimationFrameId = 1;
    global.requestAnimationFrame = jest.fn(callback => {
      const frameId = mockNextAnimationFrameId++;
      mockAnimationFrames.set(frameId, callback);
      return frameId;
    });
    global.cancelAnimationFrame = mockCancelAnimationFrame.mockImplementation(
      frameId => {
        mockAnimationFrames.delete(frameId);
      },
    );
  });

  it('does not present or dismiss when initially hidden', () => {
    render(<SheetModal {...bottomSheetProps(false)} />);

    expect(mockPresent).not.toHaveBeenCalled();
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('presents exactly once when initially visible', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);

    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockPresent).toHaveBeenCalledTimes(1);
  });

  it('presents, dismisses, and reports one completed standard lifecycle', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(false)} />);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockPresent).toHaveBeenCalledTimes(1);

    confirmPresentation();
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    confirmDismissal();
    confirmDismissal();
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('waits for presentation confirmation before closing', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(false)} />);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockPresent).toHaveBeenCalledTimes(1);

    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).not.toHaveBeenCalled();

    confirmPresentation();
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('can close after native animation starts without reaching an open index', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    act(() => mockBottomSheetModalProps.onAnimate(-1, 0, 600, 300));
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    act(() => mockBottomSheetModalProps.onAnimate(-1, 0, 600, 300));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    confirmDismissal();
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('does not reuse native readiness from a previous presentation', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    act(() => mockBottomSheetModalProps.onAnimate(-1, 0, 600, 300));
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    confirmDismissal();
    // A stale start while idle must not make the next presentation dismissible.
    act(() => mockBottomSheetModalProps.onAnimate(-1, 0, 600, 300));
    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockPresent).toHaveBeenCalledTimes(2);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    act(() => mockBottomSheetModalProps.onAnimate(-1, 0, 600, 300));
    expect(mockDismiss).toHaveBeenCalledTimes(2);
  });

  it('reopens on the next frame after dismissal completes', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();

    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockPresent).toHaveBeenCalledTimes(1);

    confirmDismissal();
    expect(mockPresent).toHaveBeenCalledTimes(1);

    act(flushAnimationFrames);
    expect(mockPresent).toHaveBeenCalledTimes(2);
  });

  it('settles a rapid visible-hidden-visible-hidden sequence without duplicates', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(false)} />);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);

    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();

    confirmPresentation();
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    confirmDismissal();
    act(flushAnimationFrames);

    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('lets only the parent own backdrop dismissal', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();

    fireEvent.press(sheet.getByTestId('controlled-backdrop-gesture'));

    expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockBottomSheetBackdropProps.pressBehavior).toBe('none');

    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the backdrop noninteractive when dismissal is disabled', () => {
    const sheet = render(
      <SheetModal
        {...bottomSheetProps(true, {enableBackdropDismiss: false})}
      />,
    );

    fireEvent.press(sheet.getByTestId('controlled-backdrop-gesture'));

    expect(mockOnBackdropPress).not.toHaveBeenCalled();
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockBottomSheetBackdropProps.accessible).toBe(false);
  });

  it('cancels a queued reopen when unmounted', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    confirmDismissal();

    sheet.unmount();
    act(flushAnimationFrames);

    expect(mockCancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it('requests a parent close instead of reopening an externally dismissed sheet', () => {
    render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();
    // A provider replace/dismiss can complete while isVisible is still true.
    confirmDismissal();
    act(flushAnimationFrames);

    expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockDismiss).not.toHaveBeenCalled();
    confirmDismissal();
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('keeps a minimized sheet mounted until the provider restores it', () => {
    render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();
    act(() => mockBottomSheetModalProps.onChange(-1));
    act(flushAnimationFrames);
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockOnModalHide).not.toHaveBeenCalled();
    confirmPresentation();
    expect(mockPresent).toHaveBeenCalledTimes(1);
    expect(mockOnBackdropPress).not.toHaveBeenCalled();
  });

  it('ignores a stale restoration callback while a parent dismissal is pending', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    confirmPresentation();
    expect(mockDismiss).toHaveBeenCalledTimes(1);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    confirmDismissal();
    // A late callback from the old sheet must not consume the queued reopen.
    confirmPresentation();
    act(flushAnimationFrames);
    expect(mockPresent).toHaveBeenCalledTimes(2);
    expect(mockOnBackdropPress).not.toHaveBeenCalled();
  });

  it('can reopen after the parent acknowledges an external dismissal', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    confirmPresentation();
    confirmDismissal();
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    act(flushAnimationFrames);
    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockPresent).toHaveBeenCalledTimes(2);
    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('passes parent visibility directly to the legacy modal', () => {
    const modal = render(
      <SheetModal
        isVisible={true}
        modalLibrary="modal"
        onBackdropPress={mockOnBackdropPress}
      />,
    );

    expect(
      modal.getByTestId('legacy-modal').props.accessibilityState.expanded,
    ).toBe(true);
    expect(mockPresent).not.toHaveBeenCalled();
    expect(mockDismiss).not.toHaveBeenCalled();

    modal.rerender(
      <SheetModal
        isVisible={false}
        modalLibrary="modal"
        onBackdropPress={mockOnBackdropPress}
      />,
    );
    expect(
      modal.getByTestId('legacy-modal').props.accessibilityState.expanded,
    ).toBe(false);
  });
});
