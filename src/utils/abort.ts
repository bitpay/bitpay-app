const ABORT_ERROR_NAME = 'AbortError';

export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === ABORT_ERROR_NAME;
};
