import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
import About from './About';
import * as LogActions from '../../../../store/log/log.actions';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const SESSION_LOGS_EASTER_EGG_TAP_COUNT = 5;
let mockSessionLogsProdEnabled = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../components/styled/Containers', () => ({
  ActiveOpacity: 0.7,
  Hr: () => {
    const {View} = require('react-native');
    return <View testID="hr" />;
  },
  Setting: ({children, onPress}: any) => {
    const {TouchableOpacity} = require('react-native');
    return <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>;
  },
  SettingTitle: ({children}: any) => {
    const {Text} = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('../SettingsRoot', () => ({
  SettingsComponent: ({children}: any) => {
    const {View} = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../../../../components/button/Button', () => ({
  __esModule: true,
  default: ({children, onPress}: any) => {
    const {Text, TouchableOpacity} = require('react-native');
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../../../../assets/img/angle-right.svg', () => 'AngleRight');

jest.mock('../../../../constants', () => ({
  URL: {
    HELP_AND_SUPPORT: 'https://support.example.test',
    TOU_WALLET: 'https://terms.example.test',
    PRIVACY_POLICY: 'https://privacy.example.test',
    ACCESSIBILITY_STATEMENT: 'https://accessibility.example.test',
  },
}));

jest.mock('../../../../constants/config', () => ({
  APP_VERSION: '1.2.3',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('../../../../store/app/app.effects', () => ({
  openUrlWithInAppBrowser: jest.fn(),
  shareApp: jest.fn(),
}));

jest.mock('../../../../store/analytics/analytics.effects', () => ({
  Analytics: {
    track: jest.fn(),
  },
}));

jest.mock('../../../../lib/crash-test', () => ({
  triggerJsCrash: jest.fn(),
  triggerNativeCrash: jest.fn(),
}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    clearLogs: jest.fn(),
  },
}));

jest.mock('../../../../utils/sessionLogs', () => {
  return {
    SESSION_LOGS_EASTER_EGG_TAP_COUNT: 5,
    clearStoredSessionLogs: jest.fn(),
    getSessionLogsProdEnabled: jest.fn(() => mockSessionLogsProdEnabled),
    setSessionLogsProdEnabled: jest.fn(),
  };
});

const mockSessionLogs = jest.requireMock('../../../../utils/sessionLogs');
const mockLogManager = jest.requireMock(
  '../../../../managers/LogManager',
).logManager;

describe('About session logs easter egg', () => {
  const originalDev = global.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    global.__DEV__ = false;
    mockSessionLogsProdEnabled = false;
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('keeps Session Log hidden in production until 5 version taps enable it', () => {
    const {getByText, queryByText} = render(<About />);
    const version = getByText('1.2.3');

    expect(queryByText('Session Log')).toBeNull();

    for (let i = 0; i < SESSION_LOGS_EASTER_EGG_TAP_COUNT - 1; i++) {
      fireEvent.press(version);
    }

    expect(queryByText('Session Log')).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();

    fireEvent.press(version);

    expect(mockSessionLogs.setSessionLogsProdEnabled).toHaveBeenCalledWith(
      true,
    );
    expect(Alert.alert).toHaveBeenCalledWith('Session logs activated');
    expect(queryByText('Session Log')).not.toBeNull();
  });

  it('disables Session Log after 5 more taps in the same mounted screen', () => {
    const {getByText, queryByText} = render(<About />);
    const version = getByText('1.2.3');

    for (let i = 0; i < SESSION_LOGS_EASTER_EGG_TAP_COUNT; i++) {
      fireEvent.press(version);
    }

    expect(queryByText('Session Log')).not.toBeNull();
    expect(mockSessionLogs.setSessionLogsProdEnabled).toHaveBeenLastCalledWith(
      true,
    );

    jest.clearAllMocks();

    for (let i = 0; i < SESSION_LOGS_EASTER_EGG_TAP_COUNT - 1; i++) {
      fireEvent.press(version);
    }

    expect(queryByText('Session Log')).not.toBeNull();
    expect(mockSessionLogs.setSessionLogsProdEnabled).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();

    fireEvent.press(version);

    expect(mockSessionLogs.setSessionLogsProdEnabled).toHaveBeenCalledWith(
      false,
    );
    expect(mockLogManager.clearLogs).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(LogActions.clear());
    expect(mockSessionLogs.clearStoredSessionLogs).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Session logs disabled');
    expect(queryByText('Session Log')).toBeNull();
  });

  it('keeps Session Log visible in DEV without using the easter egg', () => {
    global.__DEV__ = true;

    const {getByText, queryByText} = render(<About />);

    expect(queryByText('Session Log')).not.toBeNull();

    fireEvent.press(getByText('1.2.3'));

    expect(mockSessionLogs.setSessionLogsProdEnabled).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
