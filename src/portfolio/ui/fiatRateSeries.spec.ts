import {
  getPortfolioRateRuntimeClient,
  getPortfolioRuntimeClient,
} from '../runtime/portfolioRuntime';
import {createPortfolioQueryBwsConfig} from './common';
import {
  loadRuntimeFiatRateSeriesCache,
  replaceRuntimeFiatRateSeriesCache,
} from './fiatRateSeries';

jest.mock('../runtime/portfolioRuntime', () => ({
  getPortfolioRuntimeClient: jest.fn(),
  getPortfolioRateRuntimeClient: jest.fn(),
}));

jest.mock('./common', () => ({
  createPortfolioQueryBwsConfig: jest.fn(),
}));

const mockNormalClient = {
  clearRateStorage: jest.fn(),
  getRateSeriesCache: jest.fn(),
};
const mockRateClient = {
  getRateSeriesCache: jest.fn(),
};
const mockGetPortfolioRuntimeClient = getPortfolioRuntimeClient as jest.Mock;
const mockGetPortfolioRateRuntimeClient =
  getPortfolioRateRuntimeClient as jest.Mock;
const mockCreatePortfolioQueryBwsConfig =
  createPortfolioQueryBwsConfig as jest.Mock;
const mockBwsConfig = {
  baseUrl: 'https://bws.invalid',
  timeoutMs: 60_000,
};

describe('runtime fiat rate series cache', () => {
  beforeEach(() => {
    mockNormalClient.clearRateStorage.mockReset();
    mockNormalClient.getRateSeriesCache.mockReset();
    mockRateClient.getRateSeriesCache.mockReset();
    mockGetPortfolioRuntimeClient.mockReset();
    mockGetPortfolioRuntimeClient.mockReturnValue(mockNormalClient);
    mockGetPortfolioRateRuntimeClient.mockReset();
    mockGetPortfolioRateRuntimeClient.mockReturnValue(mockRateClient);
    mockCreatePortfolioQueryBwsConfig.mockReset();
    mockCreatePortfolioQueryBwsConfig.mockReturnValue(mockBwsConfig);
  });

  it('loads rate cache through the rate runtime client', async () => {
    const cache = {btc: []};
    mockRateClient.getRateSeriesCache.mockResolvedValue(cache);

    await expect(
      loadRuntimeFiatRateSeriesCache({
        quoteCurrency: 'eur',
        maxAgeMs: 12_000,
        force: true,
        requests: [
          {
            coin: ' WBTC ',
            chain: ' ETH ',
            intervals: ['1W', '1D', '1D'],
          },
          {
            coin: 'btc',
            chain: 'btc',
            intervals: ['1M'],
          },
        ],
      }),
    ).resolves.toBe(cache);

    expect(mockGetPortfolioRateRuntimeClient).toHaveBeenCalledTimes(1);
    expect(mockGetPortfolioRuntimeClient).not.toHaveBeenCalled();
    expect(mockRateClient.getRateSeriesCache).toHaveBeenCalledWith({
      cfg: mockBwsConfig,
      quoteCurrency: 'EUR',
      requests: [
        {
          coin: 'btc',
          intervals: ['1D', '1M', '1W'],
        },
      ],
      maxAgeMs: 12_000,
      force: true,
    });
    expect(mockNormalClient.getRateSeriesCache).not.toHaveBeenCalled();
  });

  it('normalizes token request identity before calling the runtime client', async () => {
    const cache = {usdc: []};
    mockRateClient.getRateSeriesCache.mockResolvedValue(cache);

    await expect(
      loadRuntimeFiatRateSeriesCache({
        quoteCurrency: 'usd',
        requests: [
          {
            coin: 'USDC',
            chain: 'ETH',
            tokenAddress: '0xABCDef',
            intervals: ['1D'],
          },
          {
            coin: 'usdc',
            chain: 'eth',
            tokenAddress: '0xabcdef',
            intervals: ['ALL'],
          },
        ],
      }),
    ).resolves.toBe(cache);

    expect(mockRateClient.getRateSeriesCache).toHaveBeenCalledWith({
      cfg: mockBwsConfig,
      quoteCurrency: 'USD',
      requests: [
        {
          coin: 'usdc',
          chain: 'eth',
          tokenAddress: '0xabcdef',
          intervals: ['1D', 'ALL'],
        },
      ],
      maxAgeMs: undefined,
      force: undefined,
    });
  });

  it('replaces rate cache through the normal runtime client', async () => {
    const cache = {eth: []};
    mockNormalClient.clearRateStorage.mockResolvedValue(undefined);
    mockNormalClient.getRateSeriesCache.mockResolvedValue(cache);

    await expect(
      replaceRuntimeFiatRateSeriesCache({
        quoteCurrency: 'usd',
        maxAgeMs: 30_000,
        requests: [
          {
            coin: ' ETH ',
            intervals: ['1D'],
          },
        ],
      }),
    ).resolves.toBe(cache);

    expect(mockGetPortfolioRuntimeClient).toHaveBeenCalledTimes(1);
    expect(mockNormalClient.clearRateStorage).toHaveBeenCalledWith({});
    expect(mockNormalClient.getRateSeriesCache).toHaveBeenCalledWith({
      cfg: mockBwsConfig,
      quoteCurrency: 'USD',
      requests: [
        {
          coin: 'eth',
          intervals: ['1D'],
        },
      ],
      maxAgeMs: 30_000,
      force: true,
    });
    expect(mockGetPortfolioRateRuntimeClient).not.toHaveBeenCalled();
    expect(mockRateClient.getRateSeriesCache).not.toHaveBeenCalled();
  });
});
