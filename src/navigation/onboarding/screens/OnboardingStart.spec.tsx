import React from 'react';
import {fireEvent, render} from '@test/render';
import OnboardingStart from './OnboardingStart';

const mockDispatch = jest.fn();
const mockAnalyticsTrack = jest.fn(
  (event: string, properties: Record<string, unknown>) => ({
    type: 'TEST/ANALYTICS_TRACK',
    payload: {event, properties},
  }),
);
const mockTranslate = (key: string) => key;
let mockState: {
  APP: {onboardingKeyStatus: string};
  WALLET: {keys: Record<string, unknown>};
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('react-navigation-backhandler', () => ({
  useAndroidBackHandler: jest.fn(),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {
    track: (event: string, properties: Record<string, unknown>): unknown =>
      mockAnalyticsTrack(event, properties),
  },
}));

jest.mock('../../../store/app/onboardingKey.effects', () => ({
  startOnboardingKeyCreation: () => ({type: 'TEST/START_KEY_CREATION'}),
  cancelOnboardingKeyCreation: () => ({type: 'TEST/CANCEL_KEY_CREATION'}),
}));

jest.mock('../../wallet/components/RestoreOrImportSheet', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');
  return {
    RestoreOrImportSheet: ({isVisible, context}: any) =>
      isVisible
        ? ReactLib.createElement(View, {
            testID: 'restore-or-import-sheet',
            accessibilityLabel: context,
          })
        : null,
  };
});

jest.mock('../../../components/button/Button', () => {
  const ReactLib = require('react');
  const {Pressable} = require('react-native');

  return {
    __esModule: true,
    default: ({children, ...props}: any) =>
      ReactLib.createElement(Pressable, props, children),
  };
});

const dispatchedTypes = () =>
  mockDispatch.mock.calls.map(([action]) => action.type);

const renderScreen = () => {
  const navigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };

  return {
    navigation,
    ...render(
      <OnboardingStart
        navigation={navigation as any}
        route={{key: 'OnboardingStart', name: 'OnboardingStart'} as any}
      />,
    ),
  };
};

describe('OnboardingStart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = {APP: {onboardingKeyStatus: 'idle'}, WALLET: {keys: {}}};
  });

  it('starts creating the key in the background and asks to protect the app', () => {
    const {getByTestId, navigation} = renderScreen();

    fireEvent.press(getByTestId('create-a-key-button'));

    expect(dispatchedTypes()).toContain('TEST/START_KEY_CREATION');
    expect(navigation.navigate).toHaveBeenCalledWith('Pin');
    expect(mockAnalyticsTrack).toHaveBeenCalledWith('Clicked Create New Key', {
      context: 'onboarding',
    });
  });

  it.each([
    ['a key is already being created', 'creating', {}],
    ['a connection is still pending', 'waiting', {}],
    ['the key already exists', 'idle', {'key-1': {}}],
  ])(
    'does not create another key when %s',
    (_case, onboardingKeyStatus, keys) => {
      mockState = {APP: {onboardingKeyStatus}, WALLET: {keys}};
      const {getByTestId, navigation} = renderScreen();

      fireEvent.press(getByTestId('create-a-key-button'));

      expect(dispatchedTypes()).not.toContain('TEST/START_KEY_CREATION');
      expect(navigation.navigate).toHaveBeenCalledWith('Pin');
    },
  );

  it('retries creating the key after a failure', () => {
    mockState = {APP: {onboardingKeyStatus: 'failed'}, WALLET: {keys: {}}};
    const {getByTestId} = renderScreen();

    fireEvent.press(getByTestId('create-a-key-button'));

    expect(dispatchedTypes()).toContain('TEST/START_KEY_CREATION');
  });

  it('drops the key being created and offers to restore or import', () => {
    const {getByTestId, queryByTestId} = renderScreen();

    expect(queryByTestId('restore-or-import-sheet')).toBeNull();

    fireEvent.press(getByTestId('i-already-have-a-key-button'));

    expect(dispatchedTypes()).toContain('TEST/CANCEL_KEY_CREATION');
    expect(
      getByTestId('restore-or-import-sheet').props.accessibilityLabel,
    ).toBe('onboarding');
    expect(mockAnalyticsTrack).toHaveBeenCalledWith(
      'Clicked I already have a Key',
      {context: 'onboarding'},
    );
  });
});
