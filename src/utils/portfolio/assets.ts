import {Network} from '../../constants';
import type {HomeCarouselConfig} from '../../store/app/app.models';
import type {BalanceSnapshot} from '../../store/portfolio/portfolio.models';
import type {
  PortfolioPopulateStatus,
  SnapshotBalanceMismatch,
  WalletPopulateState,
} from '../../store/portfolio/portfolio.models';
import type {
  FiatRateInterval,
  FiatRateSeriesCache,
  Rates,
} from '../../store/rate/rate.models';
import {hasValidSeriesForCoin} from '../../store/rate/rate.models';
import type {Key, Wallet} from '../../store/wallet/wallet.models';
import type {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  BitpaySupportedUtxoCoins,
} from '../../constants/currencies';
import {tokenManager} from '../../managers/TokenManager';
import {
  getFiatRateBaselineTsForTimeframe,
  getFiatRateFromSeriesCacheAtTimestamp,
} from './rate';
import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
  atomicToUnitString,
  getCurrencyAbbreviation,
  calculatePercentageDifference,
  getRateByCurrencyName,
  unitStringToAtomicBigInt,
} from '../helper-methods';

// PnL engine (lifted from the web harness). Keep these imports path-stable so the
// engine code stays easily portable between RN + web.
import {
  buildPnlAnalysisSeries,
  type WalletForAnalysis,
} from './core/pnl/analysis';
import {normalizeFiatRateSeriesCoin as normalizeCoinForPnlRates} from './core/pnl/rates';
import type {BalanceSnapshotStored} from './core/pnl/types';
import {formatBigIntDecimal} from './core/format';
import {
  createSupportedCurrencyOptionLookup,
  type SupportedCurrencyOptionLookup,
} from './supportedCurrencyOptionsLookup';

export type GainLossMode = FiatRateInterval;

export type AssetRowItem = {
  key: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  name: string;
  cryptoAmount: string;
  fiatAmount: string;
  deltaFiat: string;
  deltaPercent: string;
  isPositive: boolean;
  hasRate: boolean;
  hasPnl: boolean;
  showPnlPlaceholder?: boolean;
};

export const sortAssetRowItemsByHasRate = (
  items: AssetRowItem[],
): AssetRowItem[] => {
  const arr = items || [];
  if (arr.length < 2) {
    return arr.slice();
  }
  const withRate: AssetRowItem[] = [];
  const withoutRate: AssetRowItem[] = [];
  for (const item of arr) {
    if (item?.hasRate) {
      withRate.push(item);
      continue;
    }
    withoutRate.push(item);
  }
  return withRate.concat(withoutRate);
};

type AssetRowItemSupportInfo = {
  option: SupportedCurrencyOption | undefined;
  isExactMatch: boolean;
  isStable: boolean;
};

const isExactSupportedOptionMatchForAssetRowItem = (args: {
  item: AssetRowItem;
  option: SupportedCurrencyOption;
}): boolean => {
  return (
    (args.option.currencyAbbreviation || '').toLowerCase() ===
      (args.item.currencyAbbreviation || '').toLowerCase() &&
    (args.option.chain || '').toLowerCase() ===
      (args.item.chain || '').toLowerCase() &&
    (args.option.tokenAddress || '').toLowerCase() ===
      (args.item.tokenAddress || '').toLowerCase()
  );
};

const canNavigateToExchangeRateForAssetRowItemWithSupportInfo = (args: {
  item: AssetRowItem;
  supportInfo: AssetRowItemSupportInfo;
}): boolean => {
  return (
    !!args.supportInfo.option &&
    !!args.item.hasRate &&
    args.supportInfo.isExactMatch // &&
    // !args.supportInfo.isStable
  );
};

export const canNavigateToExchangeRateForAssetRowItem = (args: {
  item: AssetRowItem;
  options: SupportedCurrencyOption[];
}): boolean => {
  return canNavigateToExchangeRateForAssetRowItemWithSupportInfo({
    item: args.item,
    supportInfo: getAssetRowItemSupportInfo(args),
  });
};

export const getDisplayAssetRowItems = (
  items: AssetRowItem[],
): AssetRowItem[] => {
  return sortAssetRowItemsByHasRate(items || []);
};

const getAssetRowItemSupportInfo = (args: {
  item: AssetRowItem;
  options: SupportedCurrencyOption[];
}): AssetRowItemSupportInfo => {
  const option = findSupportedCurrencyOptionForAsset({
    options: args.options,
    currencyAbbreviation: args.item.currencyAbbreviation,
    chain: args.item.chain,
    tokenAddress: args.item.tokenAddress,
  });

  if (!option) {
    return {option: undefined, isExactMatch: false, isStable: false};
  }

  const isExactMatch = isExactSupportedOptionMatchForAssetRowItem({
    item: args.item,
    option,
  });
  if (!isExactMatch) {
    return {option, isExactMatch: false, isStable: false};
  }

  const currencyName = getCurrencyAbbreviation(
    option.tokenAddress ? option.tokenAddress : option.currencyAbbreviation,
    option.chain,
  );

  const isStable =
    BitpaySupportedCoins[currencyName]?.properties?.isStableCoin ||
    BitpaySupportedTokens[currencyName]?.properties?.isStableCoin;

  return {option, isExactMatch: true, isStable: !!isStable};
};

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getPreferredIntervalsForTimestamp = (args: {
  timestampMs: number;
  nowMs: number;
}): FiatRateInterval[] => {
  const ageMs = args.nowMs - args.timestampMs;
  if (ageMs <= MS_PER_DAY) {
    return ['1D', '1W', '1M', 'ALL'];
  }
  if (ageMs <= 7 * MS_PER_DAY) {
    return ['1W', '1M', 'ALL'];
  }
  if (ageMs <= 30 * MS_PER_DAY) {
    return ['1M', 'ALL'];
  }
  return ['ALL'];
};

const getRateAtTimestampFromCache = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  currencyAbbreviation: string;
  timestampMs: number;
  nowMs: number;
  method?: 'nearest' | 'linear';
}): number | undefined => {
  const preferredIntervals = getPreferredIntervalsForTimestamp({
    timestampMs: args.timestampMs,
    nowMs: args.nowMs,
  });

  const seen = new Set<FiatRateInterval>();
  const intervals: FiatRateInterval[] = [
    ...preferredIntervals,
    '1D',
    '1W',
    '1M',
    'ALL',
  ].filter(interval => {
    if (seen.has(interval)) {
      return false;
    }
    seen.add(interval);
    return true;
  });

  for (const interval of intervals) {
    const rate = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      fiatCode: args.fiatCode,
      currencyAbbreviation: args.currencyAbbreviation,
      interval,
      timestampMs: args.timestampMs,
      method: args.method || 'nearest',
    });
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      return rate;
    }
  }

  return undefined;
};

