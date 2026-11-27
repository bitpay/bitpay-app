import React from 'react';
import {act, fireEvent, render} from '@test/render';
import Pin from './Pin';

const mockDispatch = jest.fn();
const mockSimplePrompt = jest.fn();
const mockIsSensorAvailable = jest.fn();
const mockCheckFaceIdPermissions = jest.fn();

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isSensorAvailable: mockIsSensorAvailable,
    simplePrompt: mockSimplePrompt,
  })),
  BiometryTypes: {FaceID: 'FaceID', TouchID: 'TouchID'},
}));

const mockState = {APP: {pinLockActive: false, biometricLockActive: false}};

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
  useLogger: () => ({debug: jest.fn(), error: jest.fn()}),
  useMount: jest.requireActual('../../../utils/hooks/useMount').useMount,
}));

jest.mock('../../../utils/helper-methods', () => ({
  sleep: () => Promise.resolve(),
}));

jest.mock(
  '../../tabs/settings/security/components/EnableLockWarningModal',
  () => {
    const ReactLib = require('react');
    const {Pressable} = require('react-native');
    return {
      __esModule: true,
      default: ({isVisible, onConfirm}: any) =>
        isVisible
          ? ReactLib.createElement(Pressable, {
              testID: 'lock-warning-confirm',
              onPress: onConfirm,
            })
          : null,
    };
  },
);

jest.mock('../../../store/app', () => ({
  AppActions: {
    biometricLockActive: (active: boolean) => ({
      type: 'TEST/BIOMETRIC_LOCK',
      active,
    }),
    setPinInteractionDone: () => ({type: 'TEST/PIN_DONE'}),
  },
  AppEffects: {
    checkFaceIdPermissions: () => mockCheckFaceIdPermissions(),
  },
}));

jest.mock('../../../components/button/Button', () => {
  const ReactLib = require('react');
  const {Pressable} = require('react-native');
  return {
    __esModule: true,
    default: ({children, ...props}: any) =>
      ReactLib.createElement(Pressable, props, children),
  };
});

const renderPin = (navigation: object) =>
  render(
    <Pin
      navigation={navigation as any}
      route={{key: 'Pin', name: 'Pin'} as any}
    />,
  );

describe('Pin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.APP.pinLockActive = false;
    mockIsSensorAvailable.mockResolvedValue({
      available: true,
      biometryType: 'FaceID',
    });
  });

  it.each([false, true])(
    'continues only when biometric verification succeeds (%s)',
    async success => {
      mockSimplePrompt.mockResolvedValue({success});
      const navigation = {
        replace: jest.fn(),
        isFocused: () => true,
      };
      const {getByTestId} = renderPin(navigation);
      await act(async () => undefined);
      fireEvent.press(getByTestId('biometric-button'));
      await act(async () =>
        fireEvent.press(getByTestId('lock-warning-confirm')),
      );

      expect(mockCheckFaceIdPermissions).toHaveBeenCalledTimes(1);
      expect(mockSimplePrompt).toHaveBeenCalledWith({
        promptMessage: 'Verify your identity',
      });
      if (success) {
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'TEST/BIOMETRIC_LOCK',
          active: true,
        });
        expect(navigation.replace).toHaveBeenCalledWith('TermsOfUse');
      } else {
        expect(mockDispatch).not.toHaveBeenCalled();
        expect(navigation.replace).not.toHaveBeenCalled();
      }
    },
  );

  it('does not turn on biometrics until the warning is confirmed', async () => {
    const navigation = {replace: jest.fn(), isFocused: () => true};
    const {getByTestId} = renderPin(navigation);
    await act(async () => undefined);

    await act(async () => fireEvent.press(getByTestId('biometric-button')));

    expect(getByTestId('lock-warning-confirm')).toBeTruthy();
    expect(mockSimplePrompt).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('skips to the terms when the app lock is already set up', () => {
    mockState.APP.pinLockActive = true;
    const navigation = {replace: jest.fn(), isFocused: () => true};

    const {queryByTestId} = renderPin(navigation);

    expect(navigation.replace).toHaveBeenCalledWith('TermsOfUse');
    expect(queryByTestId('pin-button')).toBeNull();
  });
});
