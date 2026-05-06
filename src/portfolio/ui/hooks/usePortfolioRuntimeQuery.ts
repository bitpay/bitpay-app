import {useEffect, useMemo, useRef, useState} from 'react';
import type {Wallet} from '../../../store/wallet/wallet.models';
import type {StoredWallet} from '../../core/types';
import type {PnlTimeframe} from '../../core/pnl/analysisStreaming';
import {usePortfolioStoredWalletAnalysisScope} from './usePortfolioStoredWalletAnalysisScope';

export type PortfolioRuntimeQueryState<T> = {
  data?: T;
  loading: boolean;
  error?: Error;
  quoteCurrency: string;
  storedWallets: StoredWallet[];
  eligibleWallets: Wallet[];
  requestKey: string;
  currentRatesByAssetId: Record<string, number>;
  currentRatesSignature: string;
  asOfMs: number;
};

export function usePortfolioRuntimeQuery<T>(args: {
  wallets: Wallet[];
  timeframe: PnlTimeframe;
  maxPoints?: number;
  enabled?: boolean;
  refreshToken?: string;
  clearDataToken?: string;
  clearDataOnRefreshToken?: boolean;
  execute: (params: {
    wallets: StoredWallet[];
    quoteCurrency: string;
    timeframe: PnlTimeframe;
    maxPoints?: number;
    currentRatesByAssetId?: Record<string, number>;
    asOfMs: number;
  }) => Promise<T>;
}): PortfolioRuntimeQueryState<T> {
  const {
    wallets,
    timeframe,
    maxPoints,
    enabled,
    refreshToken: refreshTokenOverride,
    clearDataToken: clearDataTokenOverride,
    clearDataOnRefreshToken,
    execute,
  } = args;
  const isEnabled = enabled !== false;
  const {
    asOfMs,
    committedRevisionToken,
    currentRatesByAssetId,
    currentRatesSignature,
    eligibleWallets,
    quoteCurrency,
    storedWalletRequestSig,
    storedWallets,
  } = usePortfolioStoredWalletAnalysisScope({
    enabled: isEnabled,
    wallets,
  });
  const refreshToken = refreshTokenOverride ?? committedRevisionToken;
  const clearDataToken = clearDataTokenOverride ?? refreshToken;

  const requestKey = useMemo(() => {
    if (!isEnabled) {
      return '';
    }

    return [
      quoteCurrency,
      timeframe,
      typeof maxPoints === 'number' ? String(maxPoints) : '',
      storedWalletRequestSig,
      currentRatesSignature,
      String(asOfMs),
    ].join('|');
  }, [
    asOfMs,
    currentRatesSignature,
    isEnabled,
    maxPoints,
    quoteCurrency,
    storedWalletRequestSig,
    timeframe,
  ]);
  const executeParamsRef = useRef({
    wallets: storedWallets,
    quoteCurrency,
    timeframe,
    maxPoints,
    currentRatesByAssetId,
    asOfMs,
  });
  executeParamsRef.current = {
    wallets: storedWallets,
    quoteCurrency,
    timeframe,
    maxPoints,
    currentRatesByAssetId,
    asOfMs,
  };
  const [data, setData] = useState<{
    requestKey: string;
    value?: T;
  }>({
    requestKey: '',
    value: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const lastClearDataTokenRef = useRef(clearDataToken);
  const executionIdRef = useRef(0);
  const lastAppliedExecutionIdRef = useRef(0);
  const inFlightExecutionIdsRef = useRef(new Set<number>());
  const latestRequestKeyRef = useRef(requestKey);
  const latestClearDataTokenRef = useRef(clearDataToken);
  const latestEnabledRef = useRef(isEnabled);
  const unmountedRef = useRef(false);
  const hasPendingRequest =
    isEnabled && !!storedWallets.length && data.requestKey !== requestKey;

  latestRequestKeyRef.current = requestKey;
  latestClearDataTokenRef.current = clearDataToken;
  latestEnabledRef.current = isEnabled;

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      inFlightExecutionIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!clearDataOnRefreshToken) {
      lastClearDataTokenRef.current = clearDataToken;
      return;
    }

    if (lastClearDataTokenRef.current !== clearDataToken) {
      setData({
        requestKey: '',
        value: undefined,
      });
      lastClearDataTokenRef.current = clearDataToken;
      return;
    }

    lastClearDataTokenRef.current = clearDataToken;
  }, [clearDataOnRefreshToken, clearDataToken]);
  useEffect(() => {
    if (!isEnabled) {
      inFlightExecutionIdsRef.current.clear();
      setLoading(false);
      return;
    }

    const executeParams = executeParamsRef.current;

    if (!executeParams.wallets.length) {
      inFlightExecutionIdsRef.current.clear();
      setData({
        requestKey,
        value: undefined,
      });
      setLoading(false);
      return;
    }

    const executionId = executionIdRef.current + 1;
    executionIdRef.current = executionId;
    inFlightExecutionIdsRef.current.add(executionId);

    setData(prev =>
      prev.requestKey === requestKey
        ? prev
        : {
            requestKey,
            value: undefined,
          },
    );
    setLoading(true);
    setError(undefined);

    execute(executeParams)
      .then(result => {
        const requestKeyMatches = latestRequestKeyRef.current === requestKey;
        const clearDataTokenMatches =
          latestClearDataTokenRef.current === clearDataToken;
        const compatibleSession =
          !unmountedRef.current &&
          latestEnabledRef.current &&
          requestKeyMatches &&
          clearDataTokenMatches;
        const accepted =
          compatibleSession && executionId >= lastAppliedExecutionIdRef.current;

        if (!accepted) {
          return;
        }

        lastAppliedExecutionIdRef.current = executionId;
        setData({
          requestKey,
          value: result,
        });
        setError(undefined);
      })
      .catch(err => {
        const requestKeyMatches = latestRequestKeyRef.current === requestKey;
        const clearDataTokenMatches =
          latestClearDataTokenRef.current === clearDataToken;
        const accepted =
          !unmountedRef.current &&
          latestEnabledRef.current &&
          requestKeyMatches &&
          clearDataTokenMatches &&
          executionId === executionIdRef.current;
        if (!accepted) {
          return;
        }

        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        inFlightExecutionIdsRef.current.delete(executionId);
        if (unmountedRef.current) {
          return;
        }

        const nextLoading =
          latestEnabledRef.current && inFlightExecutionIdsRef.current.size > 0;
        setLoading(prev => (prev === nextLoading ? prev : nextLoading));
      });
  }, [execute, clearDataToken, isEnabled, refreshToken, requestKey]);

  return {
    data: data.requestKey === requestKey ? data.value : undefined,
    loading: loading || hasPendingRequest,
    error,
    quoteCurrency,
    storedWallets,
    eligibleWallets,
    requestKey,
    currentRatesByAssetId,
    currentRatesSignature,
    asOfMs,
  };
}

export default usePortfolioRuntimeQuery;
