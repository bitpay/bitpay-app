import {PERF_DEBUG, performanceLog} from '../utils/performanceDebug';

type ReduxPerformanceSnapshot = {
  actionType: string;
  dispatchDurationMs: number;
  changedSlices: string[];
  completedAt: number;
};

let activeActionType = 'unknown';
let activeActionStartedAt = 0;
let lastSnapshot: ReduxPerformanceSnapshot | undefined;

const round = (value: number) => Math.round(value * 10) / 10;

export const beginReduxAction = (actionType: string) => {
  if (!PERF_DEBUG) {
    return;
  }
  activeActionType = actionType;
  activeActionStartedAt = performance.now();
};

export const completeReduxAction = (
  actionType: string,
  dispatchDurationMs: number,
  changedSlices: string[],
) => {
  if (!PERF_DEBUG) {
    return;
  }

  lastSnapshot = {
    actionType,
    dispatchDurationMs: round(dispatchDurationMs),
    changedSlices,
    completedAt: performance.now(),
  };

  performanceLog(
    `[PERF-REDUX] action:${actionType} dispatchMs:${round(
      dispatchDurationMs,
    )} changedSlices:${changedSlices.join(',') || 'none'}`,
  );
};

export const logReducerDuration = (actionType: string, durationMs: number) => {
  if (!PERF_DEBUG || durationMs < 0.5) {
    return;
  }

  performanceLog(
    `[PERF-REDUX] reducer action:${actionType} durationMs:${round(durationMs)}`,
  );
};

export const logPersistPhase = (
  phase: string,
  durationMs: number,
  key?: string | number,
) => {
  if (!PERF_DEBUG || durationMs < 0.5) {
    return;
  }

  performanceLog(
    `[PERF-PERSIST] phase:${phase} key:${String(
      key ?? 'root',
    )} durationMs:${round(durationMs)} action:${activeActionType}`,
  );
};

export const logPersistWrite = (durationMs: number, bytes: number) => {
  if (!PERF_DEBUG) {
    return;
  }

  const actionElapsedMs = activeActionStartedAt
    ? performance.now() - activeActionStartedAt
    : -1;

  performanceLog(
    `[PERF-PERSIST] phase:mmkv.set bytes:${bytes} durationMs:${round(
      durationMs,
    )} action:${activeActionType} actionElapsedMs:${round(actionElapsedMs)}`,
  );
};

export const getReduxPerformanceSnapshot = () => lastSnapshot;
