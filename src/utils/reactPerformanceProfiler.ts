import React from 'react';

const roundPerformanceDuration = (value: number) => Math.round(value * 10) / 10;

export const logReactProfiler: React.ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  if (!__DEV__) {
    return;
  }

  console.log(
    `[PERF-REACT] id:${id} phase:${phase} actualMs:${roundPerformanceDuration(
      actualDuration,
    )} baseMs:${roundPerformanceDuration(
      baseDuration,
    )} renderToCommitMs:${roundPerformanceDuration(commitTime - startTime)}`,
  );
};
