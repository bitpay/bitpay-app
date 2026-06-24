import {useEffect, useMemo, useRef, useState} from 'react';
import type {Key, Wallet} from '../../../store/wallet/wallet.models';
import {useAppDispatch} from '../../../utils/hooks';
import {getLastFiniteNumber, runPortfolioChartQuery} from '../common';
import {buildKeyPercentageDifferenceMap} from '../selectors/buildKeySummariesFromAnalysis';
import {
  buildPortfolioStoredWalletAnalysisScope,
  getPortfolioWalletsInputSignature,
  usePortfolioStoredWalletAnalysisScope,
} from './usePortfolioStoredWalletAnalysisScope';

function arePercentageMapsEqual(
  left: Record<string, number | null>,
  right: Record<string, number | null>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(key => left[key] === right[key]);
}

const getVisibleKeyWallets = (key: Key): Wallet[] => {
  return (key.wallets || []).filter(
    wallet => !wallet.hideWallet && !wallet.hideWalletByAccount,
  );
};

export const getPortfolioKeyPercentageInputSignature = (
  keys: Key[],
): string => {
  return (keys || [])
    .map(key =>
      [
        key.id,
        key.totalBalance,
        getPortfolioWalletsInputSignature(getVisibleKeyWallets(key)),
      ].join('|'),
    )
    .sort()
    .join('||');
};

export function usePortfolioKeyPercentages(args: {
  keys: Key[];
  enabled?: boolean;
}) {
  const enabled = args.enabled !== false;
  const dispatch = useAppDispatch();
  const {asOfMs, committedRevisionToken, quoteCurrency, rates} =
    usePortfolioStoredWalletAnalysisScope({
      enabled,
      wallets: [],
    });

  const keysInputSignature = getPortfolioKeyPercentageInputSignature(args.keys);
  const keyInputs = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return (args.keys || []).map(key => {
      const scope = buildPortfolioStoredWalletAnalysisScope({
        dispatch,
        quoteCurrency,
        rates,
        wallets: getVisibleKeyWallets(key),
      });

      return {
        keyId: key.id,
        liveFiatTotal: key.totalBalance || 0,
        storedWallets: scope.storedWallets,
        storedWalletRequestSig: scope.storedWalletRequestSig,
        currentRatesByAssetId: scope.currentRatesByAssetId,
        currentRatesSignature: scope.currentRatesSignature,
      };
    });
  }, [args.keys, dispatch, enabled, keysInputSignature, quoteCurrency, rates]);

  const requestKey = useMemo(() => {
    if (!enabled) {
      return '';
    }

    return [
      quoteCurrency,
      String(asOfMs),
      ...keyInputs.map(input =>
        [
          input.keyId,
          input.liveFiatTotal,
          input.storedWalletRequestSig,
          input.currentRatesSignature,
        ].join(':'),
      ),
    ].join('|');
  }, [asOfMs, enabled, keyInputs, quoteCurrency]);
  const stableKeyInputsRef = useRef(keyInputs);
  stableKeyInputsRef.current = keyInputs;
  const emptyPercentageMapRef = useRef<Record<string, number | null>>({});
  const cachedMapByRequestKeyRef = useRef<
    Map<string, Record<string, number | null>>
  >(new Map());

  const [currentMapState, setCurrentMapState] = useState<{
    requestKey: string;
    value: Record<string, number | null>;
  }>({
    requestKey: '',
    value: emptyPercentageMapRef.current,
  });

  useEffect(() => {
    const stableKeyInputs = stableKeyInputsRef.current;

    if (!enabled) {
      setCurrentMapState(prev =>
        prev.requestKey === '' && prev.value === emptyPercentageMapRef.current
          ? prev
          : {
              requestKey: '',
              value: emptyPercentageMapRef.current,
            },
      );
      return;
    }

    if (!stableKeyInputs.length) {
      setCurrentMapState(prev =>
        prev.requestKey === requestKey &&
        prev.value === emptyPercentageMapRef.current
          ? prev
          : {
              requestKey,
              value: emptyPercentageMapRef.current,
            },
      );
      return;
    }

    let cancelled = false;
    setCurrentMapState(prev =>
      prev.requestKey === requestKey
        ? prev
        : {
            requestKey,
            value:
              cachedMapByRequestKeyRef.current.get(requestKey) ||
              emptyPercentageMapRef.current,
          },
    );

    Promise.all(
      stableKeyInputs.map(async input => {
        if (!input.storedWallets.length) {
          return {
            keyId: input.keyId,
            liveFiatTotal: input.liveFiatTotal,
          };
        }

        const chart = await runPortfolioChartQuery({
          wallets: input.storedWallets,
          quoteCurrency,
          timeframe: '1D',
          maxPoints: 2,
          currentRatesByAssetId: input.currentRatesByAssetId,
          asOfMs,
        });

        return {
          keyId: input.keyId,
          liveFiatTotal: input.liveFiatTotal,
          totalFiatBalance: getLastFiniteNumber(chart.totalFiatBalance),
          totalPnlPercent: getLastFiniteNumber(chart.totalPnlPercent),
        };
      }),
    )
      .then(results => {
        if (cancelled) {
          return;
        }

        const nextMap = buildKeyPercentageDifferenceMap({results});
        const cachedMap = cachedMapByRequestKeyRef.current.get(requestKey);
        if (!cachedMap || !arePercentageMapsEqual(cachedMap, nextMap)) {
          cachedMapByRequestKeyRef.current.set(requestKey, nextMap);
        }
        setCurrentMapState(prev =>
          prev.requestKey === requestKey &&
          arePercentageMapsEqual(prev.value, nextMap)
            ? prev
            : {
                requestKey,
                value: nextMap,
              },
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, asOfMs, committedRevisionToken, quoteCurrency, requestKey]);

  if (!enabled) {
    return emptyPercentageMapRef.current;
  }

  if (currentMapState.requestKey === requestKey) {
    return currentMapState.value;
  }

  return (
    cachedMapByRequestKeyRef.current.get(requestKey) ||
    emptyPercentageMapRef.current
  );
}

export default usePortfolioKeyPercentages;
