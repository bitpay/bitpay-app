export const PERF_DEBUG = false;

export const performanceLog = (message: string) => {
  if (!PERF_DEBUG) {
    return;
  }

  console.log(message);
};
