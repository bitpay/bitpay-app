import {PERF_DEBUG, performanceLog} from './performanceDebug';

describe('performanceDebug', () => {
  it('is disabled by default and does not emit logs', () => {
    const logSpy = jest
      .spyOn(globalThis.console, 'log')
      .mockImplementation(() => undefined);

    performanceLog('[PERF-TEST]');

    expect(PERF_DEBUG).toBe(false);
    expect(logSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
