import type {
  BalanceChartViewModel,
  BalanceChartViewModelChangeRow,
} from '../core/pnl/balanceChartViewModel';
import type {PnlTimeframe} from '../core/pnl/analysisStreaming';
import type {StoredWallet} from '../core/types';

export type AssetPnlSummaryIdentity = {
  assetKey: string;
  currencyAbbreviation: string;
  chain?: string;
  tokenAddress?: string;
  walletIds: string[];
  storedWalletRequestSig: string;
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  currentRatesSignature: string;
  chartDataRevisionSig: string;
  summaryCacheRevisionSig: string;
  asOfMs?: number;
  balanceOffset?: number;
};

export type AssetPnlSummary = {
  assetKey: string;
  fiatValue?: number;
  displayedFiatValue?: number;
  pnlFiat: number;
  pnlPercent: number;
  totalCryptoBalanceFormatted?: string;
  hasPnl: boolean;
};

export type AssetPnlSummaryCacheEntry = {
  key: string;
  identity: AssetPnlSummaryIdentity;
  generation: number;
  loading: boolean;
  summary?: AssetPnlSummary;
  error?: Error;
  promise?: Promise<BalanceChartViewModel>;
};

type BalanceChartViewModelQueryLike = {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  currentRatesByAssetId?: Record<string, number>;
  dataRevisionSig: string;
  walletIds: string[];
  balanceOffset?: number;
  asOfMs?: number;
  summaryCacheRevisionSig?: string;
};

const assetPnlSummaryCache = new Map<string, AssetPnlSummaryCacheEntry>();
const listenersByCacheKey = new Map<string, Set<() => void>>();
const listenersByCompatibilityKey = new Map<string, Set<() => void>>();
const clearListeners = new Set<() => void>();
let assetPnlSummaryCacheGeneration = 0;

const normalizeString = (value: unknown): string => String(value || '').trim();

const normalizeLower = (value: unknown): string =>
  normalizeString(value).toLowerCase();

const normalizeUpper = (value: unknown): string =>
  normalizeString(value).toUpperCase();

