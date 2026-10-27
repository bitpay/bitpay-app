import {
  beginReduxAction,
  completeReduxAction,
  getReduxPerformanceSnapshot,
  logPersistPhase,
  logPersistWrite,
  logReducerDuration,
} from './performanceDiagnostics';

describe('performanceDiagnostics', () => {
  it('does not collect diagnostics when performance debug is disabled', () => {
    beginReduxAction('TEST/ACTION');
    completeReduxAction('TEST/ACTION', 10, ['APP']);
    logReducerDuration('TEST/ACTION', 10);
    logPersistPhase('test', 10);
    logPersistWrite(10, 100);

    expect(getReduxPerformanceSnapshot()).toBeUndefined();
  });
});
