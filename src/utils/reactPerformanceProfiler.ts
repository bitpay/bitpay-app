import React from 'react';
import {PERF_DEBUG, performanceLog} from './performanceDebug';

const roundPerformanceDuration = (value: number) => Math.round(value * 10) / 10;

export const logReactProfiler: React.ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (!PERF_DEBUG) {
    return;
  }

  performanceLog(
    `[PERF-REACT] id:${id} phase:${phase} actualMs:${roundPerformanceDuration(
      actualDuration,
    )} baseMs:${roundPerformanceDuration(
      baseDuration,
    )} renderToCommitMs:${roundPerformanceDuration(commitTime - startTime)}`,
  );
};