const normalizeWalletIds = (walletIds: string[] | undefined): string[] =>
  Array.from(
    new Set(
      (walletIds || [])
        .map(walletId => normalizeString(walletId))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

const normalizeFiniteNumber = (value: unknown): number | undefined => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
};

const normalizeBalanceOffset = (value: unknown): number =>
  normalizeFiniteNumber(value) ?? 0;

export function getAssetPnlStoredWalletRequestSignature(
  storedWallets: StoredWallet[],
): string {
  return (storedWallets || [])
    .map(wallet => {
      const summary = wallet.summary;
      return [
        summary.walletId,
        summary.chain,
        summary.currencyAbbreviation,
        summary.tokenAddress || '',
        typeof summary.unitDecimals === 'number'
          ? String(summary.unitDecimals)
          : '',
        summary.balanceAtomic || '',
      ].join(':');
    })
    .sort()
    .join('|');
}

export function getAssetPnlCurrentRatesSignature(
  currentRatesByAssetId: Record<string, number> | undefined,
): string {
  const ratesByAssetId = currentRatesByAssetId || {};
  return Object.keys(ratesByAssetId)
    .sort()
    .map(assetId => `${assetId}:${String(ratesByAssetId[assetId])}`)
    .join('|');
}

export function normalizeAssetPnlSummaryIdentity(
  identity: AssetPnlSummaryIdentity,
): AssetPnlSummaryIdentity {
  return {
    assetKey: normalizeLower(identity.assetKey),
    currencyAbbreviation: normalizeLower(identity.currencyAbbreviation),
    chain: normalizeLower(identity.chain) || undefined,
    tokenAddress: normalizeLower(identity.tokenAddress) || undefined,
    walletIds: normalizeWalletIds(identity.walletIds),
    storedWalletRequestSig: normalizeString(identity.storedWalletRequestSig),
    quoteCurrency: normalizeUpper(identity.quoteCurrency || 'USD'),
    timeframe: identity.timeframe,
    currentRatesSignature: normalizeString(identity.currentRatesSignature),
    chartDataRevisionSig: normalizeString(identity.chartDataRevisionSig),
    summaryCacheRevisionSig: normalizeString(identity.summaryCacheRevisionSig),
    asOfMs: normalizeFiniteNumber(identity.asOfMs),
    balanceOffset: normalizeBalanceOffset(identity.balanceOffset),
  };
}

export function buildAssetPnlSummaryCacheKey(
  identity: AssetPnlSummaryIdentity,
): string {
  const normalized = normalizeAssetPnlSummaryIdentity(identity);

  return JSON.stringify({
    assetKey: normalized.assetKey,
    currencyAbbreviation: normalized.currencyAbbreviation,
    chain: normalized.chain || '',
    tokenAddress: normalized.tokenAddress || '',
    walletIds: normalized.walletIds,
    storedWalletRequestSig: normalized.storedWalletRequestSig,
    quoteCurrency: normalized.quoteCurrency,
    timeframe: normalized.timeframe,
    currentRatesSignature: normalized.currentRatesSignature,
    chartDataRevisionSig: normalized.chartDataRevisionSig,
    summaryCacheRevisionSig: normalized.summaryCacheRevisionSig,
    asOfMs: normalized.asOfMs ?? '',
    balanceOffset: normalized.balanceOffset ?? 0,
  });
}

const getSpotRatesRevisionSig = (summaryCacheRevisionSig: string): string => {
  const separatorIndex = summaryCacheRevisionSig.indexOf('|');
  return separatorIndex === -1
    ? summaryCacheRevisionSig
    : summaryCacheRevisionSig.slice(0, separatorIndex);
};

export function buildAssetPnlSummaryCompatibilityKey(
  identity: AssetPnlSummaryIdentity,
): string {
  const normalized = normalizeAssetPnlSummaryIdentity(identity);

  return JSON.stringify({
    assetKey: normalized.assetKey,
    currencyAbbreviation: normalized.currencyAbbreviation,
    chain: normalized.chain || '',
    tokenAddress: normalized.tokenAddress || '',
    walletIds: normalized.walletIds,
    storedWalletRequestSig: normalized.storedWalletRequestSig,
    quoteCurrency: normalized.quoteCurrency,
    timeframe: normalized.timeframe,
    currentRatesSignature: normalized.currentRatesSignature,
    chartDataRevisionSig: normalized.chartDataRevisionSig,
    asOfMs: normalized.asOfMs ?? '',
    balanceOffset: normalized.balanceOffset ?? 0,
    spotRatesRevisionSig: getSpotRatesRevisionSig(
      normalized.summaryCacheRevisionSig,
    ),
  });
}

function emitChange(cacheKey: string, identity: AssetPnlSummaryIdentity): void {
  const listeners = new Set(listenersByCacheKey.get(cacheKey) || []);
  for (const listener of listenersByCompatibilityKey.get(
    buildAssetPnlSummaryCompatibilityKey(identity),
  ) || []) {
    listeners.add(listener);
  }
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAssetPnlSummaryCache(
  cacheKeys: readonly string[],
  listener: () => void,
  compatibilityKeys: readonly string[] = [],
): () => void {
  const subscribedCacheKeys = Array.from(
    new Set(cacheKeys.filter(cacheKey => !!cacheKey)),
  );
  const subscribedCompatibilityKeys = Array.from(
    new Set(compatibilityKeys.filter(compatibilityKey => !!compatibilityKey)),
  );

  for (const cacheKey of subscribedCacheKeys) {
    const listeners = listenersByCacheKey.get(cacheKey) || new Set();
    listeners.add(listener);
    listenersByCacheKey.set(cacheKey, listeners);
  }
  for (const compatibilityKey of subscribedCompatibilityKeys) {
    const listeners =
      listenersByCompatibilityKey.get(compatibilityKey) || new Set();
    listeners.add(listener);
    listenersByCompatibilityKey.set(compatibilityKey, listeners);
  }

  return () => {
    for (const cacheKey of subscribedCacheKeys) {
      const listeners = listenersByCacheKey.get(cacheKey);
      listeners?.delete(listener);
      if (!listeners?.size) {
        listenersByCacheKey.delete(cacheKey);
      }
    }
    for (const compatibilityKey of subscribedCompatibilityKeys) {
      const listeners = listenersByCompatibilityKey.get(compatibilityKey);
      listeners?.delete(listener);
      if (!listeners?.size) {
        listenersByCompatibilityKey.delete(compatibilityKey);
      }
    }
  };
}

export function subscribeAssetPnlSummaryCacheClear(
  listener: () => void,
): () => void {
  clearListeners.add(listener);
  return () => {
    clearListeners.delete(listener);
  };
}

export function getAssetPnlSummaryCacheEntry(
  cacheKey: string | undefined,
): AssetPnlSummaryCacheEntry | undefined {
  return cacheKey ? assetPnlSummaryCache.get(cacheKey) : undefined;
}

export function getAssetPnlSummaryCacheClearEpoch(): number {
  return assetPnlSummaryCacheGeneration;
}

const identitiesMatchForProvisionalDisplay = (
  leftIdentity: AssetPnlSummaryIdentity,
  rightIdentity: AssetPnlSummaryIdentity,
): boolean => {
  const left = normalizeAssetPnlSummaryIdentity(leftIdentity);
  const right = normalizeAssetPnlSummaryIdentity(rightIdentity);

  return (
    left.assetKey === right.assetKey &&
    left.currencyAbbreviation === right.currencyAbbreviation &&
    (left.chain || '') === (right.chain || '') &&
    (left.tokenAddress || '') === (right.tokenAddress || '') &&
    areStringArraysEqual(left.walletIds, right.walletIds) &&
    left.storedWalletRequestSig === right.storedWalletRequestSig &&
    left.quoteCurrency === right.quoteCurrency &&
    left.timeframe === right.timeframe &&
    left.currentRatesSignature === right.currentRatesSignature &&
    left.chartDataRevisionSig === right.chartDataRevisionSig &&
    (left.asOfMs ?? '') === (right.asOfMs ?? '') &&
    left.balanceOffset === right.balanceOffset &&
    getSpotRatesRevisionSig(left.summaryCacheRevisionSig) ===
      getSpotRatesRevisionSig(right.summaryCacheRevisionSig)
  );
};

export function findCompatibleAssetPnlSummaryCacheEntry(
  identity: AssetPnlSummaryIdentity,
): AssetPnlSummaryCacheEntry | undefined {
  return Array.from(assetPnlSummaryCache.values())
    .reverse()
    .find(
      entry =>
        entry.summary?.hasPnl &&
        identitiesMatchForProvisionalDisplay(entry.identity, identity),
    );
}

export function clearAssetPnlSummaryCache(): void {
  assetPnlSummaryCacheGeneration += 1;
  assetPnlSummaryCache.clear();

  const listeners = new Set(clearListeners);
  for (const cacheKeyListeners of listenersByCacheKey.values()) {
    for (const listener of cacheKeyListeners) {
      listeners.add(listener);
    }
  }
  for (const compatibilityKeyListeners of listenersByCompatibilityKey.values()) {
    for (const listener of compatibilityKeyListeners) {
      listeners.add(listener);
    }
  }
  for (const listener of listeners) {
    listener();
  }
}

export const clearAssetPnlSummaryCacheForTests = clearAssetPnlSummaryCache;

function getSingleAssetIdentityFromStoredWallets(
  storedWallets: StoredWallet[],
):
  | Pick<
      AssetPnlSummaryIdentity,
      'assetKey' | 'currencyAbbreviation' | 'chain' | 'tokenAddress'
    >
  | undefined {
  let assetKey = '';
  let representative: StoredWallet | undefined;
  let representativeIsBaseAsset = false;

  for (const wallet of storedWallets || []) {
    const groupKey = normalizeLower(wallet.summary.currencyAbbreviation);
    if (!groupKey) continue;
    if (assetKey && groupKey !== assetKey) return undefined;
    assetKey = groupKey;

    const isBaseAsset =
      normalizeLower(wallet.summary.chain) === assetKey &&
      !wallet.summary.tokenAddress;
    if (!representative || (isBaseAsset && !representativeIsBaseAsset)) {
      representative = wallet;
      representativeIsBaseAsset = isBaseAsset;
    }
  }

  if (!assetKey || !representative) return undefined;

  return {
    assetKey,
    currencyAbbreviation: assetKey,
    chain: normalizeLower(representative.summary.chain) || undefined,
    tokenAddress:
      normalizeLower(representative.summary.tokenAddress) || undefined,
  };
}

export function buildAssetPnlSummaryIdentityFromViewModelQuery(
  args: BalanceChartViewModelQueryLike,
): AssetPnlSummaryIdentity | undefined {
  const assetIdentity = getSingleAssetIdentityFromStoredWallets(args.wallets);
  if (!assetIdentity) {
    return undefined;
  }

  const walletIds = normalizeWalletIds(
    args.walletIds?.length
      ? args.walletIds
      : args.wallets.map(wallet => wallet.summary.walletId),
  );
  if (!walletIds.length) {
    return undefined;
  }

  return normalizeAssetPnlSummaryIdentity({
    ...assetIdentity,
    walletIds,
    storedWalletRequestSig: getAssetPnlStoredWalletRequestSignature(
      args.wallets,
    ),
    quoteCurrency: args.quoteCurrency,
    timeframe: args.timeframe,
    currentRatesSignature: getAssetPnlCurrentRatesSignature(
      args.currentRatesByAssetId,
    ),
    chartDataRevisionSig: args.dataRevisionSig,
    summaryCacheRevisionSig: args.summaryCacheRevisionSig || '',
    asOfMs: args.asOfMs,
    balanceOffset: args.balanceOffset,
  });
}

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

function viewModelMatchesIdentity(args: {
  viewModel: BalanceChartViewModel;
  identity: AssetPnlSummaryIdentity;
}): boolean {
  const identity = normalizeAssetPnlSummaryIdentity(args.identity);
  const viewModelWalletIds = normalizeWalletIds(args.viewModel.walletIds);

  return (
    normalizeUpper(args.viewModel.quoteCurrency) === identity.quoteCurrency &&
    args.viewModel.timeframe === identity.timeframe &&
    normalizeString(args.viewModel.dataRevisionSig) ===
      identity.chartDataRevisionSig &&
    normalizeBalanceOffset(args.viewModel.balanceOffset) ===
      identity.balanceOffset &&
    areStringArraysEqual(viewModelWalletIds, identity.walletIds)
  );
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function hasValidChangeRow(
  changeRow: BalanceChartViewModelChangeRow | undefined,
): changeRow is BalanceChartViewModelChangeRow {
  return (
    isFiniteNumber(changeRow?.totalPnlChange) &&
    isFiniteNumber(changeRow?.totalPnlPercent)
  );
}

export function buildAssetPnlSummaryFromBalanceChartViewModel(args: {
  identity: AssetPnlSummaryIdentity;
  viewModel: BalanceChartViewModel;
}): AssetPnlSummary | undefined {
  if (!viewModelMatchesIdentity(args)) {
    return undefined;
  }

  const latestPoint = args.viewModel.analysisPoints.length
    ? args.viewModel.analysisPoints[args.viewModel.analysisPoints.length - 1]
    : undefined;
  const changeRow = args.viewModel.changeRow;
  const hasPnl = hasValidChangeRow(changeRow);

  return {
    assetKey: args.identity.assetKey,
    fiatValue: isFiniteNumber(args.viewModel.latestTotalFiatBalance)
      ? args.viewModel.latestTotalFiatBalance
      : latestPoint?.totalFiatBalance,
    displayedFiatValue: isFiniteNumber(
      args.viewModel.latestDisplayedTotalFiatBalance,
    )
      ? args.viewModel.latestDisplayedTotalFiatBalance
      : undefined,
    pnlFiat: hasPnl ? changeRow.totalPnlChange : 0,
    pnlPercent: hasPnl ? changeRow.totalPnlPercent : 0,
    totalCryptoBalanceFormatted:
      typeof latestPoint?.totalCryptoBalanceFormatted === 'string'
        ? latestPoint.totalCryptoBalanceFormatted
        : undefined,
    hasPnl,
  };
}

function seedAssetPnlSummaryCacheForGeneration(args: {
  identity: AssetPnlSummaryIdentity;
  viewModel: BalanceChartViewModel;
  generation: number;
}): boolean {
  if (args.generation !== assetPnlSummaryCacheGeneration) {
    return false;
  }

  const identity = normalizeAssetPnlSummaryIdentity(args.identity);
  const key = buildAssetPnlSummaryCacheKey(identity);
  const summary = buildAssetPnlSummaryFromBalanceChartViewModel({
    identity,
    viewModel: args.viewModel,
  });

  if (!summary) {
    return false;
  }

  assetPnlSummaryCache.set(key, {
    key,
    identity,
    generation: args.generation,
    loading: false,
    summary,
    error: undefined,
    promise: undefined,
  });
  emitChange(key, identity);
  return true;
}

export function seedAssetPnlSummaryCache(args: {
  identity: AssetPnlSummaryIdentity;
  viewModel: BalanceChartViewModel;
}): boolean {
  return seedAssetPnlSummaryCacheForGeneration({
    ...args,
    generation: assetPnlSummaryCacheGeneration,
  });
}

function setAssetPnlSummaryLoading(args: {
  identity: AssetPnlSummaryIdentity;
  promise: Promise<BalanceChartViewModel>;
}): {key: string; generation: number} {
  const identity = normalizeAssetPnlSummaryIdentity(args.identity);
  const key = buildAssetPnlSummaryCacheKey(identity);
  const generation = assetPnlSummaryCacheGeneration;

  assetPnlSummaryCache.set(key, {
    key,
    identity,
    generation,
    loading: true,
    summary: assetPnlSummaryCache.get(key)?.summary,
    error: undefined,
    promise: args.promise,
  });
  emitChange(key, identity);
  return {key, generation};
}

function setAssetPnlSummaryError(args: {
  identity: AssetPnlSummaryIdentity;
  promise: Promise<BalanceChartViewModel>;
  error: Error;
  generation: number;
}): void {
  if (args.generation !== assetPnlSummaryCacheGeneration) {
    return;
  }

  const identity = normalizeAssetPnlSummaryIdentity(args.identity);
  const key = buildAssetPnlSummaryCacheKey(identity);
  const current = assetPnlSummaryCache.get(key);

  if (
    current?.promise !== args.promise ||
    current.generation !== args.generation
  ) {
    return;
  }

  assetPnlSummaryCache.set(key, {
    key,
    identity,
    generation: args.generation,
    loading: false,
    summary: current.summary,
    error: args.error,
    promise: undefined,
  });
  emitChange(key, identity);
}

function attachAssetPnlSummaryPromiseHandlers(args: {
  identity: AssetPnlSummaryIdentity;
  promise: Promise<BalanceChartViewModel>;
  generation: number;
}): void {
  args.promise
    .then(viewModel => {
      const seeded = seedAssetPnlSummaryCacheForGeneration({
        identity: args.identity,
        viewModel,
        generation: args.generation,
      });
      if (!seeded) {
        setAssetPnlSummaryError({
          identity: args.identity,
          promise: args.promise,
          error: new Error('Asset PnL summary view model identity mismatch'),
          generation: args.generation,
        });
      }
    })
    .catch(reason => {
      setAssetPnlSummaryError({
        identity: args.identity,
        promise: args.promise,
        error: reason instanceof Error ? reason : new Error(String(reason)),
        generation: args.generation,
      });
    });
}

export function trackAssetPnlSummaryViewModelPromise(args: {
  identity: AssetPnlSummaryIdentity;
  promise: Promise<BalanceChartViewModel>;
}): void {
  const key = buildAssetPnlSummaryCacheKey(args.identity);
  const current = assetPnlSummaryCache.get(key);

  if (current?.summary || current?.loading) {
    return;
  }

  const {generation} = setAssetPnlSummaryLoading(args);
  attachAssetPnlSummaryPromiseHandlers({
    ...args,
    generation,
  });
}

export function loadAssetPnlSummary(args: {
  identity: AssetPnlSummaryIdentity;
  query: () => Promise<BalanceChartViewModel>;
}): Promise<BalanceChartViewModel> | undefined {
  const key = buildAssetPnlSummaryCacheKey(args.identity);
  const current = assetPnlSummaryCache.get(key);

  if (current?.summary || current?.loading) {
    return current.promise;
  }

  if (current?.error) {
    return undefined;
  }

  const promise = args.query();
  const {generation} = setAssetPnlSummaryLoading({
    identity: args.identity,
    promise,
  });
  attachAssetPnlSummaryPromiseHandlers({
    identity: args.identity,
    promise,
    generation,
  });

  return promise;
}