const convertAmountBetweenQuotesViaBtc = (args: {
  amount: number;
  sourceQuoteCurrency: string;
  targetQuoteCurrency: string;
  timestampMs: number;
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  nowMs: number;
}): number | undefined => {
  const amount = toNumber(args.amount);
  if (!(amount > 0)) {
    return amount;
  }

  const sourceQuoteCurrency = (args.sourceQuoteCurrency || '').toUpperCase();
  const targetQuoteCurrency = (args.targetQuoteCurrency || '').toUpperCase();
  if (!sourceQuoteCurrency || !targetQuoteCurrency) {
    return undefined;
  }
  if (sourceQuoteCurrency === targetQuoteCurrency) {
    return amount;
  }

  const sourceBtcRate = getRateAtTimestampFromCache({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    fiatCode: sourceQuoteCurrency,
    currencyAbbreviation: 'btc',
    timestampMs: args.timestampMs,
    nowMs: args.nowMs,
    method: 'nearest',
  });
  const targetBtcRate = getRateAtTimestampFromCache({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    fiatCode: targetQuoteCurrency,
    currencyAbbreviation: 'btc',
    timestampMs: args.timestampMs,
    nowMs: args.nowMs,
    method: 'nearest',
  });

  if (
    !(typeof sourceBtcRate === 'number' && sourceBtcRate > 0) ||
    !(typeof targetBtcRate === 'number' && targetBtcRate > 0)
  ) {
    return undefined;
  }

  const fxRatio = targetBtcRate / sourceBtcRate;
  if (!(fxRatio > 0) || !Number.isFinite(fxRatio)) {
    return undefined;
  }

  const converted = amount * fxRatio;
  return Number.isFinite(converted) ? converted : undefined;
};

export const getQuoteCurrency = (args: {
  portfolioQuoteCurrency?: string;
  defaultAltCurrencyIsoCode?: string;
}): string => {
  return args.defaultAltCurrencyIsoCode || args.portfolioQuoteCurrency || 'USD';
};

export const hasSnapshotsForWallets = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  wallets: Wallet[] | undefined;
}): boolean => {
  const map = args.snapshotsByWalletId || {};
  for (const w of args.wallets || []) {
    const arr = map[w.id];
    if (Array.isArray(arr) && arr.length) {
      return true;
    }
  }
  return false;
};

export const hasSnapshotsBeforeMsForWallets = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  wallets: Wallet[] | undefined;
  cutoffMs: number;
}): boolean => {
  const map = args.snapshotsByWalletId || {};
  const cutoff = args.cutoffMs;
  for (const w of args.wallets || []) {
    const arr = map[w.id];
    if (!Array.isArray(arr) || !arr.length) {
      continue;
    }
    for (const s of arr) {
      const createdAt = s?.createdAt;
      if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
        return true;
      }
      if (createdAt < cutoff) {
        return true;
      }
    }
  }
  return false;
};

export const isPopulateLoadingForWallets = (args: {
  populateStatus: PortfolioPopulateStatus | undefined;
  wallets: Wallet[] | undefined;
}): boolean => {
  const populateStatus = args.populateStatus;
  if (!populateStatus?.inProgress) {
    return false;
  }

  const statusById = populateStatus.walletStatusById || {};
  const currentWalletId = populateStatus.currentWalletId;
  const inScopeWalletIds = new Set<string>([
    ...Object.keys(statusById),
    ...(currentWalletId ? [currentWalletId] : []),
  ]);

  const walletIds = (args.wallets || []).map(w => w.id);
  const relevantWalletIds = walletIds.filter(wid => inScopeWalletIds.has(wid));
  if (!relevantWalletIds.length) {
    return false;
  }

  return relevantWalletIds.some(wid => {
    const s = statusById[wid];
    if (currentWalletId && wid === currentWalletId) {
      return true;
    }
    return s === 'in_progress';
  });
};

export const getPercentageDifferenceFromPercentRatio = (
  percentRatio: number,
): number | null => {
  const pct = percentRatio * 100;
  if (!Number.isFinite(pct)) {
    return null;
  }

  return Number(pct.toFixed(2));
};

export const getLegacyPercentageDifferenceFromTotals = (args: {
  totalBalance: number;
  totalBalanceLastDay: number | undefined;
}): number | null => {
  if (!args.totalBalanceLastDay) {
    return null;
  }

  return calculatePercentageDifference(
    args.totalBalance,
    args.totalBalanceLastDay,
  );
};

export const getKeyLastDayPercentageDifference = (args: {
  totalBalance: number;
  hasSnapshots: boolean;
  hasSnapshotsBeforePopulateStarted: boolean;
  isPopulateLoading: boolean;
  legacyPercentageDifference: number | null;
  portfolioPercentageDifference: number | null;
}): number | null => {
  if (!(args.totalBalance > 0)) {
    return null;
  }
  if (!args.hasSnapshots) {
    return args.legacyPercentageDifference;
  }

  if (args.isPopulateLoading && !args.hasSnapshotsBeforePopulateStarted) {
    return args.legacyPercentageDifference;
  }

  if (args.portfolioPercentageDifference === null) {
    return args.legacyPercentageDifference;
  }

  return args.portfolioPercentageDifference;
};

const getHiddenKeyIdsFromHomeCarouselConfig = (args: {
  keys: Record<string, Key> | undefined;
  homeCarouselConfig: HomeCarouselConfig[] | undefined;
}): Set<string> => {
  const hidden = new Set<string>();
  const cfg = Array.isArray(args.homeCarouselConfig)
    ? args.homeCarouselConfig
    : [];
  for (const item of cfg) {
    const id = item?.id;
    if (!id || id === 'coinbaseBalanceCard') {
      continue;
    }
    if (item?.show === false && (!args.keys || !!args.keys[id])) {
      hidden.add(id);
    }
  }
  return hidden;
};

export const getVisibleKeysFromKeys = (
  keys: Record<string, Key> | undefined,
  homeCarouselConfig?: HomeCarouselConfig[] | undefined,
): Key[] => {
  const all = Object.values(keys || {}) as Key[];
  if (!homeCarouselConfig?.length) {
    return all;
  }
  const hiddenKeyIds = getHiddenKeyIdsFromHomeCarouselConfig({
    keys,
    homeCarouselConfig,
  });
  if (!hiddenKeyIds.size) {
    return all;
  }
  return all.filter(k => !hiddenKeyIds.has(k.id));
};

export const getVisibleWalletsFromKeys = (
  keys: Record<string, Key> | undefined,
  homeCarouselConfig?: HomeCarouselConfig[] | undefined,
): Wallet[] => {
  const visibleKeys = getVisibleKeysFromKeys(keys, homeCarouselConfig);
  return visibleKeys
    .flatMap(k => (Array.isArray(k.wallets) ? k.wallets : []))
    .filter(w => !w.hideWallet && !w.hideWalletByAccount);
};

export const buildWalletIdsByAssetGroupKey = (
  wallets: Wallet[] | undefined,
): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const w of wallets || []) {
    const id = (w as any)?.id as string | undefined;

    if ((w as any)?.network !== Network.mainnet) {
      continue;
    }

    const groupKey = ((w as any)?.currencyAbbreviation || '').toLowerCase();
    if (!id || !groupKey) {
      continue;
    }

    if (!map[groupKey]) {
      map[groupKey] = [];
    }
    map[groupKey].push(id);
  }
  return map;
};

