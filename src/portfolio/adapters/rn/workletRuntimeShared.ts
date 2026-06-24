import {ensurePortfolioRuntimeSigningGlobals} from './txHistorySigning';

export type RuntimeErrorDetails = {
  message: string;
  stack?: string;
};

export const PORTFOLIO_WORKLET_RUNTIME_NAME = 'bitpay-portfolio-engine-runtime';

export function toRuntimeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

export function getRuntimeErrorDetails(error: unknown): RuntimeErrorDetails {
  'worklet';

  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown portfolio runtime error.',
      stack: error.stack,
    };
  }

  try {
    return {
      message: JSON.stringify(error),
    };
  } catch {
    return {
      message: String(error),
    };
  }
}

export function buildRuntimeErrorFromDetails(
  message: string,
  stack?: string,
): Error {
  const error = new Error(message || 'Unknown portfolio runtime error.');
  if (stack) {
    error.stack = stack;
  }
  return error;
}

/**
 * Runtime initializer hook for globals required by portfolio worklets.
 */
export function initializePortfolioRuntimeGlobals(): void {
  'worklet';

  ensurePortfolioRuntimeSigningGlobals();
}
