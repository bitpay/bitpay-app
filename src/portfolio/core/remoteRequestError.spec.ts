import {
  PORTFOLIO_REMOTE_REQUEST_ERROR_CODE,
  createPortfolioRemoteRequestError,
  isPortfolioRemoteRequestError,
} from './remoteRequestError';

describe('portfolio remote request errors', () => {
  it('tags txhistory request failures with a stable worklet-safe code', () => {
    const error = createPortfolioRemoteRequestError({
      kind: 'txhistory',
      failureKind: 'http-status',
      status: 404,
      url: 'https://bws.example/v1/txhistory/?limit=1000',
      message: 'BWS txhistory request failed with status 404.',
    }) as any;

    expect(isPortfolioRemoteRequestError(error)).toBe(true);
    expect(error.code).toBe(PORTFOLIO_REMOTE_REQUEST_ERROR_CODE);
    expect(error.portfolioRemoteRequestKind).toBe('txhistory');
    expect(error.portfolioRemoteRequestFailureKind).toBe('http-status');
    expect(error.portfolioRemoteRequestStatus).toBe(404);
    expect(error.portfolioRemoteRequestUrl).toBe(
      'https://bws.example/v1/txhistory/?limit=1000',
    );
  });

  it('tags fiat-rate request failures with kind and URL metadata', () => {
    const error = createPortfolioRemoteRequestError({
      kind: 'fiat-rate',
      failureKind: 'nitro-fetch',
      url: 'https://bws.example/v4/fiatrates/USD?days=1&chain=arb&tokenAddress=0xToken',
      message:
        'Portfolio Nitro Fetch fiat-rate request failed for https://bws.example/v4/fiatrates/USD?days=1&chain=arb&tokenAddress=0xToken: timeout',
    }) as any;

    expect(isPortfolioRemoteRequestError(error)).toBe(true);
    expect(error.code).toBe(PORTFOLIO_REMOTE_REQUEST_ERROR_CODE);
    expect(error.portfolioRemoteRequestKind).toBe('fiat-rate');
    expect(error.portfolioRemoteRequestFailureKind).toBe('nitro-fetch');
    expect(error.portfolioRemoteRequestUrl).toContain('/v4/fiatrates/USD');
  });

  it('detects legacy remote request messages without explicit metadata', () => {
    expect(
      isPortfolioRemoteRequestError(
        new Error('BWS txhistory request failed with status 500.'),
      ),
    ).toBe(true);
    expect(
      isPortfolioRemoteRequestError(
        new Error('Failed to fetch fiat rates (503).'),
      ),
    ).toBe(true);
  });

  it('does not classify invalid tx history as a remote request failure', () => {
    expect(
      isPortfolioRemoteRequestError(
        new Error('Invalid tx history: negative balance after tx tx-1 (-1).'),
      ),
    ).toBe(false);
  });
});
