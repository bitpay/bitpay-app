import {useEffect, useMemo, useRef} from 'react';
import type {AssetRowItem, GainLossMode} from '../../../utils/portfolio/assets';
import {
  buildAssetFiatPriorityByKey,
  buildWalletIdsByAssetGroupKey,
  getPortfolioWalletCurrencyAbbreviationLower,
  getPopulateLoadingByAssetKey,
  getVisibleWalletsFromKeys,
  hasCompletedPopulateForWalletIds,
  sortAssetRowItemsByAssetFiatPriority,
} from '../../../utils/portfolio/assets';
import type {Key} from '../../../store/wallet/wallet.models';
import type {PortfolioPopulateStatus} from '../../../store/portfolio/portfolio.models';
import {useAppSelector} from '../../../utils/hooks';
import {getAssetIdFromWallet} from '../../core/pnl/assetId';
import type {StoredWallet} from '../../core/types';
import {
  buildCommittedPortfolioRevisionToken,
  getCurrentRatesByAssetIdSignature,
  getStoredWalletRequestSignature,
} from '../common';
import {
  buildAssetRowItemFromMetrics,
  buildAssetRowMetricsFromAnalysis,
  type AssetRowMetrics,
} from '../selectors/buildAssetRowsFromAnalysis';
import {isPortfolioRuntimeMainnetLikeNetwork} from '../../adapters/rn/walletEligibility';
import {usePortfolioStoredWalletAnalysisScope} from './usePortfolioStoredWalletAnalysisScope';
import useAssetPnlSummaries, {
  type AssetPnlSummarySpec,
  type AssetPnlSummaryState,
} from './useAssetPnlSummaries';
import {
  buildCurrentSpotRatesByRateKey,
  getCurrentSpotRatesByRateKeySignature,
} from '../../../utils/portfolio/balanceChartData';
import {clearAssetPnlSummaryCacheForTests} from '../assetPnlSummaryCache';

type Args = {
  gainLossMode: GainLossMode;
  keyId?: string;
  assetKeys?: string[];
  externalRefreshToken?: string | number;
  enabled?: boolean;
};

type Result = {
  visibleItems: AssetRowItem[];
  isFiatLoading: boolean;
  isPopulateLoadingByKey: Record<string, boolean> | undefined;
  hasAnyPortfolioData: boolean;
};

type AssetGroupSpec = AssetPnlSummarySpec & {
  storedWalletIds: string[];
  eligibleWalletIds: string[];
};

function stabilizeVisibleItemOrder(args: {
  items: AssetRowItem[];
  previousKeys: string[];
}): AssetRowItem[] {
  const {items, previousKeys} = args;
  if (items.length < 2 || previousKeys.length < 2) {
    return items;
  }

  const itemsByKey = new Map(items.map(item => [item.key, item]));
  const previousKeysSet = new Set(previousKeys);
  const stabilizedItems: AssetRowItem[] = [];

  for (const key of previousKeys) {
    const item = itemsByKey.get(key);
    if (item) {
      stabilizedItems.push(item);
    }
  }

  for (const item of items) {
    if (!previousKeysSet.has(item.key)) {
      stabilizedItems.push(item);
    }
  }

  if (
    stabilizedItems.length !== items.length ||
    stabilizedItems.every((item, index) => item === items[index])
  ) {
    return items;
  }

  return stabilizedItems;
}

function hasCompletedAssetGroupPopulate(args: {
  spec: AssetGroupSpec;
  populateStatus: PortfolioPopulateStatus | undefined;
}): boolean {
  if (!args.populateStatus?.inProgress) {
    return true;
  }

  if (
    !args.populateStatus.currentWalletId &&
    !Object.keys(args.populateStatus.walletStatusById || {}).length
  ) {
    return true;
  }

  return hasCompletedPopulateForWalletIds({
    populateStatus: args.populateStatus,
    walletIds: args.spec.eligibleWalletIds.length
      ? args.spec.eligibleWalletIds
      : args.spec.storedWalletIds,
    requireAllWalletsInScope: true,
  });
}

