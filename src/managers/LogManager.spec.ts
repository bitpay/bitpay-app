import * as Sentry from '@sentry/react-native';
import {isSessionLogsEnabled} from '../utils/sessionLogs';

jest.mock('../utils/sessionLogs', () => ({
  isSessionLogsEnabled: jest.fn(),
}));

describe('LogManager', () => {
  const originalDev = global.__DEV__;
  const breadcrumbCases = [
    ['debug', 'debug'],
    ['info', 'info'],
    ['warn', 'warning'],
    ['error', 'error'],
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    global.__DEV__ = false;
    (isSessionLogsEnabled as jest.Mock).mockReturnValue(true);
    const {logManager} = require('./LogManager');
    logManager.clearLogs();
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it('stores session logs when session logs are enabled', () => {
    const {logManager} = require('./LogManager');

    logManager.info('enabled log');

    expect(logManager.getLogs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({message: 'enabled log'}),
      ]),
    );
  });

  describe.each([
    ['DEV', true, true],
    ['production with session logs disabled', false, false],
  ] as const)('%s', (_environment, isDev, sessionLogsEnabled) => {
    it.each(breadcrumbCases)(
      'keeps the %s Sentry breadcrumb unchanged',
      (method, sentryLevel) => {
        global.__DEV__ = isDev;
        (isSessionLogsEnabled as jest.Mock).mockReturnValue(sessionLogsEnabled);
        const {logManager} = require('./LogManager');

        logManager[method](`${method} breadcrumb`);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: 'log',
          message: `${method} breadcrumb`,
          level: sentryLevel,
        });
        expect(logManager.getLogs()).toHaveLength(sessionLogsEnabled ? 1 : 0);
      },
    );
  });

  it('keeps custom Sentry breadcrumb messages unchanged when session logs are disabled', () => {
    (isSessionLogsEnabled as jest.Mock).mockReturnValue(false);
    const {logManager} = require('./LogManager');

    logManager.warnWithSentryMessage('local details', 'safe breadcrumb');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'log',
      message: 'safe breadcrumb',
      level: 'warning',
    });
    expect(logManager.getLogs()).toEqual([]);
  });
});
