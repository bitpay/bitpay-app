import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {useRuntimeFiatRateSeriesCache} from './useRuntimeFiatRateSeriesCache';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockLoadRuntimeFiatRateSeriesCache = jest.fn();

jest.mock('../fiatRateSeries', () => {
  return {
    buildRuntimeFiatRateCacheRequestKey: jest.fn(
      ({
        quoteCurrency,
        requests,
        maxAgeMs,
      }: {
        quoteCurrency: string;
        requests: Array<{
          coin: string;
          chain?: string;
          tokenAddress?: string;
          intervals: string[];
        }>;
        maxAgeMs?: number;
      }) =>
        [
          String(quoteCurrency || '')
            .trim()
            .toUpperCase(),
          typeof maxAgeMs === 'number' ? String(maxAgeMs) : '',
          (requests || [])
            .map(
              request =>
                `${request.coin}|${request.chain || ''}|${
                  request.tokenAddress || ''
                }|${(request.intervals || []).join(',')}`,
            )
            .sort()
            .join('||'),
        ].join('|'),
    ),
    normalizeRuntimeFiatRateCacheRequests: jest.fn(
      (
        requests: Array<{
          coin: string;
          chain?: string;
          tokenAddress?: string;
          intervals: string[];
        }>,
      ) =>
        [...(requests || [])]
          .map(request => ({
            ...request,
            coin: String(request.coin || '')
              .trim()
              .toLowerCase(),
            intervals: [...new Set(request.intervals || [])].sort(),
          }))
          .sort((a, b) => a.coin.localeCompare(b.coin)),
    ),
    loadRuntimeFiatRateSeriesCache: jest.fn((...args) =>
      mockLoadRuntimeFiatRateSeriesCache(...args),
    ),
  };
});

const HookHarness = ({refreshToken}: {refreshToken?: string | number}) => {
  useRuntimeFiatRateSeriesCache({
    quoteCurrency: 'USD',
    requests: [
      {
        coin: 'btc',
        intervals: ['1D'],
      },
    ],
    refreshToken,
  });

  return null;
};

describe('useRuntimeFiatRateSeriesCache', () => {
  beforeEach(() => {
    mockLoadRuntimeFiatRateSeriesCache.mockReset();
    mockLoadRuntimeFiatRateSeriesCache.mockResolvedValue({});
  });

  it('does not reload for semantically identical request arrays across rerenders', async () => {
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(<HookHarness />);
    });

    expect(mockLoadRuntimeFiatRateSeriesCache).toHaveBeenCalledTimes(1);

    await act(async () => {
      view!.update(<HookHarness />);
    });

    expect(mockLoadRuntimeFiatRateSeriesCache).toHaveBeenCalledTimes(1);
  });

  it('still reloads when an explicit refresh token changes', async () => {
    let view: TestRenderer.ReactTestRenderer;

    await act(async () => {
      view = TestRenderer.create(<HookHarness refreshToken="a" />);
    });

    expect(mockLoadRuntimeFiatRateSeriesCache).toHaveBeenCalledTimes(1);

    await act(async () => {
      view!.update(<HookHarness refreshToken="b" />);
    });

    expect(mockLoadRuntimeFiatRateSeriesCache).toHaveBeenCalledTimes(2);
  });
});
