import React from 'react';
import {AppState, AppStateStatus, StyleSheet, View} from 'react-native';
import {act, fireEvent, render} from '@test/render';
import SheetModal, {isModalLayoutSheetOpen} from './SheetModal';

const mockOnBackdropPress = jest.fn();
const mockOnModalHide = jest.fn();
let mockModalBottomSheetProps: any;
let mockSettleHandlers: Array<(index: number) => void> = [];
let mockModalBottomSheetRenders: Array<{index: number; hasChildren: boolean}> =
  [];
let mockBaseModalProps: any;

jest.mock('@swmansion/react-native-bottom-sheet', () => {
  const MockReact = require('react');
  const {View: RNView} = require('react-native');

  const ModalBottomSheet = (props: any) => {
    if (!mockSettleHandlers.includes(props.onSettle)) {
      mockSettleHandlers.push(props.onSettle);
    }
    mockModalBottomSheetProps = props;
    mockModalBottomSheetRenders.push({
      index: props.index,
      hasChildren: props.children != null,
    });
    return MockReact.createElement(
      RNView,
      {testID: 'modal-bottom-sheet'},
      props.children,
    );
  };

  return {ModalBottomSheet};
});

jest.mock('react-native-safe-area-context', () => {
  const {View: RNView} = require('react-native');

  return {
    SafeAreaView: RNView,
    useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
  };
});

jest.mock('../BaseModal', () => {
  const MockReact = require('react');
  const {View: RNView} = require('react-native');
  return (props: any) => {
    mockBaseModalProps = props;
    return MockReact.createElement(
      RNView,
      {
        testID: 'legacy-modal',
        accessibilityState: {expanded: props.isVisible},
      },
      props.children,
    );
  };
});

jest.mock('../../../blur/Blur', () => ({
  BlurContainer: () => null,
}));

const SheetContent = ({
  onMount,
  onUnmount,
}: {
  onMount?: () => void;
  onUnmount?: () => void;
}) => {
  React.useEffect(() => {
    onMount?.();
    return () => onUnmount?.();
  }, [onMount, onUnmount]);

  return <View testID="sheet-content" />;
};

const bottomSheetProps = (isVisible: boolean, extraProps: object = {}) => ({
  isVisible,
  modalLibrary: 'bottom-sheet' as const,
  onBackdropPress: mockOnBackdropPress,
  onModalHide: mockOnModalHide,
  ...extraProps,
});

const settleAt = (index: number) => {
  act(() => mockModalBottomSheetProps.onSettle(index));
};

