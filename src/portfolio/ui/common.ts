import {BASE_BWS_URL, BWC_TIMEOUT} from '../../constants/config';
import {GetPrecision} from '../../store/wallet/utils/currency';
import type {Wallet} from '../../store/wallet/wallet.models';
import type {AppDispatch} from '../../utils/hooks';
import type {Rates} from '../../store/rate/rate.models';
import {
  isPortfolioRuntimeEligibleWallet,
  toPortfolioStoredWallet,
} from '../adapters/rn/walletMappers';
import {getAssetIdFromWallet} from '../core/pnl/assetId';
import {
  type PnlAnalysisChartResult,
  type PnlAnalysisResult,
  type PnlTimeframe,
} from '../core/pnl/analysisStreaming';
import type {BalanceChartViewModel} from '../core/pnl/balanceChartViewModel';
import type {BwsConfig} from '../core/shared/bws';
import type {StoredWallet} from '../core/types';
import {getPortfolioAnalysisRuntimeClient} from '../runtime/portfolioRuntime';
import {
  buildCommittedPortfolioHoldingsRevisionToken,
  getAssetCurrentDisplayQuoteRate,
  resolveActivePortfolioDisplayQuoteCurrency,
} from '../../utils/portfolio/displayCurrency';
import {
  buildAssetPnlSummaryIdentityFromViewModelQuery,
  trackAssetPnlSummaryViewModelPromise,
} from './assetPnlSummaryCache';

export function createPortfolioQueryBwsConfig(): BwsConfig {
  return {
    baseUrl: BASE_BWS_URL,
    timeoutMs: BWC_TIMEOUT,
  };
}

export function resolveCommittedPortfolioQuoteCurrency(args: {
  portfolioQuoteCurrency?: string;
  defaultAltCurrencyIsoCode?: string;
}): string {
  const committedQuote = String(args.portfolioQuoteCurrency || '')
    .trim()
    .toUpperCase();
  if (committedQuote) {
    return committedQuote;
  }

  const defaultAlt = String(args.defaultAltCurrencyIsoCode || '')
    .trim()
    .toUpperCase();
  return defaultAlt || 'USD';
}

export function buildCommittedPortfolioRevisionToken(args: {
  quoteCurrency?: string;
  lastPopulatedAt?: number;
}): string {
  return buildCommittedPortfolioHoldingsRevisionToken({
    lastPopulatedAt: args.lastPopulatedAt,
  });
}

// Backwards-compatible alias retained during the migration of portfolio UI
// hooks to committed-only revision tokens.
export const resolvePortfolioQuoteCurrency =
  resolveCommittedPortfolioQuoteCurrency;
export {buildCommittedPortfolioHoldingsRevisionToken};
export {resolveActivePortfolioDisplayQuoteCurrency};

function getWalletUnitDecimals(dispatch: AppDispatch, wallet: Wallet): number {
  const precision =
    dispatch(
      GetPrecision(
        wallet.currencyAbbreviation,
        wallet.chain,
        wallet.tokenAddress,
      ) as any,
    ) || undefined;

  return precision?.unitDecimals || 0;
}

export function mapWalletsToStoredWallets(args: {
  dispatch: AppDispatch;
  wallets: Wallet[];
}): {
  eligibleWallets: Wallet[];
  storedWallets: StoredWallet[];
} {
  const eligibleWallets = (
    Array.isArray(args.wallets) ? args.wallets : []
  ).filter(isPortfolioRuntimeEligibleWallet);

  return {
    eligibleWallets,
    storedWallets: eligibleWallets.map(wallet =>
      toPortfolioStoredWallet({
        wallet,
        unitDecimals: getWalletUnitDecimals(args.dispatch, wallet),
        addedAt: 0,
      }),
    ),
  };
}

export function getStoredWalletRequestSignature(
  storedWallets: StoredWallet[],
): string {
  return storedWallets
    .map(wallet => {
      const summary = wallet.summary;
      return [
        summary.walletId,
        summary.chain,
        summary.currencyAbbreviation,
        summary.tokenAddress || '',
        summary.balanceAtomic || '',
      ].join(':');
    })
    .sort()
    .join('|');
}

export function buildCurrentRatesByAssetId(args: {
  storedWallets: StoredWallet[];
  quoteCurrency: string;
  rates?: Rates;
}): Record<string, number> {
  const quoteCurrency = resolveActivePortfolioDisplayQuoteCurrency({
    quoteCurrency: args.quoteCurrency,
  });
  const currentRatesByAssetId: Record<string, number> = {};

  for (const wallet of args.storedWallets || []) {
    const assetId = getAssetIdFromWallet(wallet.summary);
    if (assetId in currentRatesByAssetId) {
      continue;
    }

    const currentRate = getAssetCurrentDisplayQuoteRate({
      rates: args.rates,
      currencyAbbreviation: wallet.summary.currencyAbbreviation,
      chain: wallet.summary.chain,
      tokenAddress: wallet.summary.tokenAddress,
      quoteCurrency,
    });

    if (
      typeof currentRate === 'number' &&
      Number.isFinite(currentRate) &&
      currentRate > 0
    ) {
      currentRatesByAssetId[assetId] = currentRate;
    }
  }

  return currentRatesByAssetId;
}

