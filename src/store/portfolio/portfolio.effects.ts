import {Effect, RootState} from '..';
import {Network} from '../../constants';
import {
  getFiatRateSeriesCacheKey,
  type FiatRateInterval,
  type Rates,
} from '../rate/rate.models';
import {
  fetchFiatRateSeriesAllIntervals,
  fetchFiatRateSeriesInterval,
  startGetRates,
} from '../wallet/effects';
import {pruneFiatRateSeriesCache} from '../rate/rate.actions';
import {
  BWS_TX_HISTORY_LIMIT,
  GetTransactionHistory,
} from '../wallet/effects/transactions/transactions';
import {GetPrecision} from '../wallet/utils/currency';
import type {Wallet} from '../wallet/wallet.models';
import {
  getRateByCurrencyName,
  getErrorString,
  atomicToUnitString,
  unitStringToAtomicBigInt,
} from '../../utils/helper-methods';

import {
  buildBalanceSnapshotsAsync,
  computeBalanceSnapshotComputed,
} from '../../utils/portfolio/core/pnl/snapshots';
import {normalizeFiatRateSeriesCoin} from '../../utils/portfolio/core/pnl/rates';
import type {BalanceSnapshotStored} from '../../utils/portfolio/core/pnl/types';
import {getLatestSnapshot} from '../../utils/portfolio/assets';
import {
  finishPopulatePortfolio,
  setSnapshotBalanceMismatchesByWalletIdUpdates,
  setWalletSnapshots,
  startPopulatePortfolio,
  updatePopulateProgress,
} from './portfolio.actions';
import type {
  BalanceSnapshot,
  SnapshotBalanceMismatch,
  WalletPopulateState,
} from './portfolio.models';
import {
  getWalletIdsToPopulateFromSnapshots,
  getSnapshotAtomicBalanceFromCryptoBalance,
  getWalletLiveAtomicBalance,
} from '../../utils/portfolio/assets';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const POPULATE_FIAT_RATE_INTERVALS: FiatRateInterval[] = [
  '1D',
  '1W',
  '1M',
  'ALL',
];

const PORTFOLIO_COMPRESS_OLD_TXS_TO_DAILY_SNAPSHOTS = true;

const PORTFOLIO_ENABLE_INCREMENTAL_UPDATES = true;
const PORTFOLIO_INCREMENTAL_MAX_PAGES = 10;
const PORTFOLIO_INCREMENTAL_RESNAPSHOT_WINDOW_MS = MS_PER_DAY;

const resolveQuoteCurrency = (
  ...candidates: Array<string | undefined>
): string => {
  const candidate = candidates.find(v => typeof v === 'string' && v.length);
  return candidate || 'USD';
};

const isPortfolioEnabled = (state: RootState): boolean =>
  state.APP?.showPortfolioValue !== false;

const createPopulateAbortChecker = (getState: () => RootState) => {
  let cancelled = false;
  return () => {
    if (cancelled) {
      return true;
    }
    const currentState = getState();
    if (!isPortfolioEnabled(currentState)) {
      cancelled = true;
      return true;
    }
    if (!currentState.PORTFOLIO?.populateStatus?.inProgress) {
      cancelled = true;
      return true;
    }
    return false;
  };
};

const addPopulateError = (args: {
  dispatch: any;
  walletId: string;
  message: string;
}) => {
  args.dispatch(
    updatePopulateProgress({
      errorsToAdd: [{walletId: args.walletId, message: args.message}],
    }),
  );
};

const setWalletStatus = (args: {
  dispatch: any;
  walletId: string;
  status: WalletPopulateState;
}) => {
  args.dispatch(
    updatePopulateProgress({
      walletStatusByIdUpdates: {[args.walletId]: args.status},
    }),
  );
};

const updateWalletsCompleted = (args: {
  dispatch: any;
  walletsCompleted: number;
  txRequestsMade: number;
  txsProcessed: number;
}): number => {
  const walletsCompleted = args.walletsCompleted + 1;
  args.dispatch(
    updatePopulateProgress({
      walletsCompleted,
      txRequestsMade: args.txRequestsMade,
      txsProcessed: args.txsProcessed,
    }),
  );
  return walletsCompleted;
};

const getMainnetWalletsFromKeys = (keys: Record<string, any>): Wallet[] => {
  return Object.values(keys || {})
    .flatMap((k: any) => (k?.wallets ? k.wallets : []))
    .filter((w: Wallet) => w?.network === Network.mainnet);
};