describe('SheetModal bottom-sheet lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModalBottomSheetProps = undefined;
    mockSettleHandlers = [];
    mockModalBottomSheetRenders = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('keeps the sheet at its closed detent while hidden', () => {
    render(<SheetModal {...bottomSheetProps(false)} />);

    expect(mockModalBottomSheetProps.index).toBe(0);
  });

  it('opens and closes the sheet through parent visibility', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(false)} />);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(mockModalBottomSheetProps.index).toBe(1);

    settleAt(1);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockModalBottomSheetProps.index).toBe(0);

    settleAt(0);
    settleAt(0);
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('reports one hide for duplicate closed settles in the same batch', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    settleAt(1);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);

    act(() => {
      mockModalBottomSheetProps.onSettle(0);
      mockModalBottomSheetProps.onSettle(0);
    });

    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('ignores a late open settle after the parent hides it', () => {
    const sheet = render(
      <SheetModal {...bottomSheetProps(true)}>
        <SheetContent />
      </SheetModal>,
    );
    sheet.rerender(
      <SheetModal {...bottomSheetProps(false)}>
        <SheetContent />
      </SheetModal>,
    );

    settleAt(1);

    expect(sheet.getByTestId('sheet-content')).toBeTruthy();
    expect(mockOnModalHide).not.toHaveBeenCalled();
  });

  it('hides the content when the closed detent never settles', () => {
    jest.useFakeTimers();
    const sheet = render(
      <SheetModal {...bottomSheetProps(true)}>
        <SheetContent />
      </SheetModal>,
    );
    sheet.rerender(
      <SheetModal {...bottomSheetProps(false)}>
        <SheetContent />
      </SheetModal>,
    );

    act(() => jest.advanceTimersByTime(1000));
    expect(sheet.queryByTestId('sheet-content')).toBeNull();
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);

    settleAt(0);
    expect(mockOnModalHide).toHaveBeenCalledTimes(1);
  });

  it('keeps the hide deadline when the parent passes a new callback', () => {
    jest.useFakeTimers();
    const onModalHide = jest.fn();
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);
    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);

    act(() => jest.advanceTimersByTime(500));
    sheet.rerender(<SheetModal {...bottomSheetProps(false, {onModalHide})} />);
    act(() => jest.advanceTimersByTime(500));

    expect(mockOnModalHide).not.toHaveBeenCalled();
    expect(onModalHide).toHaveBeenCalledTimes(1);
  });

  it('does not report a hide for a sheet that never opened', () => {
    render(<SheetModal {...bottomSheetProps(false)} />);

    settleAt(0);

    expect(mockOnModalHide).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'dismisses through parent visibility when backgrounded (opening settled: %s)',
    settled => {
      let onAppStateChange: (status: AppStateStatus) => void = () => {};
      jest
        .spyOn(AppState, 'addEventListener')
        .mockImplementation((_, handler) => {
          onAppStateChange = handler;
          return {remove: jest.fn()};
        });
      const Parent = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <SheetModal
            {...bottomSheetProps(visible)}
            onBackdropPress={() => {
              mockOnBackdropPress();
              setVisible(false);
            }}
          />
        );
      };
      render(<Parent />);
      if (settled) {
        settleAt(1);
      }

      act(() => onAppStateChange('background'));
      expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
      expect(mockModalBottomSheetProps.index).toBe(0);
      act(() => onAppStateChange('background'));
      expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
      settleAt(0);
      expect(mockOnModalHide).toHaveBeenCalledTimes(1);
    },
  );

  it('lets only the parent own close requests', () => {
    const sheet = render(<SheetModal {...bottomSheetProps(true)} />);

    act(() => mockModalBottomSheetProps.onCloseRequest());

    expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
    expect(mockModalBottomSheetProps.index).toBe(1);
    expect(mockModalBottomSheetProps.detents[0]).toEqual({
      value: 0,
      programmatic: true,
    });

    sheet.rerender(<SheetModal {...bottomSheetProps(false)} />);
    expect(mockModalBottomSheetProps.index).toBe(0);
  });

  it('leaves close requests unhandled when dismissal is disabled', () => {
    render(
      <SheetModal
        {...bottomSheetProps(true, {enableBackdropDismiss: false})}
      />,
    );

    expect(mockModalBottomSheetProps.onCloseRequest).toBeUndefined();
  });

  it.each([
    [{}, 'content'],
    [{snapPoints: ['72%']}, '72%'],
    [{fullscreen: true}, '100%'],
  ])('sizes the open detent from %j', (extraProps, openDetent) => {
    render(<SheetModal {...bottomSheetProps(true, extraProps)} />);

    expect(mockModalBottomSheetProps.detents[1]).toBe(openDetent);
    expect(mockModalBottomSheetProps.topInset).toBe(0);
  });

  it('lays out default sheets full screen like the legacy modal', () => {
    const sheet = render(
      <SheetModal isVisible={true} onBackdropPress={mockOnBackdropPress}>
        <SheetContent />
      </SheetModal>,
    );

    expect(mockModalBottomSheetProps.detents).toEqual([
      {value: 0, programmatic: true},
      '100%',
    ]);
    expect(mockModalBottomSheetProps.surface).toBeUndefined();
    expect(mockModalBottomSheetProps.scrimColor).toBe('rgba(0, 0, 0, 0.4)');
    expect(mockModalBottomSheetProps.settleDuration).toBe(300);
    expect(sheet.getByTestId('sheet-content')).toBeTruthy();

    const backdrop = sheet.getByLabelText('Dismiss modal');
    let layout = backdrop.parent;
    while (layout && typeof layout.type !== 'string') {
      layout = layout.parent;
    }
    expect(StyleSheet.flatten(layout?.props.style)).toEqual(
      expect.objectContaining({flex: 1, justifyContent: 'flex-end'}),
    );
    fireEvent.press(backdrop);
    expect(mockOnBackdropPress).toHaveBeenCalledTimes(1);
  });

  it('lets the parent own close requests in the legacy layout', () => {
    render(
      <SheetModal
        isVisible={true}
        enableBackdropDismiss={false}
        onBackdropPress={mockOnBackdropPress}
      />,
    );

    expect(mockModalBottomSheetProps.onCloseRequest).toBe(mockOnBackdropPress);
  });

  it('tracks open legacy-layout sheets for other surfaces', () => {
    const sheet = render(
      <SheetModal isVisible={true} onBackdropPress={mockOnBackdropPress} />,
    );
    expect(isModalLayoutSheetOpen()).toBe(true);

    sheet.rerender(
      <SheetModal isVisible={false} onBackdropPress={mockOnBackdropPress} />,
    );
    expect(isModalLayoutSheetOpen()).toBe(true);

    settleAt(0);
    expect(isModalLayoutSheetOpen()).toBe(false);

    sheet.rerender(<SheetModal {...bottomSheetProps(true)} />);
    expect(isModalLayoutSheetOpen()).toBe(false);
  });

  it('tracks every open legacy-layout sheet until the last one closes', () => {
    const sheets = (firstVisible: boolean, secondVisible: boolean) => (
      <>
        <SheetModal
          isVisible={firstVisible}
          onBackdropPress={mockOnBackdropPress}
        />
        <SheetModal
          isVisible={secondVisible}
          onBackdropPress={mockOnBackdropPress}
        />
      </>
    );
    const view = render(sheets(true, true));

    view.rerender(sheets(false, true));
    act(() => mockSettleHandlers[0](0));
    expect(isModalLayoutSheetOpen()).toBe(true);

    view.rerender(sheets(false, false));
    act(() => mockSettleHandlers[1](0));
    expect(isModalLayoutSheetOpen()).toBe(false);
  });

  it('keeps top sheets on the legacy modal', () => {
    jest.useFakeTimers();
    const modal = render(
      <SheetModal
        isVisible={true}
        placement="top"
        modalLibrary="bottom-sheet"
        onBackdropPress={mockOnBackdropPress}
        onModalHide={mockOnModalHide}
      />,
    );

    expect(
      modal.getByTestId('legacy-modal').props.accessibilityState.expanded,
    ).toBe(true);
    expect(mockModalBottomSheetProps).toBeUndefined();
    expect(mockBaseModalProps.onModalHide).toBe(mockOnModalHide);

    modal.rerender(
      <SheetModal
        isVisible={false}
        placement="top"
        onBackdropPress={mockOnBackdropPress}
        onModalHide={mockOnModalHide}
      />,
    );
    expect(
      modal.getByTestId('legacy-modal').props.accessibilityState.expanded,
    ).toBe(false);
    act(() => jest.advanceTimersByTime(1000));
    expect(mockOnModalHide).not.toHaveBeenCalled();
  });

  it('does not mount bottom-sheet children while hidden', () => {
    const onMount = jest.fn();
    const sheet = render(
      <SheetModal {...bottomSheetProps(false)}>
        <SheetContent onMount={onMount} />
      </SheetModal>,
    );

    expect(sheet.queryByTestId('sheet-content')).toBeNull();
    expect(onMount).not.toHaveBeenCalled();
  });

  it('mounts bottom-sheet children in the same render that opens it', () => {
    const onMount = jest.fn();
    const content = <SheetContent onMount={onMount} />;
    const sheet = render(
      <SheetModal {...bottomSheetProps(false)}>{content}</SheetModal>,
    );

    sheet.rerender(
      <SheetModal {...bottomSheetProps(true)}>{content}</SheetModal>,
    );

    expect(mockModalBottomSheetProps.index).toBe(1);
    expect(
      mockModalBottomSheetRenders.find(({index}) => index === 1)?.hasChildren,
    ).toBe(true);
    expect(sheet.getByTestId('sheet-content')).toBeTruthy();
    expect(onMount).toHaveBeenCalledTimes(1);
  });

  it('keeps children mounted while closing and unmounts them once closed', () => {
    const onUnmount = jest.fn();
    const content = <SheetContent onUnmount={onUnmount} />;
    const sheet = render(
      <SheetModal {...bottomSheetProps(true)}>{content}</SheetModal>,
    );
    settleAt(1);

    sheet.rerender(
      <SheetModal {...bottomSheetProps(false)}>{content}</SheetModal>,
    );
    expect(sheet.getByTestId('sheet-content')).toBeTruthy();
    expect(onUnmount).not.toHaveBeenCalled();

    settleAt(0);
    expect(sheet.queryByTestId('sheet-content')).toBeNull();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });

  it('reopens during a close without remounting children', () => {
    const onMount = jest.fn();
    const onUnmount = jest.fn();
    const content = <SheetContent onMount={onMount} onUnmount={onUnmount} />;
    const sheet = render(
      <SheetModal {...bottomSheetProps(true)}>{content}</SheetModal>,
    );
    settleAt(1);

    sheet.rerender(
      <SheetModal {...bottomSheetProps(false)}>{content}</SheetModal>,
    );
    sheet.rerender(
      <SheetModal {...bottomSheetProps(true)}>{content}</SheetModal>,
    );
    settleAt(0);

    expect(mockModalBottomSheetProps.index).toBe(1);
    expect(sheet.getByTestId('sheet-content')).toBeTruthy();
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onUnmount).not.toHaveBeenCalled();
    expect(mockOnModalHide).not.toHaveBeenCalled();
  });
});
