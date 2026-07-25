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
  if (!__DEV__) {
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
  if (!__DEV__) {
    return;
  }

  lastSnapshot = {
    actionType,
    dispatchDurationMs: round(dispatchDurationMs),
    changedSlices,
    completedAt: performance.now(),
  };

  console.log(
    `[PERF-REDUX] action:${actionType} dispatchMs:${round(
      dispatchDurationMs,
    )} changedSlices:${changedSlices.join(',') || 'none'}`,
  );
};

export const logReducerDuration = (actionType: string, durationMs: number) => {
  if (!__DEV__ || durationMs < 0.5) {
    return;
  }

  console.log(
    `[PERF-REDUX] reducer action:${actionType} durationMs:${round(durationMs)}`,
  );
};

export const logPersistPhase = (
  phase: string,
  durationMs: number,
  key?: string | number,
) => {
  if (!__DEV__ || durationMs < 0.5) {
    return;
  }

  console.log(
    `[PERF-PERSIST] phase:${phase} key:${String(
      key ?? 'root',
    )} durationMs:${round(durationMs)} action:${activeActionType}`,
  );
};

export const logPersistWrite = (durationMs: number, bytes: number) => {
  if (!__DEV__) {
    return;
  }

  const actionElapsedMs = activeActionStartedAt
    ? performance.now() - activeActionStartedAt
    : -1;

  console.log(
    `[PERF-PERSIST] phase:mmkv.set bytes:${bytes} durationMs:${round(
      durationMs,
    )} action:${activeActionType} actionElapsedMs:${round(actionElapsedMs)}`,
  );
};

export const getReduxPerformanceSnapshot = () => lastSnapshot;
