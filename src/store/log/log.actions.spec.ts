import * as Sentry from '@sentry/react-native';
import * as LogActions from './log.actions';
import {LogActionTypes} from './log.types';

describe('log actions', () => {
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
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  describe.each([
    ['DEV', true],
    ['production', false],
  ] as const)('%s', (_environment, isDev) => {
    it.each(breadcrumbCases)(
      'keeps the %s Sentry breadcrumb unchanged',
      (method, sentryLevel) => {
        global.__DEV__ = isDev;

        const action = LogActions[method](`${method} breadcrumb`);

        expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
          category: 'log',
          message: `${method} breadcrumb`,
          level: sentryLevel,
        });
        expect(action).toEqual({
          type: LogActionTypes.ADD_LOG,
          payload: expect.objectContaining({
            message: `${method} breadcrumb`,
          }),
        });
      },
    );
  });
});