export function getCurrentRatesByAssetIdSignature(
  currentRatesByAssetId: Record<string, number> | undefined,
): string {
  if (!currentRatesByAssetId) {
    return '';
  }

  return Object.keys(currentRatesByAssetId)
    .sort()
    .map(assetId => `${assetId}:${String(currentRatesByAssetId[assetId])}`)
    .join('|');
}

export function resolveCurrentRatesAsOfMs(args: {
  ratesUpdatedAt?: number;
  rates?: Rates;
}): number | undefined {
  if (
    typeof args.ratesUpdatedAt === 'number' &&
    Number.isFinite(args.ratesUpdatedAt) &&
    args.ratesUpdatedAt > 0
  ) {
    return args.ratesUpdatedAt;
  }

  let latestTimestamp: number | undefined;
  for (const rateEntries of Object.values(args.rates || {})) {
    if (!Array.isArray(rateEntries)) {
      continue;
    }

    for (const rateEntry of rateEntries) {
      const candidateTimestamps = [rateEntry?.fetchedOn, rateEntry?.ts];
      for (const candidateTimestamp of candidateTimestamps) {
        if (
          typeof candidateTimestamp === 'number' &&
          Number.isFinite(candidateTimestamp) &&
          candidateTimestamp > 0 &&
          (latestTimestamp == null || candidateTimestamp > latestTimestamp)
        ) {
          latestTimestamp = candidateTimestamp;
        }
      }
    }
  }

  return latestTimestamp;
}

export async function runPortfolioAnalysisQuery(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
  asOfMs?: number;
}): Promise<PnlAnalysisResult> {
  return getPortfolioAnalysisRuntimeClient().computeAnalysis({
    cfg: createPortfolioQueryBwsConfig(),
    wallets: args.wallets,
    quoteCurrency: args.quoteCurrency,
    timeframe: args.timeframe,
    maxPoints: args.maxPoints,
    currentRatesByAssetId: args.currentRatesByAssetId,
    nowMs: args.asOfMs,
  });
}

export async function preparePortfolioAnalysisSessionQuery(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
  asOfMs?: number;
}): Promise<{sessionId: string}> {
  return getPortfolioAnalysisRuntimeClient().prepareAnalysisSession({
    cfg: createPortfolioQueryBwsConfig(),
    wallets: args.wallets,
    quoteCurrency: args.quoteCurrency,
    timeframe: args.timeframe,
    maxPoints: args.maxPoints,
    currentRatesByAssetId: args.currentRatesByAssetId,
    nowMs: args.asOfMs,
  });
}

export async function runPortfolioAnalysisSessionScopeQuery(args: {
  sessionId: string;
  walletIds?: string[];
}): Promise<PnlAnalysisResult> {
  return getPortfolioAnalysisRuntimeClient().computeAnalysisSessionScope({
    sessionId: args.sessionId,
    walletIds: args.walletIds,
  });
}

export async function disposePortfolioAnalysisSessionQuery(args: {
  sessionId: string;
}): Promise<void> {
  return getPortfolioAnalysisRuntimeClient().disposeAnalysisSession({
    sessionId: args.sessionId,
  });
}

export async function runPortfolioChartQuery(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
  asOfMs?: number;
}): Promise<PnlAnalysisChartResult> {
  return getPortfolioAnalysisRuntimeClient().computeAnalysisChart({
    cfg: createPortfolioQueryBwsConfig(),
    wallets: args.wallets,
    quoteCurrency: args.quoteCurrency,
    timeframe: args.timeframe,
    maxPoints: args.maxPoints,
    currentRatesByAssetId: args.currentRatesByAssetId,
    nowMs: args.asOfMs,
  });
}

// Staged migration note: BalanceHistoryChart consumes the complete view model
// below. Chart-derived summary hooks still intentionally call
// runPortfolioChartQuery until they are migrated in a later, lower-risk pass.
export async function runPortfolioBalanceChartViewModelQuery(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframe: PnlTimeframe;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
  dataRevisionSig: string;
  walletIds: string[];
  balanceOffset?: number;
  asOfMs?: number;
  summaryCacheRevisionSig?: string;
}): Promise<BalanceChartViewModel> {
  const promise =
    getPortfolioAnalysisRuntimeClient().computeBalanceChartViewModel({
      cfg: createPortfolioQueryBwsConfig(),
      wallets: args.wallets,
      quoteCurrency: args.quoteCurrency,
      timeframe: args.timeframe,
      maxPoints: args.maxPoints,
      currentRatesByAssetId: args.currentRatesByAssetId,
      nowMs: args.asOfMs,
      walletIds: args.walletIds,
      dataRevisionSig: args.dataRevisionSig,
      balanceOffset: args.balanceOffset,
    });
  const summaryIdentity = buildAssetPnlSummaryIdentityFromViewModelQuery(args);
  if (summaryIdentity) {
    trackAssetPnlSummaryViewModelPromise({
      identity: summaryIdentity,
      promise,
    });
  }

  return promise;
}

export function getLastFiniteNumber(
  values: Array<number | null | undefined> | undefined,
): number | undefined {
  if (!Array.isArray(values) || !values.length) {
    return undefined;
  }

  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

export function normalizeDisplayPercentage(
  value: number | undefined,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(2));
}
