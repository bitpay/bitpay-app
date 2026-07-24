import React from 'react';
import {fireEvent, render} from '@test/render';
import Amount from './Amount';

const mockDispatch = jest.fn();
const mockVirtualKeyboardRender = jest.fn();
const mockButtonRender = jest.fn();
const mockOnSubmit = jest.fn();
const mockState = {
  APP: {
    defaultAltCurrency: {isoCode: 'USD'},
    showArchaxBanner: false,
  },
  RATE: {
    rates: {},
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('../../utils/hooks/useAppSelector', () => ({
  __esModule: true,
  default: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../utils/reactPerformanceProfiler', () => ({
  logReactProfiler: jest.fn(),
}));

jest.mock('../haptic-feedback/haptic', () => jest.fn());

jest.mock('react-native-keyevent', () => ({
  onKeyUpListener: jest.fn(),
  removeKeyUpListener: jest.fn(),
}));

jest.mock('../virtual-keyboard/VirtualKeyboard', () => {
  const ReactLib = require('react');
  const {Pressable} = require('react-native');

  const MockVirtualKeyboard = ReactLib.memo(
    ({onCellPress}: {onCellPress: (value: string) => void}) => {
      mockVirtualKeyboardRender();
      return ReactLib.createElement(Pressable, {
        testID: 'amount-key-1',
        onPress: () => onCellPress('1'),
      });
    },
  );

  return {
    __esModule: true,
    default: MockVirtualKeyboard,
  };
});

jest.mock('../button/Button', () => {
  const ReactLib = require('react');
  const {Pressable, Text} = require('react-native');

  const MockButton = ReactLib.memo(
    ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      mockButtonRender();
      return ReactLib.createElement(
        Pressable,
        {...props, testID: 'amount-continue'},
        ReactLib.createElement(Text, null, children),
      );
    },
  );

  return {
    __esModule: true,
    default: MockButton,
  };
});

describe('Amount performance boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the keyboard and unchanged submit button out of amount updates', () => {
    const {getByTestId, getByText} = render(<Amount onSubmit={mockOnSubmit} />);

    expect(mockVirtualKeyboardRender).toHaveBeenCalledTimes(1);
    expect(mockButtonRender).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('amount-key-1'));

    expect(getByText('1')).toBeTruthy();
    expect(mockVirtualKeyboardRender).toHaveBeenCalledTimes(1);
    expect(mockButtonRender).toHaveBeenCalledTimes(2);

    fireEvent.press(getByTestId('amount-key-1'));

    expect(getByText('11')).toBeTruthy();
    expect(mockVirtualKeyboardRender).toHaveBeenCalledTimes(1);
    expect(mockButtonRender).toHaveBeenCalledTimes(2);

    expect(getByText('Continue')).toBeTruthy();
    fireEvent.press(getByTestId('amount-continue'));
    expect(mockOnSubmit).toHaveBeenCalledWith(11);
  });
});