export const isFiatLoadingForWallets = (args: {
  quoteCurrency: string;
  wallets: Wallet[];
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  fiatRateSeriesCache?: FiatRateSeriesCache;
}): boolean => {
  const target = (args.quoteCurrency || '').toUpperCase();
  if (!target) {
    return false;
  }

  const getLatestByTimestamp = (
    snapshots: BalanceSnapshot[] | undefined,
  ): BalanceSnapshot | undefined => {
    const arr = Array.isArray(snapshots) ? snapshots : [];
    let latest: BalanceSnapshot | undefined;
    for (const s of arr) {
      if (!s) {
        continue;
      }
      if (!latest || (s.timestamp || 0) > (latest.timestamp || 0)) {
        latest = s;
      }
    }
    return latest;
  };

  for (const w of args.wallets) {
    if (w?.network !== Network.mainnet) {
      continue;
    }

    const arr = args.snapshotsByWalletId[w.id] || [];
    const latest = getLatestByTimestamp(arr);
    const snapQuote = (latest?.quoteCurrency || '').toUpperCase();
    if (!snapQuote || snapQuote === target) {
      continue;
    }

    const intervals: FiatRateInterval[] = ['1D', 'ALL'];
    const hasTargetBtcSeries = hasValidSeriesForCoin({
      cache: args.fiatRateSeriesCache,
      fiatCodeUpper: target,
      normalizedCoin: 'btc',
      intervals,
    });
    const hasSourceBtcSeries = hasValidSeriesForCoin({
      cache: args.fiatRateSeriesCache,
      fiatCodeUpper: snapQuote,
      normalizedCoin: 'btc',
      intervals,
    });

    if (!hasTargetBtcSeries || !hasSourceBtcSeries) {
      return true;
    }
  }

  return false;
};

const EMPTY_SUPPORTED_CURRENCY_OPTIONS: SupportedCurrencyOption[] = [];
const supportedCurrencyOptionLookupCache = new WeakMap<
  SupportedCurrencyOption[],
  SupportedCurrencyOptionLookup
>();

const getSupportedCurrencyOptionLookup = (
  options: SupportedCurrencyOption[] | undefined,
): SupportedCurrencyOptionLookup => {
  const optionsRef = options || EMPTY_SUPPORTED_CURRENCY_OPTIONS;
  const cached = supportedCurrencyOptionLookupCache.get(optionsRef);
  if (cached) {
    return cached;
  }

  const lookup = createSupportedCurrencyOptionLookup(optionsRef);
  supportedCurrencyOptionLookupCache.set(optionsRef, lookup);
  return lookup;
};

export const findSupportedCurrencyOptionForAsset = (args: {
  options: SupportedCurrencyOption[];
  currencyAbbreviation?: string;
  chain?: string;
  tokenAddress?: string;
}): SupportedCurrencyOption | undefined => {
  return getSupportedCurrencyOptionLookup(args.options).getOption({
    currencyAbbreviation: args.currencyAbbreviation,
    chain: args.chain,
    tokenAddress: args.tokenAddress,
  });
};

const ensureSortedSnapshots = (
  snapshots: BalanceSnapshot[] | undefined,
): BalanceSnapshot[] => {
  const arr = Array.isArray(snapshots) ? snapshots : [];
  if (arr.length < 2) return arr;
  for (let i = 1; i < arr.length; i++) {
    if ((arr[i]?.timestamp || 0) < (arr[i - 1]?.timestamp || 0)) {
      return arr
        .slice()
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }
  }
  return arr;
};

const mapSnapshotsToStored = (args: {
  snapshots: BalanceSnapshot[];
  wallet: Wallet;
  walletId: string;
  unitDecimals: number;
  fallbackChain: string;
  fallbackCoin: string;
  fallbackQuoteCurrency: string;
  targetQuoteCurrency?: string;
  fiatRateSeriesCache?: FiatRateSeriesCache;
  nowMs?: number;
  fallbackAssetIdToWalletIdentity: boolean;
}): BalanceSnapshotStored[] => {
  const tokenAddress = (args.wallet as any)?.tokenAddress as string | undefined;
  const tokenAddressLower = tokenAddress
    ? tokenAddress.toLowerCase()
    : undefined;
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();

  return args.snapshots.map(s => {
    const snapshotChain = String(
      (s as any)?.chain || (args.wallet as any)?.chain || '',
    ).toLowerCase();
    const snapshotCoin = String(
      (s as any)?.coin || (args.wallet as any)?.currencyAbbreviation || '',
    ).toLowerCase();
    const chainForFields = snapshotChain || args.fallbackChain;
    const coinForFields = snapshotCoin || args.fallbackCoin;
    const assetChain = args.fallbackAssetIdToWalletIdentity
      ? chainForFields
      : snapshotChain;
    const assetCoin = args.fallbackAssetIdToWalletIdentity
      ? coinForFields
      : snapshotCoin;
    const assetId = tokenAddressLower
      ? `${assetChain}:${assetCoin}:${tokenAddressLower}`
      : `${assetChain}:${assetCoin}`;
    const snapshotQuoteCurrency = String(
      (s as any)?.quoteCurrency || args.fallbackQuoteCurrency,
    ).toUpperCase();
    const targetQuoteCurrency = (
      args.targetQuoteCurrency || args.fallbackQuoteCurrency
    ).toUpperCase();

    let markRate =
      typeof (s as any)?.costBasisRateFiat === 'number'
        ? (s as any).costBasisRateFiat
        : 0;

    if (markRate > 0 && snapshotQuoteCurrency !== targetQuoteCurrency) {
      const convertedMarkRate = convertAmountBetweenQuotesViaBtc({
        amount: markRate,
        sourceQuoteCurrency: snapshotQuoteCurrency,
        targetQuoteCurrency,
        timestampMs: Number((s as any)?.timestamp || 0),
        fiatRateSeriesCache: args.fiatRateSeriesCache,
        nowMs,
      });

      markRate =
        typeof convertedMarkRate === 'number' && convertedMarkRate > 0
          ? convertedMarkRate
          : 0;
    }

    return {
      id: String((s as any)?.id || ''),
      walletId: args.walletId,
      chain: chainForFields,
      coin: coinForFields,
      network: String((s as any)?.network || 'livenet'),
      assetId,
      timestamp: Number((s as any)?.timestamp || 0),
      eventType: ((s as any)?.eventType || 'tx') as any,
      cryptoBalance: unitStringToAtomicBigInt(
        String((s as any)?.cryptoBalance || '0'),
        args.unitDecimals,
      ).toString(),
      remainingCostBasisFiat: Number((s as any)?.remainingCostBasisFiat || 0),
      quoteCurrency: targetQuoteCurrency || snapshotQuoteCurrency,
      markRate,
      createdAt:
        typeof (s as any)?.createdAt === 'number'
          ? (s as any).createdAt
          : undefined,
      txIds: Array.isArray((s as any)?.txIds) ? (s as any).txIds : undefined,
    };
  });
};

export const getLatestSnapshot = <T>(
  snapshots: T[] | undefined,
): T | undefined => {
  const arr = Array.isArray(snapshots) ? snapshots : [];
  return arr.length ? arr[arr.length - 1] : undefined;
};

