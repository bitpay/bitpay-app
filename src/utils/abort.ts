const ABORT_ERROR_NAME = 'AbortError';
const DEFAULT_ABORT_MESSAGE = 'The operation was aborted.';

export const createAbortError = (message = DEFAULT_ABORT_MESSAGE): Error => {
  const error = new Error(message);
  error.name = ABORT_ERROR_NAME;
  return error;
};

export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === ABORT_ERROR_NAME;
};

export const throwIfAbortSignalAborted = (signal?: AbortSignal): void => {
  if (!signal?.aborted) {
    return;
  }

  const reason = (signal as AbortSignal & {reason?: unknown}).reason;
  if (reason instanceof Error) {
    throw reason;
  }

  if (typeof reason === 'string' && reason) {
    throw createAbortError(reason);
  }

  throw createAbortError();
};
