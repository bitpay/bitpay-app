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

  it('redacts private data from the Sentry breadcrumb and the session log', () => {
    const {logManager} = require('./LogManager');

    logManager.error('Mnemonic string is invalid: abandon\nability able');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'log',
      message: 'Mnemonic string is invalid: [...]',
      level: 'error',
    });
    expect(logManager.getLogs()).toEqual([
      expect.objectContaining({message: 'Mnemonic string is invalid: [...]'}),
    ]);
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

  it.each([
    [
      'walletPrivKey',
      'failed with walletPrivKey: deadbeef01',
      'failed with walletPrivKey:[...]',
    ],
    [
      'xprv',
      'failed with xprv9s21ZrQH143K3QTDL4LXw2F7HEK3 here',
      'failed with [...] here',
    ],
    [
      'tprv',
      'failed with tprv8ZgxMBicQKsPd9TeAdPADNnSyH9SSbrd here',
      'failed with [...] here',
    ],
  ])(
    'redacts a %s value in the session log and Sentry breadcrumb',
    (_kind, input, expected) => {
      const {logManager} = require('./LogManager');

      logManager.error(input);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'log',
        message: expected,
        level: 'error',
      });
      expect(logManager.getLogs()).toEqual([
        expect.objectContaining({message: expected}),
      ]);
    },
  );

  it('redacts key material in a custom Sentry breadcrumb message', () => {
    const {logManager} = require('./LogManager');

    logManager.warnWithSentryMessage(
      'local walletPrivKey=cafebabe',
      'sentry tprv8ZgxMBicQKsPd9TeAdPADNnSyH9SSbrd here',
    );

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'log',
      message: 'sentry [...] here',
      level: 'warning',
    });
    expect(logManager.getLogs()).toEqual([
      expect.objectContaining({message: 'local walletPrivKey:[...]'}),
    ]);
  });
});