const getWalletUnitInfo = (
  wallet: Wallet,
): {
  unitDecimals: number;
  unitToSatoshi: number;
} => {
  const chain = ((wallet as any)?.chain || '').toLowerCase();
  const tokenAddress = (wallet as any)?.tokenAddress as string | undefined;

  const inferUnitToSatoshiFromLiveBalance = (): number | undefined => {
    const sat = toNumber((wallet as any)?.balance?.sat);
    const cryptoStr = (wallet as any)?.balance?.crypto;
    const crypto = toNumber(
      typeof cryptoStr === 'string' ? cryptoStr.replace(/,/g, '') : cryptoStr,
    );

    if (!(sat > 0) || !(crypto > 0)) {
      return undefined;
    }

    const inferred = sat / crypto;
    if (!Number.isFinite(inferred) || !(inferred > 0)) {
      return undefined;
    }

    const pow10 = Math.pow(10, Math.round(Math.log10(inferred)));
    const nearPow10 =
      Number.isFinite(pow10) && pow10 > 0
        ? Math.abs(inferred - pow10) / pow10 < 0.05
        : false;

    return nearPow10 ? pow10 : inferred;
  };

  if (tokenAddress) {
    const currencyName = getCurrencyAbbreviation(tokenAddress, chain);
    const credentialsTokenDecimals = (wallet as any)?.credentials?.token
      ?.decimals;

    const supportedUnitDecimals =
      BitpaySupportedTokens[currencyName]?.unitInfo?.unitDecimals;
    const supportedUnitToSatoshi =
      BitpaySupportedTokens[currencyName]?.unitInfo?.unitToSatoshi;

    if (
      typeof supportedUnitDecimals === 'number' &&
      typeof supportedUnitToSatoshi === 'number' &&
      supportedUnitToSatoshi > 0
    ) {
      return {
        unitDecimals: supportedUnitDecimals,
        unitToSatoshi: supportedUnitToSatoshi,
      };
    }

    const tokenDataByAddress =
      tokenManager.getTokenOptions().tokenDataByAddress;
    const tokenDataUnitDecimals =
      tokenDataByAddress?.[currencyName]?.unitInfo?.unitDecimals;
    const tokenDataUnitToSatoshi =
      tokenDataByAddress?.[currencyName]?.unitInfo?.unitToSatoshi;

    return {
      unitDecimals:
        typeof credentialsTokenDecimals === 'number'
          ? credentialsTokenDecimals
          : typeof tokenDataUnitDecimals === 'number'
          ? tokenDataUnitDecimals
          : typeof supportedUnitDecimals === 'number'
          ? supportedUnitDecimals
          : 0,
      unitToSatoshi:
        typeof credentialsTokenDecimals === 'number' &&
        credentialsTokenDecimals >= 0
          ? Math.pow(10, credentialsTokenDecimals)
          : typeof tokenDataUnitToSatoshi === 'number' &&
            tokenDataUnitToSatoshi > 0
          ? tokenDataUnitToSatoshi
          : typeof supportedUnitToSatoshi === 'number' &&
            supportedUnitToSatoshi > 0
          ? supportedUnitToSatoshi
          : inferUnitToSatoshiFromLiveBalance() || 1,
    };
  }

  const unitDecimals = BitpaySupportedCoins[chain]?.unitInfo?.unitDecimals;
  const unitToSatoshi = BitpaySupportedCoins[chain]?.unitInfo?.unitToSatoshi;
  return {
    unitDecimals: typeof unitDecimals === 'number' ? unitDecimals : 0,
    unitToSatoshi:
      typeof unitToSatoshi === 'number' && unitToSatoshi > 0
        ? unitToSatoshi
        : 1,
  };
};

const getWalletAtomicBalanceFromCryptoBalance = (args: {
  wallet: Wallet;
  unitDecimals: number;
}): bigint => {
  const crypto = (args.wallet as any)?.balance?.crypto;
  const unitString =
    typeof crypto === 'string' ? crypto.replace(/,/g, '') : '0';
  return unitStringToAtomicBigInt(unitString, args.unitDecimals);
};

export const getWalletLiveAtomicBalance = (args: {
  wallet: Wallet;
  unitDecimals: number;
}): bigint => {
  const chain = String((args.wallet as any)?.chain || '').toLowerCase();
  const sat = (args.wallet as any)?.balance?.sat;
  const satConfirmedLocked = (args.wallet as any)?.balance?.satConfirmedLocked;
  const satConfirmed = (args.wallet as any)?.balance?.satConfirmed;
  const satPending = (args.wallet as any)?.balance?.satPending;

  if (
    typeof sat === 'number' &&
    Number.isFinite(sat) &&
    sat >= 0 &&
    Math.trunc(sat) === sat
  ) {
    // Use canonical JS numeric string form (round-trippable), not locale formatting.
    const includeConfirmedLocked =
      (chain === 'xrp' || chain === 'sol') &&
      typeof satConfirmedLocked === 'number' &&
      Number.isFinite(satConfirmedLocked) &&
      satConfirmedLocked >= 0 &&
      Math.trunc(satConfirmedLocked) === satConfirmedLocked;
    try {
      const satAtomicBase = BigInt(sat.toString());
      const satAtomic = includeConfirmedLocked
        ? satAtomicBase + BigInt(satConfirmedLocked.toString())
        : satAtomicBase;
      const shouldTreatPendingAsAvailable =
        !!BitpaySupportedUtxoCoins[chain] &&
        typeof satPending === 'number' &&
        Number.isFinite(satPending) &&
        satPending > 0 &&
        Math.trunc(satPending) === satPending &&
        typeof satConfirmed === 'number' &&
        Number.isFinite(satConfirmed) &&
        satConfirmed >= 0 &&
        Math.trunc(satConfirmed) === satConfirmed &&
        satAtomicBase === BigInt(satConfirmed.toString());

      const satWithPendingAtomic = shouldTreatPendingAsAvailable
        ? satAtomic + BigInt(satPending.toString())
        : satAtomic;

      if (satWithPendingAtomic > 0n) {
        return satWithPendingAtomic;
      }

      const cryptoAtomic = getWalletAtomicBalanceFromCryptoBalance(args);
      return cryptoAtomic > 0n ? cryptoAtomic : satWithPendingAtomic;
    } catch {}
  }

  return getWalletAtomicBalanceFromCryptoBalance(args);
};

export const walletHasNonZeroLiveBalance = (wallet: Wallet): boolean => {
  const {unitDecimals} = getWalletUnitInfo(wallet);
  const liveAtomicBalance = getWalletLiveAtomicBalance({
    wallet,
    unitDecimals,
  });
  return liveAtomicBalance > 0n;
};

export const getSnapshotAtomicBalanceFromCryptoBalance = (args: {
  snapshot: BalanceSnapshot | undefined;
  unitDecimals: number;
}): bigint => {
  const unitString =
    typeof args.snapshot?.cryptoBalance === 'string'
      ? args.snapshot.cryptoBalance.replace(/,/g, '')
      : '0';
  return unitStringToAtomicBigInt(unitString, args.unitDecimals);
};

