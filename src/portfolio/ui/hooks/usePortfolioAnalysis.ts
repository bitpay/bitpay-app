import {useEffect, useMemo, useState} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';
import type {
  PnlAnalysisResult,
  PnlTimeframe,
} from '../../core/pnl/analysisStreaming';
import {useAppSelector} from '../../../utils/hooks';
import {selectHasCompletedFullPortfolioPopulate} from '../../../store/portfolio/portfolio.selectors';
import {runPortfolioAnalysisQuery} from '../common';
import {usePortfolioRuntimeQuery} from './usePortfolioRuntimeQuery';

export type UsePortfolioAnalysisResult = ReturnType<
  typeof usePortfolioAnalysis
>;

const committedAnalysisCache = new Map<string, PnlAnalysisResult>();

function getCommittedAnalysisCacheKey(args: {
  requestKey: string;
  refreshToken?: string;
}): string {
  return args.refreshToken
    ? [args.requestKey, args.refreshToken].join('|')
    : args.requestKey;
}

function getCommittedAnalysisCacheValue(
  cacheKey: string,
): PnlAnalysisResult | undefined {
  return committedAnalysisCache.get(cacheKey);
}

export function clearPortfolioAnalysisCommittedCacheForTests(): void {
  committedAnalysisCache.clear();
}

export function usePortfolioAnalysis(args: {
  wallets: Wallet[];
  timeframe: PnlTimeframe;
  maxPoints?: number;
  enabled?: boolean;
  refreshToken?: string;
  clearDataToken?: string;
  freezeWhilePopulate?: boolean;
  allowCurrentWhilePopulate?: boolean;
}) {
  const populateInProgress = useAppSelector(
    ({PORTFOLIO}) => !!PORTFOLIO.populateStatus?.inProgress,
  );
  const hasCommittedPortfolioBaseline = useAppSelector(
    selectHasCompletedFullPortfolioPopulate,
  );
  const query = usePortfolioRuntimeQuery<PnlAnalysisResult>({
    wallets: args.wallets,
    timeframe: args.timeframe,
    maxPoints: args.maxPoints,
    enabled: args.enabled,
    refreshToken: args.refreshToken,
    clearDataToken: args.clearDataToken,
    clearDataOnRefreshToken: !!args.refreshToken,
    execute: runPortfolioAnalysisQuery,
  });
  const committedDataCacheKey = useMemo(() => {
    return getCommittedAnalysisCacheKey({
      requestKey: query.requestKey,
      refreshToken: args.clearDataToken ?? args.refreshToken,
    });
  }, [args.clearDataToken, args.refreshToken, query.requestKey]);
  const [committedDataState, setCommittedDataState] = useState<{
    cacheKey: string;
    value?: PnlAnalysisResult;
  }>(() => ({
    cacheKey: committedDataCacheKey,
    value: hasCommittedPortfolioBaseline
      ? getCommittedAnalysisCacheValue(committedDataCacheKey)
      : undefined,
  }));

  useEffect(() => {
    if (!hasCommittedPortfolioBaseline) {
      setCommittedDataState(prev =>
        prev.cacheKey === '' && prev.value === undefined
          ? prev
          : {
              cacheKey: '',
              value: undefined,
            },
      );
      return;
    }

    const cachedValue = getCommittedAnalysisCacheValue(committedDataCacheKey);
    setCommittedDataState(prev =>
      prev.cacheKey === committedDataCacheKey && prev.value === cachedValue
        ? prev
        : {
            cacheKey: committedDataCacheKey,
            value: cachedValue,
          },
    );
  }, [committedDataCacheKey, hasCommittedPortfolioBaseline]);

  const committedData = useMemo(() => {
    if (!hasCommittedPortfolioBaseline) {
      return undefined;
    }

    return committedDataState.cacheKey === committedDataCacheKey
      ? committedDataState.value
      : getCommittedAnalysisCacheValue(committedDataCacheKey);
  }, [
    committedDataCacheKey,
    committedDataState.cacheKey,
    committedDataState.value,
    hasCommittedPortfolioBaseline,
  ]);

  useEffect(() => {
    if (!query.data) {
      return;
    }

    if (args.freezeWhilePopulate && populateInProgress) {
      return;
    }

    committedAnalysisCache.set(committedDataCacheKey, query.data);
    setCommittedDataState(prev =>
      prev.cacheKey === committedDataCacheKey && prev.value === query.data
        ? prev
        : {
            cacheKey: committedDataCacheKey,
            value: query.data,
          },
    );
  }, [
    args.freezeWhilePopulate,
    committedDataCacheKey,
    populateInProgress,
    query.data,
  ]);

  const data = useMemo(() => {
    if (!(args.freezeWhilePopulate && populateInProgress)) {
      return (
        query.data ??
        (hasCommittedPortfolioBaseline ? committedData : undefined)
      );
    }

    if (args.allowCurrentWhilePopulate && query.data) {
      return query.data;
    }

    if (hasCommittedPortfolioBaseline && committedData) {
      return committedData;
    }

    return args.allowCurrentWhilePopulate ? query.data : undefined;
  }, [
    args.allowCurrentWhilePopulate,
    args.freezeWhilePopulate,
    committedData,
    hasCommittedPortfolioBaseline,
    populateInProgress,
    query.data,
  ]);

  return {
    ...query,
    data,
    currentData: query.data,
    committedData: hasCommittedPortfolioBaseline ? committedData : undefined,
  };
}

export default usePortfolioAnalysis;
