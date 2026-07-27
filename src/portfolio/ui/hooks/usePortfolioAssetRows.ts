import {useEffect, useMemo, useRef, useState} from 'react';
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
import {
  clearAssetPnlSummaryCacheForTests,
  getAssetPnlSummaryCacheClearEpoch,
  subscribeAssetPnlSummaryCacheClear,
} from '../assetPnlSummaryCache';

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
  presentationResetToken: number;
};

type AssetGroupSpec = AssetPnlSummarySpec & {
  storedWalletIds: string[];
  eligibleWalletIds: string[];
};

const UNAVAILABLE_SUMMARY_READY_REVISION_SIG = 'unavailable-pnl:ready';
const UNAVAILABLE_SUMMARY_PENDING_REVISION_SIG = 'unavailable-pnl:pending';
const EMPTY_PORTFOLIO_ASSET_KEYS: Record<string, Key> = {};
const EMPTY_PORTFOLIO_ASSET_CAROUSEL_CONFIG: [] = [];

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

function hasStrictCompletedAssetGroupPopulate(args: {
  spec: Pick<AssetGroupSpec, 'eligibleWalletIds' | 'storedWalletIds'>;
  populateStatus: PortfolioPopulateStatus | undefined;
}): boolean {
  if (!args.populateStatus?.inProgress) {
    return false;
  }

  if (
    !args.populateStatus.currentWalletId &&
    !Object.keys(args.populateStatus.walletStatusById || {}).length
  ) {
    return false;
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

function useAssetPnlSummaryClearEpoch(enabled: boolean): number {
  const [clearEpoch, setClearEpoch] = useState(
    getAssetPnlSummaryCacheClearEpoch,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncClearEpoch = () => {
      setClearEpoch(getAssetPnlSummaryCacheClearEpoch());
    };
    syncClearEpoch();
    return subscribeAssetPnlSummaryCacheClear(syncClearEpoch);
  }, [enabled]);

  return clearEpoch;
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

function hasCompletedInitialPortfolioBaseline(value: unknown): boolean {
  return isFiniteNumber(value);
}

function isResumingInterruptedPopulate(
  populateStatus: PortfolioPopulateStatus | undefined,
): boolean {
  return (
    !!populateStatus &&
    !populateStatus.inProgress &&
    isFiniteNumber(populateStatus.startedAt) &&
    !isFiniteNumber(populateStatus.finishedAt) &&
    !populateStatus.stopReason
  );
}

function getUnavailableSummaryReadiness(args: {
  eligibleWalletIds: string[];
  storedWalletIds: string[];
  lastFullPopulateCompletedAt?: number | null;
  populateStatus: PortfolioPopulateStatus | undefined;
}): {
  allowUnavailableSummary: boolean;
  unavailableSummaryRevisionSig: string;
} {
  const spec = {
    eligibleWalletIds: args.eligibleWalletIds,
    storedWalletIds: args.storedWalletIds,
  };
  const allowUnavailableSummary = args.populateStatus?.inProgress
    ? hasStrictCompletedAssetGroupPopulate({
        spec,
        populateStatus: args.populateStatus,
      })
    : hasCompletedInitialPortfolioBaseline(args.lastFullPopulateCompletedAt) &&
      !isResumingInterruptedPopulate(args.populateStatus);

  return {
    allowUnavailableSummary,
    unavailableSummaryRevisionSig: allowUnavailableSummary
      ? UNAVAILABLE_SUMMARY_READY_REVISION_SIG
      : UNAVAILABLE_SUMMARY_PENDING_REVISION_SIG,
  };
}

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
    pnlFiat: summary.pnlFiat,
    pnlPercent: summary.pnlPercent,
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
  const assetPnlSummaryClearEpoch =
    useAssetPnlSummaryClearEpoch(analysisEnabled);
  const lastPopulatedAt = useAppSelector(({PORTFOLIO}) =>
    analysisEnabled ? PORTFOLIO.lastPopulatedAt : undefined,
  );
  const lastFullPopulateCompletedAt = useAppSelector(({PORTFOLIO}) =>
    analysisEnabled ? PORTFOLIO.lastFullPopulateCompletedAt : undefined,
  );
  const populateStatus = useAppSelector(({PORTFOLIO}) =>
    analysisEnabled ? PORTFOLIO.populateStatus : undefined,
  );
  const homeCarouselConfig = useAppSelector(({APP}) =>
    analysisEnabled
      ? APP.homeCarouselConfig
      : EMPTY_PORTFOLIO_ASSET_CAROUSEL_CONFIG,
  );
  const keys = useAppSelector(({WALLET}) =>
    analysisEnabled ? WALLET.keys : EMPTY_PORTFOLIO_ASSET_KEYS,
  ) as Record<string, Key>;
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
  const committedPortfolioRevisionToken =
    committedRevisionToken ||
    buildCommittedPortfolioRevisionToken({
      lastPopulatedAt,
    });

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
      const unavailableSummaryReadiness = getUnavailableSummaryReadiness({
        eligibleWalletIds,
        storedWalletIds,
        lastFullPopulateCompletedAt,
        populateStatus,
      });

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
        allowUnavailableSummary:
          unavailableSummaryReadiness.allowUnavailableSummary,
        unavailableSummaryRevisionSig:
          unavailableSummaryReadiness.unavailableSummaryRevisionSig,
        enabled:
          !populateStatus?.inProgress ||
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
            populateStatus,
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
    lastFullPopulateCompletedAt,
    populateStatus,
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
  const lastNonEmptyVisibleItemsRef = useRef<{
    clearEpoch: number;
    items: AssetRowItem[];
  }>({
    clearEpoch: assetPnlSummaryClearEpoch,
    items: [],
  });
  useEffect(() => {
    if (items.length) {
      lastNonEmptyVisibleItemsRef.current = {
        clearEpoch: assetPnlSummaryClearEpoch,
        items,
      };
    }
  }, [assetPnlSummaryClearEpoch, items]);

  const hasSummaryLoading = Object.values(summaryStatesByKey).some(
    state => state.loading,
  );
  const visibleItems = useMemo(() => {
    if (items.length) {
      return items;
    }

    const lastNonEmptyVisibleItems =
      lastNonEmptyVisibleItemsRef.current.clearEpoch ===
      assetPnlSummaryClearEpoch
        ? lastNonEmptyVisibleItemsRef.current.items
        : [];

    return (populateStatus?.inProgress || hasSummaryLoading) &&
      lastNonEmptyVisibleItems.length
      ? lastNonEmptyVisibleItems
      : items;
  }, [
    assetPnlSummaryClearEpoch,
    hasSummaryLoading,
    items,
    populateStatus?.inProgress,
  ]);

  const walletIdsByAssetKey = useMemo(() => {
    if (!populateStatus?.inProgress) {
      return undefined;
    }

    return buildWalletIdsByAssetGroupKey(wallets);
  }, [populateStatus?.inProgress, wallets]);

  const populateLoadingByKeyPrevRef = useRef<{
    clearEpoch: number;
    value: Record<string, boolean> | undefined;
  }>({
    clearEpoch: assetPnlSummaryClearEpoch,
    value: undefined,
  });
  const isPopulateLoadingByKeyRaw = useMemo(() => {
    if (!populateStatus?.inProgress || !walletIdsByAssetKey) {
      return undefined;
    }

    return getPopulateLoadingByAssetKey({
      items: visibleItems,
      walletIdsByAssetKey,
      populateStatus,
      prev:
        populateLoadingByKeyPrevRef.current.clearEpoch ===
        assetPnlSummaryClearEpoch
          ? populateLoadingByKeyPrevRef.current.value
          : undefined,
    });
  }, [
    assetPnlSummaryClearEpoch,
    populateStatus,
    visibleItems,
    walletIdsByAssetKey,
  ]);
  const hasSettledFreshPopulateByKey = useMemo(() => {
    if (!populateStatus?.inProgress || !isPopulateLoadingByKeyRaw) {
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
          populateStatus,
        });

      next[item.key] =
        summaryReadyForDisplay ||
        (walletPopulateSettled && assetPopulateSettled && summarySettled);
    }

    return next;
  }, [
    assetGroupSpecByKey,
    isPopulateLoadingByKeyRaw,
    populateStatus,
    summaryStatesByKey,
    visibleItems,
  ]);
  const resolvedPopulateItemsSessionToken = useMemo(() => {
    return [
      typeof populateStatus?.startedAt === 'number'
        ? String(populateStatus.startedAt)
        : '',
      String(assetPnlSummaryClearEpoch),
      gainLossMode,
      quoteCurrency,
      assetKeys?.join(',') || '',
    ].join('|');
  }, [
    assetKeys,
    assetPnlSummaryClearEpoch,
    gainLossMode,
    populateStatus?.startedAt,
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
    if (!analysisEnabled) {
      return;
    }

    if (
      !populateStatus?.inProgress ||
      resolvedPopulateItemsRef.current.sessionToken !==
        resolvedPopulateItemsSessionToken
    ) {
      resolvedPopulateItemsRef.current = {
        sessionToken: populateStatus?.inProgress
          ? resolvedPopulateItemsSessionToken
          : '',
        itemsByKey: {},
      };
    }
  }, [
    analysisEnabled,
    populateStatus?.inProgress,
    resolvedPopulateItemsSessionToken,
  ]);
  const stablePopulatePresentation = useMemo(() => {
    if (!populateStatus?.inProgress || !isPopulateLoadingByKeyRaw) {
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

      if (hasSettledFreshPopulateByKey?.[item.key] === true) {
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
    populateStatus?.inProgress,
    resolvedPopulateItemsSessionToken,
    visibleItems,
  ]);

  useEffect(() => {
    if (!analysisEnabled) {
      return;
    }

    populateLoadingByKeyPrevRef.current = {
      clearEpoch: assetPnlSummaryClearEpoch,
      value: stablePopulatePresentation.isPopulateLoadingByKey,
    };
  }, [
    analysisEnabled,
    assetPnlSummaryClearEpoch,
    stablePopulatePresentation.isPopulateLoadingByKey,
  ]);
  const hasPendingVisibleOrderStabilization =
    !!populateStatus?.inProgress || hasSummaryLoading;
  const lastStableVisibleItemOrderRef = useRef<{
    clearEpoch: number;
    keys: string[];
  }>({
    clearEpoch: assetPnlSummaryClearEpoch,
    keys: [],
  });
  const visibleItemsForDisplay = useMemo(() => {
    const nextItems = stablePopulatePresentation.visibleItems;
    const previousKeys =
      lastStableVisibleItemOrderRef.current.clearEpoch ===
      assetPnlSummaryClearEpoch
        ? lastStableVisibleItemOrderRef.current.keys
        : [];

    return !hasPendingVisibleOrderStabilization || !previousKeys.length
      ? nextItems
      : stabilizeVisibleItemOrder({items: nextItems, previousKeys});
  }, [
    assetPnlSummaryClearEpoch,
    hasPendingVisibleOrderStabilization,
    stablePopulatePresentation.visibleItems,
  ]);
  useEffect(() => {
    if (!analysisEnabled || !visibleItemsForDisplay.length) {
      return;
    }

    if (
      lastStableVisibleItemOrderRef.current.clearEpoch !==
        assetPnlSummaryClearEpoch ||
      !lastStableVisibleItemOrderRef.current.keys.length ||
      !hasPendingVisibleOrderStabilization
    ) {
      lastStableVisibleItemOrderRef.current = {
        clearEpoch: assetPnlSummaryClearEpoch,
        keys: visibleItemsForDisplay.map(item => item.key),
      };
    }
  }, [
    analysisEnabled,
    assetPnlSummaryClearEpoch,
    hasPendingVisibleOrderStabilization,
    visibleItemsForDisplay,
  ]);

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

  const currentResult = useMemo<Result>(
    () => ({
      visibleItems: visibleItemsForDisplay,
      isFiatLoading,
      isPopulateLoadingByKey: stablePopulatePresentation.isPopulateLoadingByKey,
      presentationResetToken: assetPnlSummaryClearEpoch,
      hasAnyPortfolioData:
        visibleItemsForDisplay.length > 0 ||
        storedWalletRequestSig.length > 0 ||
        hasAnySummaryData ||
        !!populateStatus?.inProgress,
    }),
    [
      assetPnlSummaryClearEpoch,
      hasAnySummaryData,
      isFiatLoading,
      populateStatus?.inProgress,
      stablePopulatePresentation.isPopulateLoadingByKey,
      storedWalletRequestSig,
      visibleItemsForDisplay,
    ],
  );
  const lastEnabledResultRef = useRef(currentResult);
  if (analysisEnabled) {
    lastEnabledResultRef.current = currentResult;
  }

  return analysisEnabled ? currentResult : lastEnabledResultRef.current;
}

export default usePortfolioAssetRows;
