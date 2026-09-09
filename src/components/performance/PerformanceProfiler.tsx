import React from 'react';
import {PERF_DEBUG} from '../../utils/performanceDebug';

const PerformanceProfiler = ({
  children,
  ...profilerProps
}: React.ProfilerProps) => {
  if (!PERF_DEBUG) {
    return <>{children}</>;
  }

  return <React.Profiler {...profilerProps}>{children}</React.Profiler>;
};

export default PerformanceProfiler;