const walletHasNonZeroLiveBalance = (wallet: Wallet): boolean => {
  const sat = (wallet as any)?.balance?.sat;
  if (typeof sat === 'number' && Number.isFinite(sat)) {
    return sat > 0;
  }

  const crypto = (wallet as any)?.balance?.crypto;
  if (typeof crypto === 'string') {
    const parsed = Number(crypto.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed > 0 : false;
  }

  return false;
};

const getWalletLiveFiatBalanceSortValue = (wallet: Wallet): number => {
  const fiatCandidates = [
    (wallet as any)?.balance?.totalBalance,
    (wallet as any)?.balance?.fiat,
    (wallet as any)?.balance?.availableBalance,
  ];
  for (const candidate of fiatCandidates) {
    const n =
      typeof candidate === 'number'
        ? candidate
        : typeof candidate === 'string'
        ? Number(candidate.replace(/,/g, ''))
        : NaN;
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  // Fallbacks when fiat fields are unavailable.
  const sat = (wallet as any)?.balance?.sat;
  if (typeof sat === 'number' && Number.isFinite(sat)) {
    return sat > 0 ? sat : 0;
  }

  const crypto = (wallet as any)?.balance?.crypto;
  if (typeof crypto === 'string') {
    const parsed = Number(crypto.replace(/,/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  return 0;
};

const getWalletAssetSortKey = (wallet: Wallet): string => {
  const chain = String(wallet?.chain || '').toLowerCase();
  const coin = String(wallet?.currencyAbbreviation || '').toLowerCase();
  const token = String(wallet?.tokenAddress || '').toLowerCase();
  return token ? `${chain}:${coin}:${token}` : `${chain}:${coin}`;
};

const sortWalletsByAssetAndBalanceDesc = (wallets: Wallet[]): Wallet[] => {
  const assetTotals = new Map<string, number>();
  for (const wallet of wallets) {
    const key = getWalletAssetSortKey(wallet);
    const next =
      (assetTotals.get(key) || 0) + getWalletLiveFiatBalanceSortValue(wallet);
    assetTotals.set(key, next);
  }

  return [...wallets].sort((a, b) => {
    const aAsset = getWalletAssetSortKey(a);
    const bAsset = getWalletAssetSortKey(b);
    const aAssetTotal = assetTotals.get(aAsset) || 0;
    const bAssetTotal = assetTotals.get(bAsset) || 0;
    if (aAssetTotal !== bAssetTotal) {
      return bAssetTotal - aAssetTotal;
    }

    const aBalance = getWalletLiveFiatBalanceSortValue(a);
    const bBalance = getWalletLiveFiatBalanceSortValue(b);
    if (aBalance !== bBalance) {
      return bBalance - aBalance;
    }

    if (aAsset !== bAsset) {
      return aAsset.localeCompare(bAsset);
    }

    return String(a?.id || '').localeCompare(String(b?.id || ''));
  });
};

const buildSnapshotMismatchUpdate = (args: {
  walletId: string;
  computedAtomic: bigint;
  actualAtomic: bigint;
  unitDecimals: number;
}): SnapshotBalanceMismatch | undefined => {
  if (args.computedAtomic === args.actualAtomic) {
    return undefined;
  }

  const computedUnitsHeld = atomicToUnitString(
    args.computedAtomic,
    args.unitDecimals,
  );
  const currentWalletBalance = atomicToUnitString(
    args.actualAtomic,
    args.unitDecimals,
  );
  const delta = atomicToUnitString(
    args.computedAtomic - args.actualAtomic,
    args.unitDecimals,
  );

  return {
    walletId: args.walletId,
    computedUnitsHeld,
    currentWalletBalance,
    delta,
  };
};

const yieldToEventLoop = async (): Promise<void> => {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
};

const getUtcDayStartMs = (tsMs: number): number => {
  const d = new Date(tsMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const normalizeSnapshotTxLinkage = (
  snapshot: BalanceSnapshot,
): BalanceSnapshot => {
  const legacy = snapshot as BalanceSnapshot & {
    walletId?: string;
    txid?: string;
    txIds?: string[];
  };
  const rawTxIds = legacy.txIds;
  const txIds =
    Array.isArray(rawTxIds) && rawTxIds.length > 1 ? rawTxIds : undefined;
  const next = {...legacy} as BalanceSnapshot & {
    walletId?: string;
    txid?: string;
  };
  delete next.walletId;
  delete next.txid;
  delete (next as BalanceSnapshot & {txIds?: string[]}).txIds;
  return {
    ...next,
    ...(txIds ? {txIds} : {}),
  };
};

const ensureSnapshotsSortedByTimestamp = (
  snapshots: BalanceSnapshot[],
): BalanceSnapshot[] => {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    return snapshots;
  }

  const getTimestamp = (snapshot: BalanceSnapshot): number =>
    typeof snapshot?.timestamp === 'number' &&
    Number.isFinite(snapshot.timestamp)
      ? snapshot.timestamp
      : 0;

  for (let i = 1; i < snapshots.length; i++) {
    if (getTimestamp(snapshots[i - 1]) > getTimestamp(snapshots[i])) {
      return snapshots
        .map((snapshot, originalIndex) => ({snapshot, originalIndex}))
        .sort((a, b) => {
          const timestampDelta =
            getTimestamp(a.snapshot) - getTimestamp(b.snapshot);
          if (timestampDelta !== 0) {
            return timestampDelta;
          }
          // Preserve original order for equal timestamps.
          return a.originalIndex - b.originalIndex;
        })
        .map(({snapshot}) => snapshot);
    }
  }

  return snapshots;
};

export const maybePopulatePortfolioForWallets =
  (args: {wallets: Wallet[]; quoteCurrency?: string}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    if (!isPortfolioEnabled(state)) {
      return;
    }
    const quoteCurrency = resolveQuoteCurrency(
      args.quoteCurrency,
      state.PORTFOLIO?.quoteCurrency,
      state.APP?.defaultAltCurrency?.isoCode,
    ).toUpperCase();

    const snapshotsByWalletId = state.PORTFOLIO?.snapshotsByWalletId || {};
    const prevMismatchesByWalletId =
      state.PORTFOLIO?.snapshotBalanceMismatchesByWalletId || {};

    const walletsScope = Array.isArray(args.wallets) ? args.wallets : [];
    if (!walletsScope.length) {
      return;
    }

    const {walletIdsToPopulate, snapshotBalanceMismatchUpdates} =
      getWalletIdsToPopulateFromSnapshots({
        wallets: walletsScope,
        snapshotsByWalletId,
        previousSnapshotBalanceMismatchesByWalletId: prevMismatchesByWalletId,
      });

    if (Object.keys(snapshotBalanceMismatchUpdates).length) {
      dispatch(
        setSnapshotBalanceMismatchesByWalletIdUpdates(
          snapshotBalanceMismatchUpdates,
        ),
      );
    }

    if (state.PORTFOLIO?.populateStatus?.inProgress) {
      return;
    }

    const rates = (state.RATE?.rates || {}) as Rates;
    const walletsById = new Map(
      walletsScope.map(w => [String(w?.id || ''), w] as const),
    );
    const walletIdsWithCurrentRates = walletIdsToPopulate.filter(walletId => {
      const wallet = walletsById.get(walletId);
      if (!wallet) {
        return false;
      }
      return getCurrentFiatRateNow(rates, wallet, quoteCurrency) > 0;
    });

    if (walletIdsWithCurrentRates.length) {
      dispatch(
        populatePortfolio({
          quoteCurrency,
          walletIds: walletIdsWithCurrentRates,
        }),
      );
    }
  };

const getBestRateIntervalForTimestamp = (args: {
  timestampMs: number;
  nowMs: number;
}): FiatRateInterval => {
  const ageMs = args.nowMs - args.timestampMs;
  if (ageMs <= MS_PER_DAY) {
    return '1D';
  }
  if (ageMs <= 7 * MS_PER_DAY) {
    return '1W';
  }
  if (ageMs <= 30 * MS_PER_DAY) {
    return '1M';
  }
  return 'ALL';
};

const getWalletBalanceAtomic = (
  wallet: Wallet,
  unitDecimals: number,
): {atomic: bigint; unitString: string} => {
  const crypto = wallet.balance?.crypto;
  const unitString =
    typeof crypto === 'string' ? crypto.replace(/,/g, '') : '0';
  const atomicFromWallet = getWalletLiveAtomicBalance({
    wallet,
    unitDecimals,
  });
  return {
    atomic: atomicFromWallet,
    unitString,
  };
};

const getTxTimestampMs = (tx: any): number | undefined => {
  const raw =
    (tx as any)?.__portfolioTimestampMs ??
    tx?.time ??
    tx?.createdOn ??
    tx?.ts ??
    tx?.timestamp ??
    tx?.createdTime ??
    tx?.blockTime ??
    tx?.block_time ??
    tx?.blockTimeNormalized ??
    tx?.block_time_normalized;

  const n = (() => {
    if (typeof raw === 'number') {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
      const dateParsed = Date.parse(raw);
      return Number.isFinite(dateParsed) ? dateParsed : undefined;
    }
    return undefined;
  })();

  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return undefined;
  }

  // If Date.parse returned ms, n will already be in ms.
  // Otherwise heuristic: treat large values as ms, otherwise seconds.
  return n > 1e12 ? n : n * 1000;
};

const getCurrentFiatRateNow = (
  allRates: Rates,
  wallet: Wallet,
  quoteCurrency: string,
): number => {
  const ratesPerCurrency = getRateByCurrencyName(
    allRates,
    wallet.currencyAbbreviation,
    wallet.chain,
    wallet.tokenAddress,
  );

  const rateObj = ratesPerCurrency?.find(
    r => r.code === (quoteCurrency || '').toUpperCase(),
  );

  const rate = rateObj && !rateObj.rate ? 0 : rateObj?.rate;
  return typeof rate === 'number' && Number.isFinite(rate) ? rate : 0;
};

const ensureFiatRateSeriesInterval = async (args: {
  dispatch: any;
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
  allowedCoins?: string[];
}): Promise<boolean> => {
  const {dispatch, fiatCode, currencyAbbreviation, interval, allowedCoins} =
    args;
  const coinForCacheCheck = normalizeFiatRateSeriesCoin(currencyAbbreviation);
  return dispatch(
    fetchFiatRateSeriesInterval({
      fiatCode,
      interval,
      coinForCacheCheck,
      allowedCoins,
    }),
  );
};

const getLoadedFiatRateSeriesIntervalKey = (args: {
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
}): string => {
  const fiatCode = (args.fiatCode || '').toUpperCase();
  const coin = normalizeFiatRateSeriesCoin(args.currencyAbbreviation);
  return `${fiatCode}:${coin}:${args.interval}`;
};

const ensureFiatRateSeriesIntervalOnce = async (args: {
  dispatch: any;
  loadedIntervals: Set<string>;
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
  allowedCoins?: string[];
}): Promise<boolean> => {
  const {
    dispatch,
    loadedIntervals,
    fiatCode,
    currencyAbbreviation,
    interval,
    allowedCoins,
  } = args;
  const loadedIntervalKey = getLoadedFiatRateSeriesIntervalKey({
    fiatCode,
    currencyAbbreviation,
    interval,
  });
  if (loadedIntervals.has(loadedIntervalKey)) {
    return true;
  }
  loadedIntervals.add(loadedIntervalKey);
  return ensureFiatRateSeriesInterval({
    dispatch,
    fiatCode,
    currencyAbbreviation,
    interval,
    allowedCoins,
  });
};

const ensurePopulateBridgeFiatRateSeriesIntervals = async (args: {
  dispatch: any;
  loadedIntervals: Set<string>;
  fiatCode: string;
}): Promise<void> => {
  for (const interval of POPULATE_FIAT_RATE_INTERVALS) {
    await ensureFiatRateSeriesIntervalOnce({
      dispatch: args.dispatch,
      loadedIntervals: args.loadedIntervals,
      fiatCode: args.fiatCode,
      currencyAbbreviation: 'btc',
      interval,
      allowedCoins: ['btc'],
    });
  }
};

const hasFiatRateSeriesPointsInCache = (args: {
  getState: () => RootState;
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
}): boolean => {
  const fiatCode = (args.fiatCode || '').toUpperCase();
  const coin = normalizeFiatRateSeriesCoin(args.currencyAbbreviation);
  const cacheKey = getFiatRateSeriesCacheKey(fiatCode, coin, args.interval);
  const series = args.getState().RATE?.fiatRateSeriesCache?.[cacheKey];
  return Array.isArray(series?.points) && series.points.length > 0;
};

const ensureWalletHasHistoricalFiatRates = async (args: {
  dispatch: any;
  getState: () => RootState;
  loadedIntervals: Set<string>;
  fiatCode: string;
  currencyAbbreviation: string;
}): Promise<boolean> => {
  if (
    hasFiatRateSeriesPointsInCache({
      getState: args.getState,
      fiatCode: args.fiatCode,
      currencyAbbreviation: args.currencyAbbreviation,
      interval: 'ALL',
    })
  ) {
    return true;
  }

  const didFetch = await ensureFiatRateSeriesIntervalOnce({
    dispatch: args.dispatch,
    loadedIntervals: args.loadedIntervals,
    fiatCode: args.fiatCode,
    currencyAbbreviation: args.currencyAbbreviation,
    interval: 'ALL',
  });
  if (!didFetch) {
    // Best-effort fetch failed; treat as unavailable unless cache already exists.
    return hasFiatRateSeriesPointsInCache({
      getState: args.getState,
      fiatCode: args.fiatCode,
      currencyAbbreviation: args.currencyAbbreviation,
      interval: 'ALL',
    });
  }

  return hasFiatRateSeriesPointsInCache({
    getState: args.getState,
    fiatCode: args.fiatCode,
    currencyAbbreviation: args.currencyAbbreviation,
    interval: 'ALL',
  });
};

export const populatePortfolio =
  (args?: {
    quoteCurrency?: string;
    walletIds?: string[];
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    if (!isPortfolioEnabled(state)) {
      return;
    }
    if (state.PORTFOLIO?.populateStatus?.inProgress) {
      return;
    }
    const quoteCurrency = resolveQuoteCurrency(
      args?.quoteCurrency,
      state.APP?.defaultAltCurrency?.isoCode,
    );

    const keys = state.WALLET?.keys || {};
    const wallets = getMainnetWalletsFromKeys(keys);

    const walletIdsFilter = Array.isArray(args?.walletIds)
      ? new Set(args?.walletIds)
      : undefined;
    const walletsToPopulateUnordered = (
      walletIdsFilter ? wallets.filter(w => walletIdsFilter.has(w.id)) : wallets
    ).filter(walletHasNonZeroLiveBalance);
    let walletsToPopulate = sortWalletsByAssetAndBalanceDesc(
      walletsToPopulateUnordered,
    );

    if (!walletsToPopulate.length) {
      return;
    }

    dispatch(startPopulatePortfolio({quoteCurrency}));
    const shouldAbort = createPopulateAbortChecker(getState);

    const allRates = await dispatch(startGetRates({}));

    if (shouldAbort()) {
      return;
    }

    const targetQuoteCurrency = (quoteCurrency || '').toUpperCase();
    const preflightLoadedIntervals = new Set<string>();
    const hasHistoricalRateSupportByQuoteCoin = new Map<string, boolean>();
    const loadedBridgeBtcQuoteCurrencies = new Set<string>();
    const filteredWallets: Wallet[] = [];
    for (const wallet of walletsToPopulate) {
      if (shouldAbort()) {
        return;
      }

      const currentFiatRateNow = getCurrentFiatRateNow(
        allRates,
        wallet,
        quoteCurrency,
      );
      if (!currentFiatRateNow) {
        continue;
      }

      const normalizedRateCoin = normalizeFiatRateSeriesCoin(
        wallet.currencyAbbreviation,
      );
      const historicalSupportKey = `${targetQuoteCurrency}:${normalizedRateCoin}`;
      const cachedHistoricalSupport =
        hasHistoricalRateSupportByQuoteCoin.get(historicalSupportKey);
      const hasHistoricalRateSupport =
        typeof cachedHistoricalSupport === 'boolean'
          ? cachedHistoricalSupport
          : await ensureWalletHasHistoricalFiatRates({
              dispatch,
              getState,
              loadedIntervals: preflightLoadedIntervals,
              fiatCode: targetQuoteCurrency,
              currencyAbbreviation: wallet.currencyAbbreviation,
            });

      if (typeof cachedHistoricalSupport !== 'boolean') {
        hasHistoricalRateSupportByQuoteCoin.set(
          historicalSupportKey,
          hasHistoricalRateSupport,
        );
      }

      if (hasHistoricalRateSupport) {
        filteredWallets.push(wallet);
      }
    }
    walletsToPopulate = filteredWallets;

    if (!walletsToPopulate.length) {
      dispatch(finishPopulatePortfolio({finishedAt: Date.now()}));
      return;
    }

    const initialWalletStatusByIdUpdates = walletsToPopulate.reduce(
      (acc, wallet) => {
        if (wallet?.id) {
          acc[wallet.id] = 'in_progress';
        }
        return acc;
      },
      {} as {[walletId: string]: WalletPopulateState},
    );
    dispatch(
      updatePopulateProgress({
        walletsTotal: walletsToPopulate.length,
        walletStatusByIdUpdates: initialWalletStatusByIdUpdates,
      }),
    );

    let walletsCompleted = 0;
    let txRequestsMade = 0;
    let txsProcessed = 0;

    const bumpTxRequestsMade = () => {
      txRequestsMade++;
      dispatch(updatePopulateProgress({txRequestsMade}));
    };

    let txsProcessedLastReported = 0;
    const bumpTxsProcessed = (delta: number = 1) => {
      const d = typeof delta === 'number' ? delta : Number(delta);
      if (!Number.isFinite(d) || d <= 0) {
        return;
      }

      txsProcessed += d;

      // Avoid spamming redux with progress updates for large portfolios.
      // Report at most every ~100 txs, but always report when a large delta arrives.
      if (d >= 100 || txsProcessed - txsProcessedLastReported >= 100) {
        txsProcessedLastReported = txsProcessed;
        dispatch(updatePopulateProgress({txsProcessed}));
      }
    };

    const processWallet = async (wallet: Wallet) => {
      if (shouldAbort()) {
        return;
      }
      dispatch(updatePopulateProgress({currentWalletId: wallet.id}));
      setWalletStatus({dispatch, walletId: wallet.id, status: 'in_progress'});

      try {
        const precision =
          dispatch(
            GetPrecision(
              wallet.currencyAbbreviation,
              wallet.chain,
              wallet.tokenAddress,
            ),
          ) || undefined;
        const unitDecimals = precision?.unitDecimals || 0;

        const portfolioState = getState().PORTFOLIO;
        const existingSnapshotsRaw =
          portfolioState.snapshotsByWalletId?.[wallet.id] || [];
        const existingSnapshots = Array.isArray(existingSnapshotsRaw)
          ? existingSnapshotsRaw
          : [];
        const existingQuoteCurrency = (
          (existingSnapshots?.[0]?.quoteCurrency as string | undefined) || ''
        ).toUpperCase();

        const walletSnapshotQuoteCurrency =
          existingQuoteCurrency || targetQuoteCurrency;
        const bridgeQuoteCurrency =
          walletSnapshotQuoteCurrency !== targetQuoteCurrency
            ? targetQuoteCurrency
            : undefined;

        const snapshotsLookLikeHarness =
          Array.isArray(existingSnapshots) &&
          existingSnapshots.length > 0 &&
          typeof existingSnapshots[0]?.id === 'string' &&
          (existingSnapshots[0].id.startsWith('tx:') ||
            existingSnapshots[0].id.startsWith('daily:'));

        const incrementalEligible =
          PORTFOLIO_ENABLE_INCREMENTAL_UPDATES &&
          snapshotsLookLikeHarness &&
          !!existingQuoteCurrency &&
          existingQuoteCurrency === walletSnapshotQuoteCurrency;
        const seedSnapshot = incrementalEligible
          ? getLatestSnapshot(existingSnapshots)
          : undefined;

        const currentFiatRateNow = getCurrentFiatRateNow(
          allRates,
          wallet,
          quoteCurrency,
        );

        if (!currentFiatRateNow) {
          setWalletStatus({dispatch, walletId: wallet.id, status: 'done'});
          walletsCompleted = updateWalletsCompleted({
            dispatch,
            walletsCompleted,
            txRequestsMade,
            txsProcessed,
          });
          return;
        }

        const loadedIntervals = new Set<string>();
        const normalizedRateCoin = normalizeFiatRateSeriesCoin(
          wallet.currencyAbbreviation,
        );
        const historicalSupportKey = `${targetQuoteCurrency}:${normalizedRateCoin}`;
        const cachedHistoricalSupport =
          hasHistoricalRateSupportByQuoteCoin.get(historicalSupportKey);
        const hasHistoricalRateSupport =
          typeof cachedHistoricalSupport === 'boolean'
            ? cachedHistoricalSupport
            : await ensureWalletHasHistoricalFiatRates({
                dispatch,
                getState,
                loadedIntervals,
                fiatCode: targetQuoteCurrency,
                currencyAbbreviation: wallet.currencyAbbreviation,
              });

        if (typeof cachedHistoricalSupport !== 'boolean') {
          hasHistoricalRateSupportByQuoteCoin.set(
            historicalSupportKey,
            hasHistoricalRateSupport,
          );
        }

        if (!hasHistoricalRateSupport) {
          setWalletStatus({dispatch, walletId: wallet.id, status: 'done'});
          walletsCompleted = updateWalletsCompleted({
            dispatch,
            walletsCompleted,
            txRequestsMade,
            txsProcessed,
          });
          return;
        }

        // If this wallet's snapshots are stored in a different quote currency than the
        // active display fiat, keep ONLY BTC series for that snapshot quote (bridge layer).
        if (
          bridgeQuoteCurrency &&
          !loadedBridgeBtcQuoteCurrencies.has(walletSnapshotQuoteCurrency)
        ) {
          loadedBridgeBtcQuoteCurrencies.add(walletSnapshotQuoteCurrency);
          // Populate only needs granular recent intervals + daily history.
          await ensurePopulateBridgeFiatRateSeriesIntervals({
            dispatch,
            loadedIntervals,
            fiatCode: walletSnapshotQuoteCurrency,
          });
        }

        let loadMore = true;
        let iters = 0;
        let acc: any[] = [];

        const incrementalResnapshotCutoffMs = incrementalEligible
          ? Date.now() - PORTFOLIO_INCREMENTAL_RESNAPSHOT_WINDOW_MS
          : undefined;

        while (loadMore) {
          if (shouldAbort()) {
            return;
          }
          const result = await dispatch(
            GetTransactionHistory({
              wallet,
              transactionsHistory: acc,
              limit: BWS_TX_HISTORY_LIMIT,
              refresh: iters === 0,
              contactList: [],
              isAccountDetailsView: true,
              skipWalletProcessing: true,
              skipUiFriendlyList: true,
            }),
          );
          bumpTxRequestsMade();
          acc = result?.transactions || acc;
          loadMore = !!result?.loadMore;
          iters++;

          if (iters % 2 === 0) {
            await yieldToEventLoop();
          }

          if (typeof incrementalResnapshotCutoffMs === 'number') {
            let oldestTs = Number.POSITIVE_INFINITY;
            for (const t of acc) {
              const ts = getTxTimestampMs(t);
              if (typeof ts === 'number' && Number.isFinite(ts)) {
                if (ts < oldestTs) {
                  oldestTs = ts;
                }
              }
            }
            if (oldestTs <= incrementalResnapshotCutoffMs) {
              break;
            }
            if (iters >= PORTFOLIO_INCREMENTAL_MAX_PAGES) {
              break;
            }
          }
        }

        const nowMsForMissingTs = Date.now();
        for (const tx of acc) {
          if (!tx) {
            continue;
          }
          const ts = getTxTimestampMs(tx);
          if (!ts) {
            const confRaw = (tx as any)?.confirmations;
            const confNum =
              typeof confRaw === 'number' ? confRaw : Number(confRaw);
            if (!Number.isFinite(confNum) || confNum <= 0) {
              (tx as any).__portfolioTimestampMs = nowMsForMissingTs;
              // Keep the engine + prefilter timestamp sources consistent for
              // unconfirmed rows that arrive without a usable `time`.
              const rawTime = Number((tx as any)?.time);
              if (!Number.isFinite(rawTime) || rawTime <= 0) {
                (tx as any).time = nowMsForMissingTs;
              }
            }
          }
        }

        const txs = acc.filter(tx => tx);

        await yieldToEventLoop();

        if (!txs.length) {
          if (existingSnapshots.length) {
            const latestExisting = getLatestSnapshot(existingSnapshots);
            const walletBalance = getWalletBalanceAtomic(wallet, unitDecimals);
            const snapAtomic = getSnapshotAtomicBalanceFromCryptoBalance({
              snapshot: latestExisting as BalanceSnapshot | undefined,
              unitDecimals,
            });
            const mismatchUpdate = buildSnapshotMismatchUpdate({
              walletId: wallet.id,
              computedAtomic: snapAtomic,
              actualAtomic: walletBalance.atomic,
              unitDecimals,
            });
            dispatch(
              setSnapshotBalanceMismatchesByWalletIdUpdates({
                [wallet.id]: mismatchUpdate,
              }),
            );
          }
          setWalletStatus({dispatch, walletId: wallet.id, status: 'done'});
          walletsCompleted = updateWalletsCompleted({
            dispatch,
            walletsCompleted,
            txRequestsMade,
            txsProcessed,
          });
          return;
        }

        // Build snapshots using the shared PnL harness snapshot engine.
        let snapshots: BalanceSnapshot[] = [];

        // If we already have harness-based snapshots for this wallet, we can do an
        // incremental rebuild of just the most recent window.
        let latestSnapshotForEngine: BalanceSnapshotStored | undefined;
        let preservedSnapshots: BalanceSnapshot[] = [];
        let txsToProcess: any[] = txs;

        if (incrementalEligible && seedSnapshot) {
          const cutoffMs =
            Date.now() - PORTFOLIO_INCREMENTAL_RESNAPSHOT_WINDOW_MS;

          // Preserve everything strictly before the cutoff and use the last
          // snapshot before cutoff as the engine seed.
          let seedForWindow: BalanceSnapshot | undefined;
          for (const s of existingSnapshots || []) {
            const ts = s?.timestamp || 0;
            if (ts > 0 && ts < cutoffMs) {
              // Keep the last pre-cutoff snapshot in existing array order.
              // This matches getLatestSnapshot() semantics used elsewhere.
              seedForWindow = s;
            }
          }

          if (seedForWindow) {
            preservedSnapshots = (existingSnapshots || [])
              .filter(s => {
                const ts = (s?.timestamp || 0) as number;
                return ts > 0 && ts < cutoffMs;
              })
              .map(normalizeSnapshotTxLinkage);

            latestSnapshotForEngine = {
              id: seedForWindow.id,
              walletId: wallet.id,
              chain: seedForWindow.chain,
              coin: seedForWindow.coin,
              network: seedForWindow.network,
              assetId: seedForWindow.assetId,
              timestamp: seedForWindow.timestamp,
              eventType: seedForWindow.eventType,
              txIds: (seedForWindow as any).txIds,
              cryptoBalance: unitStringToAtomicBigInt(
                seedForWindow.cryptoBalance || '0',
                unitDecimals,
              ).toString(),
              remainingCostBasisFiat: Number.isFinite(
                seedForWindow.remainingCostBasisFiat,
              )
                ? seedForWindow.remainingCostBasisFiat
                : 0,
              quoteCurrency: seedForWindow.quoteCurrency,
              markRate:
                typeof seedForWindow.costBasisRateFiat === 'number' &&
                Number.isFinite(seedForWindow.costBasisRateFiat)
                  ? seedForWindow.costBasisRateFiat
                  : 0,
              createdAt: seedForWindow.createdAt,
            };

            // Only process txs from the seed timestamp forward.
            txsToProcess = txs.filter(
              (t: any) => (getTxTimestampMs(t) || 0) >= seedForWindow.timestamp,
            );
          }
        }

        // Fetch any fiat rate series intervals we’ll need for tx timestamps.
        const nowMs = nowMsForMissingTs;
        const neededIntervals = new Set<FiatRateInterval>();
        for (const tx of txsToProcess) {
          const timestampMs = getTxTimestampMs(tx);
          if (!timestampMs) {
            continue;
          }
          neededIntervals.add(
            getBestRateIntervalForTimestamp({timestampMs, nowMs}),
          );
        }
        for (const interval of neededIntervals) {
          await ensureFiatRateSeriesIntervalOnce({
            dispatch,
            loadedIntervals,
            fiatCode: quoteCurrency,
            currencyAbbreviation: wallet.currencyAbbreviation,
            interval,
          });
        }

        if (shouldAbort()) {
          return;
        }

        const walletBalanceForSummary = getWalletBalanceAtomic(
          wallet,
          unitDecimals,
        );
        const walletSummary = {
          // IMPORTANT: the shared PnL engine expects these exact field names
          // (walletId / walletName / balanceAtomic / balanceFormatted).
          walletId: wallet.id,
          walletName: wallet.name,
          chain: String(wallet.chain || '').toLowerCase(),
          network: wallet.network,
          currencyAbbreviation: String(
            wallet.currencyAbbreviation || '',
          ).toLowerCase(),
          tokenAddress: wallet.tokenAddress,
          balanceAtomic: walletBalanceForSummary.atomic.toString(),
          balanceFormatted: walletBalanceForSummary.unitString,
        };

        const credentials: any = {
          chain: String(wallet.chain || '').toLowerCase(),
          coin: String(wallet.currencyAbbreviation || '').toLowerCase(),
          network: wallet.network,
        };
        if (typeof precision?.unitDecimals === 'number') {
          credentials.token = {
            ...(wallet.tokenAddress ? {address: wallet.tokenAddress} : {}),
            decimals: precision.unitDecimals,
          };
        }

        const fiatRateSeriesCache = getState().RATE?.fiatRateSeriesCache || {};

        let lastProgress = 0;
        const storedSnaps = await buildBalanceSnapshotsAsync({
          wallet: walletSummary as any,
          credentials,
          txs: txsToProcess,
          quoteCurrency: walletSnapshotQuoteCurrency,
          bridgeQuoteCurrency,
          fiatRateSeriesCache: fiatRateSeriesCache as any,
          latestSnapshot: latestSnapshotForEngine,
          compression: {enabled: PORTFOLIO_COMPRESS_OLD_TXS_TO_DAILY_SNAPSHOTS},
          nowMs,
          onProgress: p => {
            const next =
              typeof (p as any)?.processed === 'number'
                ? (p as any).processed
                : 0;
            const delta = next - lastProgress;
            if (delta > 0) {
              bumpTxsProcessed(delta);
              lastProgress = next;
            }
          },
        });

        // Ensure our global tx processed counter catches up if onProgress didn't
        // fire at the end.
        if (lastProgress < txsToProcess.length) {
          bumpTxsProcessed(txsToProcess.length - lastProgress);
        }

        const mappedNew: BalanceSnapshot[] = storedSnaps.map((s, idx) => {
          const prev =
            idx === 0 ? latestSnapshotForEngine || null : storedSnaps[idx - 1];
          const computed = computeBalanceSnapshotComputed(s, credentials, prev);
          let deltaAtomic = 0n;
          try {
            deltaAtomic = BigInt(computed.balanceDeltaAtomic);
          } catch {
            deltaAtomic = 0n;
          }

          const direction =
            s.eventType === 'tx'
              ? deltaAtomic > 0n
                ? 'incoming'
                : deltaAtomic < 0n
                ? 'outgoing'
                : undefined
              : undefined;

          return {
            id: s.id,
            chain: s.chain,
            coin: s.coin,
            network: s.network,
            assetId: s.assetId,
            timestamp: s.timestamp,
            dayStartMs:
              s.eventType === 'daily'
                ? getUtcDayStartMs(s.timestamp)
                : undefined,
            eventType: s.eventType,
            txIds:
              Array.isArray(s.txIds) && s.txIds.length > 1
                ? s.txIds
                : undefined,
            direction,
            balanceDeltaAtomic: computed.balanceDeltaAtomic,
            cryptoBalance: computed.formattedCryptoBalance,
            avgCostFiatPerUnit: computed.avgCostFiatPerUnit,
            remainingCostBasisFiat: s.remainingCostBasisFiat,
            unrealizedPnlFiat: computed.unrealizedPnlFiat,
            costBasisRateFiat: s.markRate,
            quoteCurrency: s.quoteCurrency,
            createdAt: s.createdAt,
          };
        });

        snapshots = preservedSnapshots.length
          ? preservedSnapshots.concat(mappedNew)
          : mappedNew;

        if (shouldAbort()) {
          return;
        }

        if (snapshots.length) {
          snapshots = ensureSnapshotsSortedByTimestamp(snapshots);
          dispatch(setWalletSnapshots({walletId: wallet.id, snapshots}));
        }

        if (shouldAbort()) {
          return;
        }

        const snapshotForMismatch = snapshots.length
          ? getLatestSnapshot(snapshots)
          : getLatestSnapshot(existingSnapshots);
        const computedAtomicForMismatch =
          getSnapshotAtomicBalanceFromCryptoBalance({
            snapshot: snapshotForMismatch as BalanceSnapshot | undefined,
            unitDecimals,
          });
        const walletBalance = getWalletBalanceAtomic(wallet, unitDecimals);
        const mismatchUpdate = buildSnapshotMismatchUpdate({
          walletId: wallet.id,
          computedAtomic: computedAtomicForMismatch,
          actualAtomic: walletBalance.atomic,
          unitDecimals,
        });
        dispatch(
          setSnapshotBalanceMismatchesByWalletIdUpdates({
            [wallet.id]: mismatchUpdate,
          }),
        );
        setWalletStatus({dispatch, walletId: wallet.id, status: 'done'});
        walletsCompleted = updateWalletsCompleted({
          dispatch,
          walletsCompleted,
          txRequestsMade,
          txsProcessed,
        });
      } catch (e) {
        const msg = getErrorString(e);
        addPopulateError({dispatch, walletId: wallet.id, message: msg});
        setWalletStatus({dispatch, walletId: wallet.id, status: 'error'});
        walletsCompleted = updateWalletsCompleted({
          dispatch,
          walletsCompleted,
          txRequestsMade,
          txsProcessed,
        });
      }
    };

    const concurrency = Math.min(3, walletsToPopulate.length);
    let nextIndex = 0;
    const workers = new Array(concurrency).fill(null).map(async () => {
      while (nextIndex < walletsToPopulate.length) {
        if (shouldAbort()) {
          return;
        }
        const wallet = walletsToPopulate[nextIndex];
        nextIndex++;
        await processWallet(wallet);
      }
    });

    await Promise.all(workers);

    if (shouldAbort()) {
      return;
    }
    dispatch(updatePopulateProgress({txRequestsMade, txsProcessed}));
    dispatch(finishPopulatePortfolio({finishedAt: Date.now()}));
  };

export const preparePortfolioFiatRateCachesForQuoteCurrencySwitch =
  (args?: {quoteCurrency?: string}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    if (!isPortfolioEnabled(state)) {
      return;
    }
    if (state.PORTFOLIO?.populateStatus?.inProgress) {
      return;
    }

    const quoteCurrency = resolveQuoteCurrency(
      args?.quoteCurrency,
      state.APP?.defaultAltCurrency?.isoCode,
    );
    const targetQuoteCurrency = (quoteCurrency || '').toUpperCase();
    if (!targetQuoteCurrency) {
      return;
    }

    const keys = state.WALLET?.keys || {};
    const wallets = getMainnetWalletsFromKeys(keys);
    const snapshotsByWalletId = state.PORTFOLIO?.snapshotsByWalletId || {};

    // Determine which quote currencies are currently used by stored snapshots.
    // We'll keep ONLY BTC series for those currencies (bridge layer), and fetch
    // a full v4 cache for the active display currency.
    const sourceQuoteCurrencies = new Set<string>();
    for (const wallet of wallets) {
      const snapshots = snapshotsByWalletId[wallet.id];
      const latest = getLatestSnapshot(snapshots);
      const quote = (latest?.quoteCurrency || '').toUpperCase();
      if (!quote || quote === targetQuoteCurrency) {
        continue;
      }
      sourceQuoteCurrencies.add(quote);
    }

    // 1) Fetch + cache v4 series for the newly-selected (display) quote currency.
    await dispatch(
      fetchFiatRateSeriesAllIntervals({
        fiatCode: targetQuoteCurrency,
        currencyAbbreviation: 'btc',
        force: true,
      }),
    );

    // 2) Ensure BTC series exist for snapshot quote currencies (bridge/fx layer),
    //    and let fetch effects handle allowed-coins pruning to reduce churn.
    for (const sourceQuoteCurrency of sourceQuoteCurrencies) {
      await dispatch(
        fetchFiatRateSeriesAllIntervals({
          fiatCode: sourceQuoteCurrency,
          currencyAbbreviation: 'btc',
          allowedCoins: ['btc'],
        }),
      );
    }

    // 3) Drop any other fiat caches entirely (keeps storage bounded).
    const allowedFiats = new Set<string>([
      targetQuoteCurrency,
      ...Array.from(sourceQuoteCurrencies),
    ]);

    const cache = getState().RATE?.fiatRateSeriesCache || {};
    const fiatsInCache = new Set<string>();
    for (const cacheKey of Object.keys(cache)) {
      const idx = cacheKey.indexOf(':');
      if (idx > 0) {
        fiatsInCache.add(cacheKey.slice(0, idx).toUpperCase());
      }
    }

    for (const fiatCode of fiatsInCache) {
      if (!allowedFiats.has(fiatCode)) {
        // Empty keepCoins removes the fiat entirely.
        dispatch(
          pruneFiatRateSeriesCache({
            fiatCode,
            keepCoins: [],
          }),
        );
      }
    }
  };
