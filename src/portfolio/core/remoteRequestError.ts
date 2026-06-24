export const PORTFOLIO_REMOTE_REQUEST_ERROR_CODE =
  'PORTFOLIO_REMOTE_REQUEST_FAILED';

export type PortfolioRemoteRequestKind = 'txhistory' | 'fiat-rate';
export type PortfolioRemoteRequestFailureKind = 'nitro-fetch' | 'http-status';

export type PortfolioRemoteRequestError = Error & {
  code?: string;
  portfolioRemoteRequestKind?: PortfolioRemoteRequestKind;
  portfolioRemoteRequestFailureKind?: PortfolioRemoteRequestFailureKind;
  portfolioRemoteRequestStatus?: number;
  portfolioRemoteRequestUrl?: string;
};

function formatThrownErrorForPortfolioRequest(
  error: unknown,
  options?: {includeErrorName?: boolean},
): string {
  'worklet';

  if (error instanceof Error) {
    const name = String(error.name || 'Error').trim();
    const message = String(error.message || '').trim();
    return options?.includeErrorName && message
      ? `${name}: ${message}`
      : message || name;
  }

  if (typeof error === 'string') {
    return error.trim();
  }

  if (error == null) {
    return '';
  }

  try {
    return JSON.stringify(error) || '';
  } catch {
    return String(error);
  }
}

export function createPortfolioRemoteRequestError(args: {
  kind: PortfolioRemoteRequestKind;
  failureKind: PortfolioRemoteRequestFailureKind;
  message: string;
  status?: number;
  url?: string;
}): Error {
  'worklet';

  const error = new Error(
    String(args.message || 'Portfolio remote request failed.'),
  ) as PortfolioRemoteRequestError;
  error.name = 'PortfolioRemoteRequestError';
  error.code = PORTFOLIO_REMOTE_REQUEST_ERROR_CODE;
  error.portfolioRemoteRequestKind = args.kind;
  error.portfolioRemoteRequestFailureKind = args.failureKind;

  const status = Number(args.status);
  if (Number.isFinite(status)) {
    error.portfolioRemoteRequestStatus = status;
  }

  const url = String(args.url || '').trim();
  if (url) {
    error.portfolioRemoteRequestUrl = url;
  }

  return error;
}

export function createPortfolioRemoteNitroFetchError(args: {
  kind: PortfolioRemoteRequestKind;
  url: string;
  messagePrefix: string;
  error: unknown;
  includeErrorName?: boolean;
}): Error {
  'worklet';

  const details = formatThrownErrorForPortfolioRequest(args.error, {
    includeErrorName: args.includeErrorName,
  });
  return createPortfolioRemoteRequestError({
    kind: args.kind,
    failureKind: 'nitro-fetch',
    url: args.url,
    message: details
      ? `${args.messagePrefix}: ${details}`
      : `${args.messagePrefix}.`,
  });
}

export function isPortfolioRemoteRequestError(
  error: unknown,
): error is PortfolioRemoteRequestError {
  'worklet';

  if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
    return false;
  }

  const typedError = error as PortfolioRemoteRequestError & {message?: unknown};
  if (typedError.code === PORTFOLIO_REMOTE_REQUEST_ERROR_CODE) {
    return true;
  }

  const message = String(typedError.message || '');
  return (
    message.startsWith('Portfolio Nitro Fetch txhistory request failed') ||
    message.startsWith('BWS txhistory request failed with status ') ||
    message.startsWith('Portfolio Nitro Fetch fiat-rate request failed') ||
    message.startsWith('Failed to fetch fiat rates (') ||
    message.startsWith('BWS fiat-rate request failed with status ')
  );
}