export const getWalletIdsToPopulateFromSnapshots = (args: {
  wallets: Wallet[];
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  previousSnapshotBalanceMismatchesByWalletId?: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  };
}): {
  walletIdsToPopulate: string[];
  snapshotBalanceMismatchUpdates: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  };
} => {
  const snapshotsByWalletId = args.snapshotsByWalletId || {};
  const prevMismatchesByWalletId =
    args.previousSnapshotBalanceMismatchesByWalletId || {};

  const snapshotBalanceMismatchUpdates: {
    [walletId: string]: SnapshotBalanceMismatch | undefined;
  } = {};

  const mainnetWalletIdsWithSnapshotBalanceMismatchThatChanged: string[] = [];
  const mainnetWalletIdsMissingSnapshots: string[] = [];

  const mismatchEquals = (
    a: SnapshotBalanceMismatch | undefined,
    b: SnapshotBalanceMismatch | undefined,
  ): boolean => {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return (
      a.walletId === b.walletId &&
      a.computedUnitsHeld === b.computedUnitsHeld &&
      a.currentWalletBalance === b.currentWalletBalance &&
      a.delta === b.delta
    );
  };

  for (const w of args.wallets || []) {
    if (!w?.id || w?.network !== Network.mainnet) {
      continue;
    }

    const snapshots = snapshotsByWalletId?.[w.id];
    const hasSnapshots = Array.isArray(snapshots) && snapshots.length > 0;

    if (!hasSnapshots) {
      const hasNonZeroLiveBalance = walletHasNonZeroLiveBalance(w);

      if (hasNonZeroLiveBalance) {
        mainnetWalletIdsMissingSnapshots.push(w.id);
      }
      continue;
    }

    const latest = getLatestSnapshot(snapshots);
    if (!latest) {
      continue;
    }

    const unitDecimals = getWalletUnitInfo(w).unitDecimals;
    const snapAtomic = getSnapshotAtomicBalanceFromCryptoBalance({
      snapshot: latest,
      unitDecimals,
    });

    const liveAtomic = getWalletLiveAtomicBalance({
      wallet: w,
      unitDecimals,
    });

    const prevMismatch = prevMismatchesByWalletId[w.id];
    if (liveAtomic !== snapAtomic) {
      const computedUnitsHeld = atomicToUnitString(snapAtomic, unitDecimals);
      const currentWalletBalance = atomicToUnitString(liveAtomic, unitDecimals);
      const deltaAtomic = snapAtomic - liveAtomic;
      const mismatch: SnapshotBalanceMismatch = {
        walletId: w.id,
        computedUnitsHeld,
        currentWalletBalance,
        delta: atomicToUnitString(deltaAtomic, unitDecimals),
      };

      if (!mismatchEquals(prevMismatch, mismatch)) {
        mainnetWalletIdsWithSnapshotBalanceMismatchThatChanged.push(w.id);
        snapshotBalanceMismatchUpdates[w.id] = mismatch;
      }
    } else if (prevMismatch) {
      snapshotBalanceMismatchUpdates[w.id] = undefined;
    }
  }

  return {
    walletIdsToPopulate: Array.from(
      new Set([
        ...mainnetWalletIdsMissingSnapshots,
        ...mainnetWalletIdsWithSnapshotBalanceMismatchThatChanged,
      ]),
    ),
    snapshotBalanceMismatchUpdates,
  };
};

const buildPortfolioSnapshotContext = (args: {
  wallets: Wallet[];
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  preferredQuoteCurrency: string;
}): {
  walletById: Map<string, Wallet>;
  effectiveQuoteCurrency: string;
  earliestSnapshotTimestampMs?: number;
} => {
  const snapshotsByWalletId = args.snapshotsByWalletId || {};
  const walletById = buildWalletByIdMap(args.wallets);
  const effectiveQuoteCurrency = getEffectiveQuoteCurrencyFromSnapshots({
    preferredQuoteCurrency: args.preferredQuoteCurrency,
    snapshotsByWalletId,
    walletById,
  });
  const earliestSnapshotTimestampMs = getEarliestSnapshotTimestampMs({
    snapshotsByWalletId,
    walletById,
  });

  return {walletById, effectiveQuoteCurrency, earliestSnapshotTimestampMs};
};

const formatDeltaFiat = (delta: number, quoteCurrency: string): string => {
  const abs = Math.abs(delta);
  const prefix = delta >= 0 ? '+' : '-';
  return `${prefix}${formatFiatAmount(abs, quoteCurrency, {
    customPrecision: 'minimal',
  })}`;
};

const formatDeltaPercent = (ratio: number): string => {
  const pct = ratio * 100;
  const abs = Math.abs(pct);
  const prefix = pct >= 0 ? '+' : '-';
  return `${prefix}${abs.toFixed(1)}%`;
};

const getCurrencySymbol = (isoCode: string): string | undefined => {
  try {
    const formatted = (0)
      .toLocaleString('en-US', {
        style: 'currency',
        currency: isoCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/\d/g, '')
      .trim();
    if (!formatted || formatted.toUpperCase() === isoCode.toUpperCase()) {
      return undefined;
    }
    return formatted;
  } catch {
    return undefined;
  }
};

const UNAVAILABLE_DELTA_FIAT = '—     ';
const UNAVAILABLE_DELTA_PERCENT = '  —  %';

const buildWalletByIdMap = (
  wallets: Wallet[] | undefined,
): Map<string, Wallet> => {
  const walletById = new Map<string, Wallet>();
  for (const w of wallets || []) {
    if (w?.id) {
      walletById.set(w.id, w);
    }
  }
  return walletById;
};

const getQuoteRateNumForAsset = (args: {
  rates?: Rates;
  quoteCurrency: string;
  coin: string;
  chain: string;
  tokenAddress?: string;
}): number => {
  if (!args.rates) {
    return 0;
  }
  const arr = getRateByCurrencyName(
    args.rates,
    args.coin,
    args.chain,
    args.tokenAddress,
  );
  const rate = arr?.find(r => r.code === args.quoteCurrency)?.rate;
  return toNumber(rate);
};

const getEffectiveQuoteCurrencyFromSnapshots = (args: {
  preferredQuoteCurrency: string;
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  walletById: Map<string, Wallet>;
}): string => {
  if (args.preferredQuoteCurrency) {
    return args.preferredQuoteCurrency;
  }

  const quoteCounts = new Map<string, number>();
  for (const [walletId, snapshots] of Object.entries(
    args.snapshotsByWalletId || {},
  )) {
    const wallet = args.walletById.get(walletId);
    if (!wallet || wallet.network !== Network.mainnet) {
      continue;
    }
    const latest = getLatestSnapshot(snapshots);
    const snapQuote = (latest?.quoteCurrency || '').toUpperCase();
    if (!snapQuote) {
      continue;
    }
    quoteCounts.set(snapQuote, (quoteCounts.get(snapQuote) || 0) + 1);
  }

  let best: string | undefined;
  let bestCount = -1;
  for (const [code, count] of quoteCounts.entries()) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }

  return best || 'USD';
};

const getEarliestSnapshotTimestampMs = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  walletById: Map<string, Wallet>;
}): number | undefined => {
  let best: number | undefined;
  for (const [walletId, snapshots] of Object.entries(
    args.snapshotsByWalletId || {},
  )) {
    const wallet = args.walletById.get(walletId);
    if (!wallet || wallet.network !== Network.mainnet) {
      continue;
    }
    const arr = Array.isArray(snapshots) ? snapshots : [];
    for (const s of arr) {
      const ts = s?.timestamp;
      if (!(typeof ts === 'number' && Number.isFinite(ts) && ts > 0)) {
        continue;
      }
      best = typeof best === 'number' ? Math.min(best, ts) : ts;
    }
  }
  return best;
};