export function clearPortfolioAssetGroupPopulateCacheForTests(): void {
  clearAssetPnlSummaryCacheForTests();
}

function getRepresentativeStoredWallet(args: {
  key: string;
  wallets: StoredWallet[];
}): StoredWallet | undefined {
  return (
    args.wallets.find(
      wallet =>
        String(wallet.summary.chain || '').toLowerCase() === args.key &&
        !wallet.summary.tokenAddress,
    ) || args.wallets[0]
  );
}

function getChartDataRevisionSig(args: {
  committedRevisionToken: string;
  storedWalletRequestSig: string;
}): string {
  return args.storedWalletRequestSig
    ? `${args.committedRevisionToken}|${args.storedWalletRequestSig}`
    : args.committedRevisionToken;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function buildDisplayMetric(args: {
  baseMetric: AssetRowMetrics;
  summaryState?: AssetPnlSummaryState;
}): AssetRowMetrics {
  const summary = args.summaryState?.summary;
  if (!summary) {
    return {
      ...args.baseMetric,
      pnlFiat: 0,
      pnlPercent: 0,
      hasPnl: false,
      showPnlPlaceholder: !!args.summaryState?.error,
    };
  }

  return {
    ...args.baseMetric,
    fiatValue: isFiniteNumber(summary.fiatValue)
      ? summary.fiatValue
      : args.baseMetric.fiatValue,
    pnlFiat: summary.pnlFiat,
    pnlPercent: summary.pnlPercent,
    hasRate: args.baseMetric.hasRate || isFiniteNumber(summary.fiatValue),
    hasPnl: summary.hasPnl,
    showPnlPlaceholder: !summary.hasPnl,
  };
}

function shouldShowSummaryLoading(
  state: AssetPnlSummaryState | undefined,
): boolean {
  return !state || (!state.summary && !state.error);
}

export function usePortfolioAssetRows({
  gainLossMode,
  keyId,
  assetKeys,
  externalRefreshToken,
  enabled,
}: Args): Result {
  const analysisEnabled = enabled !== false;
  const portfolio = useAppSelector(({PORTFOLIO}) => PORTFOLIO);
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys) as Record<string, Key>;
  const assetKeyFilter = useMemo(() => {
    const normalized = (assetKeys || [])
      .map(key => String(key || '').toLowerCase())
      .filter(Boolean);
    return normalized.length ? new Set(normalized) : undefined;
  }, [assetKeys]);

  const wallets = useMemo(() => {
    if (keyId && keys[keyId]) {
      return getVisibleWalletsFromKeys({[keyId]: keys[keyId]});
    }

    return getVisibleWalletsFromKeys(keys, homeCarouselConfig);
  }, [homeCarouselConfig, keyId, keys]);
  const {
    asOfMs,
    committedRevisionToken,
    currentRatesByAssetId,
    eligibleWallets,
    quoteCurrency,
    rates,
    storedWalletRequestSig,
    storedWallets,
  } = usePortfolioStoredWalletAnalysisScope({
    enabled: analysisEnabled,
    wallets,
  });
  const committedPortfolioRevisionToken = useMemo(() => {
    return (
      committedRevisionToken ||
      buildCommittedPortfolioRevisionToken({
        lastPopulatedAt: portfolio.lastPopulatedAt,
      })
    );
  }, [committedRevisionToken, portfolio.lastPopulatedAt]);

  const assetGroupSpecs = useMemo<AssetGroupSpec[]>(() => {
    if (!analysisEnabled || !storedWallets.length) {
      return [];
    }

    const storedWalletsByKey = new Map<string, StoredWallet[]>();
    for (const storedWallet of storedWallets) {
      if (!isPortfolioRuntimeMainnetLikeNetwork(storedWallet.summary.network)) {
        continue;
      }

      const groupKey = String(
        storedWallet.summary.currencyAbbreviation || '',
      ).toLowerCase();
      if (!groupKey || assetKeyFilter?.has(groupKey) === false) {
        continue;
      }

      const groupWallets = storedWalletsByKey.get(groupKey) || [];
      groupWallets.push(storedWallet);
      storedWalletsByKey.set(groupKey, groupWallets);
    }

    const eligibleWalletsByKey = new Map<string, typeof eligibleWallets>();
    for (const wallet of eligibleWallets || []) {
      const groupKey = getPortfolioWalletCurrencyAbbreviationLower(wallet);
      if (!groupKey || assetKeyFilter?.has(groupKey) === false) {
        continue;
      }

      const groupWallets = eligibleWalletsByKey.get(groupKey) || [];
      groupWallets.push(wallet);
      eligibleWalletsByKey.set(groupKey, groupWallets);
    }

    const nextSpecs: AssetGroupSpec[] = [];
    for (const [groupKey, groupStoredWallets] of storedWalletsByKey.entries()) {
      const representative = getRepresentativeStoredWallet({
        key: groupKey,
        wallets: groupStoredWallets,
      });
      if (!representative) {
        continue;
      }

      const assetIds = Array.from(
        new Set(
          groupStoredWallets.map(wallet =>
            getAssetIdFromWallet(wallet.summary),
          ),
        ),
      );
      const groupCurrentRatesByAssetId: Record<string, number> = {};
      for (const assetId of assetIds) {
        const rate = currentRatesByAssetId?.[assetId];
        if (typeof rate === 'number' && Number.isFinite(rate)) {
          groupCurrentRatesByAssetId[assetId] = rate;
        }
      }

      const groupEligibleWallets = eligibleWalletsByKey.get(groupKey) || [];
      const storedWalletIds = Array.from(
        new Set(
          groupStoredWallets
            .map(wallet => String(wallet.summary.walletId || ''))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
      const eligibleWalletIds = Array.from(
        new Set(
          groupEligibleWallets
            .map(wallet => String(wallet?.id || ''))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));
      const groupStoredWalletRequestSig =
        getStoredWalletRequestSignature(groupStoredWallets);

      nextSpecs.push({
        key: groupKey,
        assetKey: groupKey,
        currencyAbbreviation: groupKey,
        chain: representative.summary.chain,
        tokenAddress: representative.summary.tokenAddress,
        storedWallets: groupStoredWallets,
        walletIds: storedWalletIds,
        storedWalletIds,
        eligibleWalletIds,
        storedWalletRequestSig: groupStoredWalletRequestSig,
        quoteCurrency,
        timeframe: gainLossMode,
        currentRatesByAssetId: groupCurrentRatesByAssetId,
        currentRatesSignature: getCurrentRatesByAssetIdSignature(
          groupCurrentRatesByAssetId,
        ),
        currentSpotRatesSignature: getCurrentSpotRatesByRateKeySignature(
          buildCurrentSpotRatesByRateKey({
            wallets: groupEligibleWallets,
            rates,
            quoteCurrency,
          }),
        ),
        chartDataRevisionSig: getChartDataRevisionSig({
          committedRevisionToken: committedPortfolioRevisionToken,
          storedWalletRequestSig: groupStoredWalletRequestSig,
        }),
        asOfMs,
        balanceOffset: 0,
        enabled:
          !portfolio.populateStatus?.inProgress ||
          hasCompletedAssetGroupPopulate({
            spec: {
              key: groupKey,
              assetKey: groupKey,
              currencyAbbreviation: groupKey,
              storedWallets: groupStoredWallets,
              walletIds: storedWalletIds,
              storedWalletIds,
              eligibleWalletIds,
              storedWalletRequestSig: groupStoredWalletRequestSig,
              quoteCurrency,
              timeframe: gainLossMode,
              currentRatesByAssetId: groupCurrentRatesByAssetId,
              currentRatesSignature: getCurrentRatesByAssetIdSignature(
                groupCurrentRatesByAssetId,
              ),
              chartDataRevisionSig: '',
            },
            populateStatus: portfolio.populateStatus,
          }),
      });
    }

    const priorityByKey = buildAssetFiatPriorityByKey(
      eligibleWallets?.length ? eligibleWallets : wallets,
    );

    return nextSpecs.sort((left, right) => {
      const leftPriority = priorityByKey[left.key];
      const rightPriority = priorityByKey[right.key];
      const fiatDiff =
        (rightPriority?.fiatBalance || 0) - (leftPriority?.fiatBalance || 0);
      if (fiatDiff !== 0) {
        return fiatDiff;
      }

      const firstIndexDiff =
        (leftPriority?.firstIndex ?? Number.MAX_SAFE_INTEGER) -
        (rightPriority?.firstIndex ?? Number.MAX_SAFE_INTEGER);
      if (firstIndexDiff !== 0) {
        return firstIndexDiff;
      }

      return left.key.localeCompare(right.key);
    });
  }, [
    analysisEnabled,
    asOfMs,
    assetKeyFilter,
    committedPortfolioRevisionToken,
    currentRatesByAssetId,
    eligibleWallets,
    gainLossMode,
    portfolio.populateStatus,
    quoteCurrency,
    rates,
    storedWallets,
    wallets,
  ]);
  const assetGroupSpecByKey = useMemo(() => {
    return new Map(assetGroupSpecs.map(spec => [spec.key, spec]));
  }, [assetGroupSpecs]);
  const summaryStatesByKey = useAssetPnlSummaries({
    specs: assetGroupSpecs,
    enabled: analysisEnabled,
    maxPoints: 2,
    refreshToken: externalRefreshToken,
  });
  const shellMetrics = useMemo(() => {
    return buildAssetRowMetricsFromAnalysis({
      storedWallets,
      analysis: undefined,
      currentRatesByAssetId,
      gainLossMode,
      collapseAcrossChains: true,
    }).filter(row => !assetKeyFilter || assetKeyFilter.has(row.key));
  }, [assetKeyFilter, currentRatesByAssetId, gainLossMode, storedWallets]);
  const items = useMemo(() => {
    if (!analysisEnabled) {
      return [];
    }

    const nextItems = shellMetrics.map(metric => {
      const summaryState = summaryStatesByKey[metric.key];
      const row = buildAssetRowItemFromMetrics({
        row: buildDisplayMetric({
          baseMetric: metric,
          summaryState,
        }),
        quoteCurrency,
      });

      return {
        ...row,
        showScopedPnlLoading: shouldShowSummaryLoading(summaryState),
        pnlScopeKey: summaryState?.cacheKey,
      };
    });

    return sortAssetRowItemsByAssetFiatPriority({
      items: nextItems,
      wallets,
    });
  }, [
    analysisEnabled,
    shellMetrics,
    quoteCurrency,
    summaryStatesByKey,
    wallets,
  ]);
  const lastNonEmptyVisibleItemsRef = useRef<AssetRowItem[]>([]);
  useEffect(() => {
    if (items.length) {
      lastNonEmptyVisibleItemsRef.current = items;
    }
  }, [items]);

  const hasSummaryLoading = useMemo(() => {
    return Object.values(summaryStatesByKey).some(state => state.loading);
  }, [summaryStatesByKey]);
  const visibleItems = useMemo(() => {
    if (items.length) {
      return items;
    }

    if (
      (portfolio.populateStatus?.inProgress || hasSummaryLoading) &&
      lastNonEmptyVisibleItemsRef.current.length
    ) {
      return lastNonEmptyVisibleItemsRef.current;
    }

    return items;
  }, [hasSummaryLoading, items, portfolio.populateStatus?.inProgress]);

  const walletIdsByAssetKey = useMemo(() => {
    if (!portfolio.populateStatus?.inProgress) {
      return undefined;
    }

    return buildWalletIdsByAssetGroupKey(wallets);
  }, [portfolio.populateStatus?.inProgress, wallets]);

  const populateLoadingByKeyPrevRef = useRef<
    Record<string, boolean> | undefined
  >(undefined);
  const isPopulateLoadingByKeyRaw = useMemo(() => {
    if (!portfolio.populateStatus?.inProgress) {
      return undefined;
    }

    if (!walletIdsByAssetKey) {
      return undefined;
    }

    return getPopulateLoadingByAssetKey({
      items: visibleItems,
      walletIdsByAssetKey,
      populateStatus: portfolio.populateStatus,
      prev: populateLoadingByKeyPrevRef.current,
    });
  }, [portfolio.populateStatus, visibleItems, walletIdsByAssetKey]);
  const hasSettledFreshPopulateByKey = useMemo(() => {
    if (!portfolio.populateStatus?.inProgress || !isPopulateLoadingByKeyRaw) {
      return undefined;
    }

    const next: Record<string, boolean> = {};
    for (const item of visibleItems) {
      const walletPopulateSettled =
        isPopulateLoadingByKeyRaw[item.key] === false;
      const summaryState = summaryStatesByKey[item.key];
      const summarySettled =
        !!summaryState &&
        !summaryState.loading &&
        (!!summaryState.summary || !!summaryState.error);
      const summaryReadyForDisplay = !!summaryState?.summary?.hasPnl;
      const spec = assetGroupSpecByKey.get(item.key);
      const assetPopulateSettled =
        !spec ||
        hasCompletedAssetGroupPopulate({
          spec,
          populateStatus: portfolio.populateStatus,
        });

      next[item.key] =
        summaryReadyForDisplay ||
        (walletPopulateSettled && assetPopulateSettled && summarySettled);
    }

    return next;
  }, [
    assetGroupSpecByKey,
    isPopulateLoadingByKeyRaw,
    portfolio.populateStatus,
    summaryStatesByKey,
    visibleItems,
  ]);
  const resolvedPopulateItemsSessionToken = useMemo(() => {
    return [
      typeof portfolio.populateStatus?.startedAt === 'number'
        ? String(portfolio.populateStatus.startedAt)
        : '',
      gainLossMode,
      quoteCurrency,
      assetKeys?.join(',') || '',
    ].join('|');
  }, [
    assetKeys,
    gainLossMode,
    portfolio.populateStatus?.startedAt,
    quoteCurrency,
  ]);
  const resolvedPopulateItemsRef = useRef<{
    sessionToken: string;
    itemsByKey: Record<string, AssetRowItem>;
  }>({
    sessionToken: '',
    itemsByKey: {},
  });
  useEffect(() => {
    if (!portfolio.populateStatus?.inProgress) {
      resolvedPopulateItemsRef.current = {
        sessionToken: '',
        itemsByKey: {},
      };
      return;
    }

    if (
      resolvedPopulateItemsRef.current.sessionToken !==
      resolvedPopulateItemsSessionToken
    ) {
      resolvedPopulateItemsRef.current = {
        sessionToken: resolvedPopulateItemsSessionToken,
        itemsByKey: {},
      };
    }
  }, [portfolio.populateStatus?.inProgress, resolvedPopulateItemsSessionToken]);
  const stablePopulatePresentation = useMemo(() => {
    if (!portfolio.populateStatus?.inProgress || !isPopulateLoadingByKeyRaw) {
      return {
        visibleItems,
        isPopulateLoadingByKey: isPopulateLoadingByKeyRaw,
      };
    }

    if (
      resolvedPopulateItemsRef.current.sessionToken !==
      resolvedPopulateItemsSessionToken
    ) {
      resolvedPopulateItemsRef.current = {
        sessionToken: resolvedPopulateItemsSessionToken,
        itemsByKey: {},
      };
    }

    const resolvedItemsByKey = resolvedPopulateItemsRef.current.itemsByKey;
    let itemsChanged = false;
    let loadingChanged = false;
    const nextLoadingByKey: Record<string, boolean> = {
      ...isPopulateLoadingByKeyRaw,
    };
    const nextItems = visibleItems.map(item => {
      const cachedItem = resolvedItemsByKey[item.key];
      const hasSettledPopulate =
        hasSettledFreshPopulateByKey?.[item.key] === true;

      if (hasSettledPopulate) {
        if (cachedItem !== item) {
          resolvedItemsByKey[item.key] = item;
        }

        if (nextLoadingByKey[item.key] !== false) {
          loadingChanged = true;
        }
        nextLoadingByKey[item.key] = false;
        return item;
      }

      if (cachedItem) {
        nextLoadingByKey[item.key] = false;
        itemsChanged = true;
        loadingChanged = true;
        return cachedItem;
      }

      if (nextLoadingByKey[item.key] !== true) {
        loadingChanged = true;
      }
      nextLoadingByKey[item.key] = true;
      return item;
    });

    return {
      visibleItems: itemsChanged ? nextItems : visibleItems,
      isPopulateLoadingByKey: loadingChanged
        ? nextLoadingByKey
        : isPopulateLoadingByKeyRaw,
    };
  }, [
    hasSettledFreshPopulateByKey,
    isPopulateLoadingByKeyRaw,
    portfolio.populateStatus?.inProgress,
    resolvedPopulateItemsSessionToken,
    visibleItems,
  ]);

  useEffect(() => {
    populateLoadingByKeyPrevRef.current =
      stablePopulatePresentation.isPopulateLoadingByKey;
  }, [stablePopulatePresentation.isPopulateLoadingByKey]);
  const hasPendingVisibleOrderStabilization = useMemo(() => {
    return !!portfolio.populateStatus?.inProgress || hasSummaryLoading;
  }, [hasSummaryLoading, portfolio.populateStatus?.inProgress]);
  const lastStableVisibleItemOrderRef = useRef<string[]>([]);
  const visibleItemsForDisplay = useMemo(() => {
    const nextItems = stablePopulatePresentation.visibleItems;
    const previousKeys = lastStableVisibleItemOrderRef.current;

    if (!hasPendingVisibleOrderStabilization || !previousKeys.length) {
      return nextItems;
    }

    return stabilizeVisibleItemOrder({
      items: nextItems,
      previousKeys,
    });
  }, [
    hasPendingVisibleOrderStabilization,
    stablePopulatePresentation.visibleItems,
  ]);
  useEffect(() => {
    if (!visibleItemsForDisplay.length) {
      return;
    }

    if (
      !lastStableVisibleItemOrderRef.current.length ||
      !hasPendingVisibleOrderStabilization
    ) {
      lastStableVisibleItemOrderRef.current = visibleItemsForDisplay.map(
        item => item.key,
      );
    }
  }, [hasPendingVisibleOrderStabilization, visibleItemsForDisplay]);

  const hasAnySummaryData = Object.values(summaryStatesByKey).some(
    state => !!state.summary,
  );
  const isFiatLoading =
    analysisEnabled &&
    !!assetGroupSpecs.length &&
    assetGroupSpecs.every(spec => {
      const state = summaryStatesByKey[spec.key];
      return !!state?.loading && !state.summary;
    });

  return {
    visibleItems: visibleItemsForDisplay,
    isFiatLoading,
    isPopulateLoadingByKey: stablePopulatePresentation.isPopulateLoadingByKey,
    hasAnyPortfolioData:
      visibleItemsForDisplay.length > 0 ||
      storedWalletRequestSig.length > 0 ||
      hasAnySummaryData ||
      !!portfolio.populateStatus?.inProgress,
  };
}

export default usePortfolioAssetRows;
