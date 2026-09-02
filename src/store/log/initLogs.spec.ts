import {LogLevel} from './log.models';
import {LogActionTypes, AddLog} from './log.types';

const mockStorage = {
  getString: jest.fn(),
  set: jest.fn(),
};

jest.mock('../index', () => ({
  get storage() {
    return mockStorage;
  },
}));

const entry = (message: string): AddLog => ({
  type: LogActionTypes.ADD_PERSISTED_LOG,
  payload: {level: LogLevel.Error, message, timestamp: '2026-09-02T11:20:59Z'},
});

// Module-level `drained` has to reset between tests
const getFreshModule = () => {
  let mod!: typeof import('./initLogs');
  jest.isolateModules(() => {
    mod = require('./initLogs');
  });
  return mod;
};

describe('initLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getString.mockReturnValue(undefined);
  });

  it('buffers logs added before the store exists, without touching MMKV', () => {
    const {add} = getFreshModule();
    add(entry('before store'));
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  it('dispatches buffered logs once on drain and empties the buffer', () => {
    const {add, drainAndDispatch} = getFreshModule();
    const dispatch = jest.fn();
    add(entry('first'));
    add(entry('second'));

    drainAndDispatch(dispatch);
    expect(dispatch).toHaveBeenCalledTimes(2);

    dispatch.mockClear();
    drainAndDispatch(dispatch);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('appends to persist:logs instead of dispatching once the store is up', () => {
    const {add, drainAndDispatch} = getFreshModule();
    const dispatch = jest.fn();
    drainAndDispatch(dispatch);
    dispatch.mockClear();

    mockStorage.getString.mockReturnValue(
      JSON.stringify([entry('older').payload]),
    );
    add(entry('Backup write failed - ENOENT'));

    expect(dispatch).not.toHaveBeenCalled();
    expect(mockStorage.set).toHaveBeenCalledTimes(1);
    const [key, written] = mockStorage.set.mock.calls[0];
    expect(key).toBe('persist:logs');
    expect(JSON.parse(written)).toEqual([
      entry('older').payload,
      entry('Backup write failed - ENOENT').payload,
    ]);
  });

  it('keeps only the newest 500 entries', () => {
    const {add, drainAndDispatch} = getFreshModule();
    drainAndDispatch(jest.fn());

    mockStorage.getString.mockReturnValue(
      JSON.stringify(
        Array.from({length: 500}, (_, i) => entry(`old ${i}`).payload),
      ),
    );
    add(entry('newest'));

    const written = JSON.parse(mockStorage.set.mock.calls[0][1]);
    expect(written).toHaveLength(500);
    expect(written[0].message).toBe('old 1');
    expect(written[499].message).toBe('newest');
  });

  it('swallows MMKV failures so logging never breaks the caller', () => {
    const {add, drainAndDispatch} = getFreshModule();
    drainAndDispatch(jest.fn());
    mockStorage.set.mockImplementation(() => {
      throw new Error('MMKV full');
    });

    expect(() => add(entry('boom'))).not.toThrow();
  });
});