export type PortfolioPnlChangeForTimeframeResult = {
  quoteCurrency: string;
  timeframe: FiatRateInterval;
  baselineTimestampMs: number;
  deltaFiat: number;
  percentRatio: number;
  available: boolean;
  error?: string;
};

export const getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  wallets: Wallet[];
  quoteCurrency: string;
  timeframe: FiatRateInterval;
  rates?: Rates;
  lastDayRates?: Rates;
  fiatRateSeriesCache?: FiatRateSeriesCache;
  nowMs?: number;
}): PortfolioPnlChangeForTimeframeResult => {
  const preferredQuoteCurrency = (args.quoteCurrency || '').toUpperCase();
  const {effectiveQuoteCurrency, earliestSnapshotTimestampMs} =
    buildPortfolioSnapshotContext({
      wallets: args.wallets,
      snapshotsByWalletId: args.snapshotsByWalletId || {},
      preferredQuoteCurrency,
    });

  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const baselineTimestampMs = (() => {
    const ts = getFiatRateBaselineTsForTimeframe({
      timeframe: args.timeframe,
      nowMs,
    });
    if (typeof ts === 'number') {
      return ts;
    }
    return typeof earliestSnapshotTimestampMs === 'number'
      ? earliestSnapshotTimestampMs
      : nowMs;
  })();

  const zeroResult = (
    overrides: Partial<PortfolioPnlChangeForTimeframeResult> = {},
  ): PortfolioPnlChangeForTimeframeResult => {
    return {
      quoteCurrency: effectiveQuoteCurrency,
      timeframe: args.timeframe,
      baselineTimestampMs,
      deltaFiat: 0,
      percentRatio: 0,
      available: true,
      ...overrides,
    };
  };

  if (!args.fiatRateSeriesCache) {
    return zeroResult({
      available: false,
      error: 'Missing fiatRateSeriesCache',
    });
  }

  // Prefer the PnL engine used by AssetsList.tsx so key-level % changes and
  // allocation box summaries are consistent everywhere.
  const pnlWallets: WalletForAnalysis[] = [];
  const currentRatesByCoin: Record<string, number> = {};

  for (const w of args.wallets || []) {
    if ((w as any)?.network !== Network.mainnet) continue;

    const walletId = String((w as any)?.id || '');
    const coin = String((w as any)?.currencyAbbreviation || '').toLowerCase();
    if (!walletId || !coin) continue;

    const appSnaps = ensureSortedSnapshots(
      args.snapshotsByWalletId?.[walletId],
    );
    if (!appSnaps.length) continue;

    const unitInfo = getWalletUnitInfo(w);
    const chainLower = String((w as any)?.chain || coin).toLowerCase();

    const credentials: any = {
      chain: chainLower,
      coin,
      network:
        (w as any)?.network === Network.mainnet
          ? 'livenet'
          : String((w as any)?.network || 'livenet'),
    };
    const tokenAddress = (w as any)?.tokenAddress as string | undefined;
    if (tokenAddress) {
      credentials.token = {
        ...(credentials.token || {}),
        decimals: unitInfo.unitDecimals,
        address: tokenAddress,
      };
    }

    const snaps = mapSnapshotsToStored({
      snapshots: appSnaps,
      wallet: w,
      walletId,
      unitDecimals: unitInfo.unitDecimals,
      fallbackChain: chainLower,
      fallbackCoin: coin,
      fallbackQuoteCurrency: effectiveQuoteCurrency,
      targetQuoteCurrency: effectiveQuoteCurrency,
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      nowMs,
      fallbackAssetIdToWalletIdentity: true,
    });

    pnlWallets.push({
      walletId,
      walletName: String(
        (w as any)?.walletName || (w as any)?.name || walletId,
      ),
      currencyAbbreviation: coin,
      credentials,
      snapshots: snaps,
    });

    const normCoin = normalizeCoinForPnlRates(coin);
    if (!(normCoin in currentRatesByCoin)) {
      const currentRate = getQuoteRateNumForAsset({
        rates: args.rates,
        quoteCurrency: effectiveQuoteCurrency,
        coin,
        chain: String((w as any)?.chain || coin),
        tokenAddress,
      });
      if (currentRate > 0) {
        currentRatesByCoin[normCoin] = currentRate;
      }
    }
  }

  if (!pnlWallets.length) {
    return zeroResult({available: true});
  }

  let res: ReturnType<typeof buildPnlAnalysisSeries>;
  try {
    res = buildPnlAnalysisSeries({
      wallets: pnlWallets,
      timeframe: args.timeframe as any,
      quoteCurrency: effectiveQuoteCurrency,
      fiatRateSeriesCache: args.fiatRateSeriesCache as any,
      currentRatesByCoin:
        Object.keys(currentRatesByCoin).length > 0
          ? currentRatesByCoin
          : undefined,
      nowMs,
      maxPoints: 2,
    });
  } catch (error: unknown) {
    return zeroResult({
      available: false,
      error: `Failed to build PnL analysis series: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }

  const last = res.points.length
    ? res.points[res.points.length - 1]
    : undefined;
  if (!last) {
    return zeroResult({
      available: false,
      error: 'PnL analysis returned no points',
    });
  }

  return {
    quoteCurrency: effectiveQuoteCurrency,
    timeframe: args.timeframe,
    baselineTimestampMs,
    deltaFiat: last.totalUnrealizedPnlFiat,
    percentRatio: (last.totalPnlPercent || 0) / 100,
    available: true,
  };
};

export type PortfolioGainLossSummary = {
  quoteCurrency: string;
  total: {
    deltaFiat: number;
    percentRatio: number;
    available: boolean;
    error?: string;
  };
  today: {
    deltaFiat: number;
    percentRatio: number;
    available: boolean;
    error?: string;
  };
};

export const buildPortfolioGainLossSummaryFromPortfolioSnapshots = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  wallets: Wallet[];
  quoteCurrency: string;
  rates?: Rates;
  lastDayRates?: Rates;
  fiatRateSeriesCache?: FiatRateSeriesCache;
  nowMs?: number;
}): PortfolioGainLossSummary => {
  const today = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
    snapshotsByWalletId: args.snapshotsByWalletId || {},
    wallets: args.wallets,
    quoteCurrency: args.quoteCurrency,
    timeframe: '1D',
    rates: args.rates,
    lastDayRates: args.lastDayRates,
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    nowMs: args.nowMs,
  });

  const total = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
    snapshotsByWalletId: args.snapshotsByWalletId || {},
    wallets: args.wallets,
    quoteCurrency: args.quoteCurrency,
    timeframe: 'ALL',
    rates: args.rates,
    lastDayRates: args.lastDayRates,
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    nowMs: args.nowMs,
  });

  return {
    quoteCurrency: today.quoteCurrency,
    total: {
      deltaFiat: total.deltaFiat,
      percentRatio: total.percentRatio,
      available: total.available,
      error: total.error,
    },
    today: {
      deltaFiat: today.deltaFiat,
      percentRatio: today.percentRatio,
      available: today.available,
      error: today.error,
    },
  };
};

export const buildAssetRowItemsFromPortfolioSnapshots = (args: {
  snapshotsByWalletId: {[walletId: string]: BalanceSnapshot[] | undefined};
  wallets: Wallet[];
  quoteCurrency: string;
  gainLossMode: GainLossMode;
  rates?: Rates;
  lastDayRates?: Rates;
  collapseAcrossChains?: boolean;
  fiatRateSeriesCache?: FiatRateSeriesCache;
  nowMs?: number;
}): AssetRowItem[] => {
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const quoteCurrency = (args.quoteCurrency || 'USD').toUpperCase();
  const timeframe = args.gainLossMode;
  const isTodayGainLoss = timeframe === '1D';
  const fiatRateSeriesCache = args.fiatRateSeriesCache;

  const getAssetKey = (w: Wallet): {key: string; coin: string} | null => {
    const coin = String((w as any)?.currencyAbbreviation || '').toLowerCase();
    if (!coin) return null;

    if (args.collapseAcrossChains) {
      return {key: coin, coin};
    }

    const chain = String((w as any)?.chain || '').toLowerCase();
    const tokenAddress = (w as any)?.tokenAddress as string | undefined;
    const assetId = tokenAddress
      ? `${chain}:${coin}:${tokenAddress.toLowerCase()}`
      : `${chain}:${coin}`;
    return {key: assetId, coin};
  };

  const toPnlWallet = (w: Wallet): WalletForAnalysis | null => {
    const walletId = String((w as any)?.id || '');
    const currencyAbbreviation = String(
      (w as any)?.currencyAbbreviation || '',
    ).toLowerCase();
    if (!walletId || !currencyAbbreviation) return null;

    const appSnaps = ensureSortedSnapshots(
      args.snapshotsByWalletId?.[walletId],
    );
    if (!appSnaps.length) return null;

    const unitInfo = getWalletUnitInfo(w);

    const credentials: any = {
      chain: String((w as any)?.chain || currencyAbbreviation).toLowerCase(),
      coin: currencyAbbreviation,
      network:
        (w as any)?.network === Network.mainnet
          ? 'livenet'
          : String((w as any)?.network || 'livenet'),
    };
    const tokenAddress = (w as any)?.tokenAddress as string | undefined;
    if (tokenAddress) {
      credentials.token = {
        ...(credentials.token || {}),
        decimals: unitInfo.unitDecimals,
        address: tokenAddress,
      };
    }

    const snaps = mapSnapshotsToStored({
      snapshots: appSnaps,
      wallet: w,
      walletId,
      unitDecimals: unitInfo.unitDecimals,
      fallbackChain: credentials.chain,
      fallbackCoin: currencyAbbreviation,
      fallbackQuoteCurrency: quoteCurrency,
      targetQuoteCurrency: quoteCurrency,
      fiatRateSeriesCache,
      nowMs,
      fallbackAssetIdToWalletIdentity: false,
    });

    return {
      walletId,
      walletName: String(
        (w as any)?.walletName || (w as any)?.name || walletId,
      ),
      currencyAbbreviation,
      credentials,
      snapshots: snaps,
    };
  };

  // Group wallets by asset key (display grouping).
  const walletsByAssetKey = new Map<string, Wallet[]>();
  for (const w of args.wallets || []) {
    if ((w as any)?.network !== Network.mainnet) continue;
    const info = getAssetKey(w);
    if (!info) continue;
    const list = walletsByAssetKey.get(info.key) || [];
    list.push(w);
    walletsByAssetKey.set(info.key, list);
  }

  if (!walletsByAssetKey.size) {
    return [];
  }

  // Precompute representative wallet per asset key and bucket analysis wallets
  // by normalized rate coin. This keeps one coin's stale/missing cache entries
  // from poisoning PnL for every asset row.
  const repWalletByAssetKey = new Map<string, Wallet>();
  const coinByAssetKey = new Map<string, string>();
  const pnlWalletsByRateCoin = new Map<string, WalletForAnalysis[]>();
  const seenPnlWalletIds = new Set<string>();

  const currentRatesByCoin: Record<string, number> = {};

  for (const [assetKey, groupWallets] of walletsByAssetKey.entries()) {
    const first = groupWallets[0];
    const coin = String(
      (first as any)?.currencyAbbreviation || '',
    ).toLowerCase();
    if (!coin) {
      continue;
    }

    // For collapsed views (e.g. ETH across multiple EVM networks), prefer the L1/base-chain
    // wallet as the representative so icons + metadata resolve consistently.
    const repWallet = args.collapseAcrossChains
      ? groupWallets.find(
          w =>
            String((w as any)?.chain || '').toLowerCase() === coin &&
            !(w as any)?.tokenAddress,
        ) || first
      : first;

    repWalletByAssetKey.set(assetKey, repWallet);
    coinByAssetKey.set(assetKey, coin);

    const normCoin = normalizeCoinForPnlRates(coin);
    if (!(normCoin in currentRatesByCoin)) {
      const currentRate = getQuoteRateNumForAsset({
        rates: args.rates,
        quoteCurrency,
        coin,
        chain: String((repWallet as any)?.chain || coin),
        tokenAddress: (repWallet as any)?.tokenAddress,
      });
      if (currentRate > 0) {
        currentRatesByCoin[normCoin] = currentRate;
      }
    }

    for (const w of groupWallets) {
      const pw = toPnlWallet(w);
      if (!pw) continue;
      if (seenPnlWalletIds.has(pw.walletId)) continue;
      seenPnlWalletIds.add(pw.walletId);
      const existing = pnlWalletsByRateCoin.get(normCoin) || [];
      existing.push(pw);
      pnlWalletsByRateCoin.set(normCoin, existing);
    }
  }

  type AnalysisPoint = ReturnType<
    typeof buildPnlAnalysisSeries
  >['points'][number];

  const lastPointByRateCoin = new Map<string, AnalysisPoint>();
  if (fiatRateSeriesCache) {
    for (const [rateCoin, walletsForCoin] of pnlWalletsByRateCoin.entries()) {
      if (!walletsForCoin.length) {
        continue;
      }

      const currentRate = currentRatesByCoin[rateCoin];
      const currentRateOverride =
        typeof currentRate === 'number' && Number.isFinite(currentRate)
          ? {[rateCoin]: currentRate}
          : undefined;

      try {
        const res = buildPnlAnalysisSeries({
          wallets: walletsForCoin,
          timeframe: timeframe as any,
          quoteCurrency,
          fiatRateSeriesCache: fiatRateSeriesCache as any,
          currentRatesByCoin: currentRateOverride,
          nowMs,
          maxPoints: 2,
        });

        const lastPoint = res.points.length
          ? res.points[res.points.length - 1]
          : undefined;
        if (lastPoint) {
          lastPointByRateCoin.set(rateCoin, lastPoint);
        }
      } catch {
        // Ignore and use fallback per-row rate-derived calculations below.
      }
    }
  }

  const rows: Array<{
    key: string;
    repWallet: Wallet;
    coin: string;
    chain: string;
    tokenAddress?: string;
    cryptoAmount: string;
    fiatValue: number;
    pnlFiat: number;
    pnlRatio: number;
    hasRate: boolean;
    hasPnl: boolean;
  }> = [];

  for (const [assetKey, groupWallets] of walletsByAssetKey.entries()) {
    const repWallet = repWalletByAssetKey.get(assetKey) || groupWallets[0];
    const coin =
      coinByAssetKey.get(assetKey) ||
      String((repWallet as any)?.currencyAbbreviation || '').toLowerCase();
    if (!coin) {
      continue;
    }

    // Aggregate per-wallet PnL stats from the last point of this row's rate-coin series.
    let fiatValue = 0;
    let pnlFiat = 0;
    let pnlRatio = 0;
    let hasRate = false;
    let hasPnl = false;

    const rateCoin = normalizeCoinForPnlRates(coin);
    const lastPoint = lastPointByRateCoin.get(rateCoin);
    if (lastPoint) {
      let basis = 0;
      let hasWalletPoints = false;

      for (const w of groupWallets) {
        const wid = String((w as any)?.id || '');
        if (!wid) continue;

        const wp = (lastPoint as any).byWalletId?.[wid] as any;
        if (!wp) continue;

        hasWalletPoints = true;
        fiatValue += toNumber(wp.fiatBalance);
        pnlFiat += toNumber(wp.unrealizedPnlFiat);
        basis += toNumber(wp.remainingCostBasisFiat);
      }

      if (hasWalletPoints) {
        hasRate = true;
        hasPnl = true;
        pnlRatio = basis > 0 ? pnlFiat / basis : 0;
        if (!Number.isFinite(pnlRatio)) {
          pnlRatio = 0;
        }
      }
    }

    // Use live wallet balances for displayed holdings so rows still render when
    // snapshot history is incomplete or stale.
    let totalAtomic = 0n;
    const repUnitDecimals = getWalletUnitInfo(repWallet).unitDecimals;
    for (const w of groupWallets) {
      try {
        const walletUnitDecimals = getWalletUnitInfo(w).unitDecimals;
        totalAtomic += getWalletLiveAtomicBalance({
          wallet: w,
          unitDecimals: walletUnitDecimals,
        });
      } catch {
        // ignore
      }
    }

    if (totalAtomic <= 0n) continue;

    const currentRateForDisplay = getQuoteRateNumForAsset({
      rates: args.rates,
      quoteCurrency,
      coin,
      chain: String((repWallet as any)?.chain || coin),
      tokenAddress: (repWallet as any)?.tokenAddress,
    });
    const units = Number(atomicToUnitString(totalAtomic, repUnitDecimals));
    const unitsForDisplay = Number.isFinite(units) ? units : 0;
    if (currentRateForDisplay > 0) {
      fiatValue = unitsForDisplay * currentRateForDisplay;
      hasRate = true;
    }

    if (isTodayGainLoss && !hasPnl && currentRateForDisplay > 0) {
      const lastDayRateForDisplay = getQuoteRateNumForAsset({
        rates: args.lastDayRates,
        quoteCurrency,
        coin,
        chain: String((repWallet as any)?.chain || coin),
        tokenAddress: (repWallet as any)?.tokenAddress,
      });
      if (lastDayRateForDisplay > 0) {
        const lastDayFiatValue = unitsForDisplay * lastDayRateForDisplay;
        pnlFiat = fiatValue - lastDayFiatValue;
        pnlRatio = lastDayFiatValue > 0 ? pnlFiat / lastDayFiatValue : 0;
        hasPnl = true;
      }
    }

    const cryptoAmount = formatBigIntDecimal(
      totalAtomic,
      repUnitDecimals,
      Math.min(repUnitDecimals, 8),
    );

    rows.push({
      key: assetKey,
      repWallet,
      coin,
      chain: String((repWallet as any)?.chain || ''),
      tokenAddress: (repWallet as any)?.tokenAddress,
      cryptoAmount,
      fiatValue,
      pnlFiat,
      pnlRatio,
      hasRate,
      hasPnl,
    });
  }

  rows.sort((a, b) => (b.fiatValue || 0) - (a.fiatValue || 0));

  return rows.map(r => {
    const showPnlPlaceholder = !r.hasPnl && (!isTodayGainLoss || !r.hasRate);

    return {
      key: r.key,
      currencyAbbreviation: r.coin,
      chain: r.chain,
      tokenAddress: r.tokenAddress,
      name: formatCurrencyAbbreviation(r.coin),
      cryptoAmount: r.cryptoAmount,
      fiatAmount: formatFiatAmount(r.fiatValue, quoteCurrency, {
        customPrecision: 'minimal',
      }),
      deltaFiat: showPnlPlaceholder
        ? UNAVAILABLE_DELTA_FIAT
        : formatDeltaFiat(r.pnlFiat, quoteCurrency),
      deltaPercent: showPnlPlaceholder
        ? UNAVAILABLE_DELTA_PERCENT
        : formatDeltaPercent(r.pnlRatio),
      isPositive: r.pnlFiat >= 0,
      hasRate: r.hasRate,
      hasPnl: r.hasPnl,
      showPnlPlaceholder,
    };
  });
};

export const getPopulateLoadingByAssetKey = (args: {
  items: Array<{key: string}>;
  walletIdsByAssetKey: Record<string, string[]>;
  populateStatus: PortfolioPopulateStatus;
  prev?: Record<string, boolean>;
}): Record<string, boolean> | undefined => {
  if (!args.populateStatus?.inProgress) {
    return undefined;
  }

  const prevMap = args.prev || {};
  const statusById = args.populateStatus.walletStatusById || {};
  const currentWalletId = args.populateStatus.currentWalletId;
  const mainnetWalletsTotal = Object.values(args.walletIdsByAssetKey).reduce(
    (sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0),
    0,
  );
  const isFullPopulate =
    mainnetWalletsTotal > 0 &&
    args.populateStatus.walletsTotal === mainnetWalletsTotal;
  const inScopeWalletIds = new Set<string>([
    ...Object.keys(statusById || {}),
    ...(currentWalletId ? [currentWalletId] : []),
  ]);

  const next: Record<string, boolean> = {};

  for (const item of args.items) {
    const assetWalletIdsAll = args.walletIdsByAssetKey[item.key] || [];
    const assetWalletIds = isFullPopulate
      ? assetWalletIdsAll
      : assetWalletIdsAll.filter(wid => inScopeWalletIds.has(wid));

    if (!assetWalletIds.length) {
      next[item.key] = !!prevMap[item.key];
      continue;
    }

    const allFinished = assetWalletIds.every(wid => {
      const s = statusById[wid] as WalletPopulateState | undefined;
      return s === 'done' || s === 'error';
    });

    next[item.key] = !allFinished;
  }

  for (const k of Object.keys(prevMap)) {
    if (!(k in next)) {
      next[k] = prevMap[k];
    }
  }

  const prevKeys = Object.keys(prevMap);
  const nextKeys = Object.keys(next);
  if (prevKeys.length === nextKeys.length) {
    let same = true;
    for (const k of nextKeys) {
      if (prevMap[k] !== next[k]) {
        same = false;
        break;
      }
    }
    if (same) {
      return args.prev;
    }
  }

  return next;
};
