import {isSessionLogsEnabled} from '../../utils/sessionLogs';
import {LogLevel} from './log.models';
import {LogActionTypes} from './log.types';
import {logReducer} from './log.reducer';

jest.mock('../../utils/sessionLogs', () => ({
  isSessionLogsEnabled: jest.fn(),
  PERSISTED_SESSION_LOGS_STORAGE_KEY: 'persist:logs',
}));

jest.mock('../index', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

const {storage: mockStorage} = jest.requireMock('../index');

describe('logReducer', () => {
  const logEntry = {
    timestamp: '2026-08-05T12:00:00.000Z',
    level: LogLevel.Info,
    message: 'test log',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isSessionLogsEnabled as jest.Mock).mockReturnValue(true);
    mockStorage.getString.mockReturnValue('[]');
  });

  it('does not append session logs when session logs are disabled', () => {
    (isSessionLogsEnabled as jest.Mock).mockReturnValue(false);

    const state = logReducer(undefined, {
      type: LogActionTypes.ADD_LOG,
      payload: logEntry,
    });

    expect(state.logs).toEqual([]);
  });

  it('appends session logs when session logs are enabled', () => {
    const state = logReducer(undefined, {
      type: LogActionTypes.ADD_LOG,
      payload: logEntry,
    });

    expect(state.logs).toEqual([logEntry]);
  });

  it('does not write persisted logs when session logs are disabled', () => {
    (isSessionLogsEnabled as jest.Mock).mockReturnValue(false);

    const state = logReducer(undefined, {
      type: LogActionTypes.ADD_PERSISTED_LOG,
      payload: logEntry,
    });

    expect(state.logs).toEqual([]);
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  it('writes persisted logs when session logs are enabled', () => {
    const state = logReducer(undefined, {
      type: LogActionTypes.ADD_PERSISTED_LOG,
      payload: logEntry,
    });

    expect(state.logs).toEqual([logEntry]);
    expect(mockStorage.set).toHaveBeenCalledWith(
      'persist:logs',
      JSON.stringify([logEntry]),
    );
  });
});
