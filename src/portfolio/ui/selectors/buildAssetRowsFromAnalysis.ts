import {
  formatCurrencyAbbreviation,
  formatFiatAmount,
} from '../../../utils/helper-methods';
import type {AssetRowItem, GainLossMode} from '../../../utils/portfolio/assets';
import {
  formatBigIntDecimal,
  parseAtomicToBigint,
  resolveWalletAtomicDecimals,
} from '../../core/format';
import {getAssetIdFromWallet} from '../../core/pnl/assetId';
import type {
  AssetPnlSummary,
  PnlAnalysisResult,
} from '../../core/pnl/analysisStreaming';
import type {StoredWallet} from '../../core/types';
import {isPortfolioRuntimeMainnetLikeNetwork} from '../../adapters/rn/walletEligibility';
import {atomicToUnitNumber} from '../../../utils/portfolio/core/pnl/atomic';

const UNAVAILABLE_DELTA_FIAT = '—     ';
const UNAVAILABLE_DELTA_PERCENT = '  —  %';

type AggregatedAssetSummary = {
  fiatValue: number;
  pnlChange: number;
  pnlEnd: number;
  remainingCostBasisFiatEnd: number;
  hasRate: boolean;
  hasPnl: boolean;
  pnlPercent: number;
};

export type AssetRowMetrics = {
  key: string;
  currencyAbbreviation: string;
  chain: string;
  tokenAddress?: string;
  cryptoAmount: string;
  fiatValue: number;
  pnlFiat: number;
  pnlPercent: number;
  hasRate: boolean;
  hasPnl: boolean;
  showPnlPlaceholder: boolean;
};

function formatDeltaFiat(delta: number, quoteCurrency: string): string {
  const abs = Math.abs(delta);
  const prefix = delta >= 0 ? '+' : '-';
  return `${prefix}${formatFiatAmount(abs, quoteCurrency, {
    customPrecision: 'minimal',
  })}`;
}

function formatDeltaPercent(percent: number): string {
  const normalized = Number.isFinite(percent) ? percent : 0;
  const abs = Math.abs(normalized);
  const prefix = normalized >= 0 ? '+' : '-';
  return `${prefix}${abs.toFixed(2)}%`;
}

function aggregateAssetSummaries(
  summaries: AssetPnlSummary[],
): AggregatedAssetSummary {
  let fiatValue = 0;
  let pnlChange = 0;
  let pnlEnd = 0;
  let remainingCostBasisFiatEnd = 0;
  let hasRate = false;

  for (const summary of summaries) {
    fiatValue += summary.fiatBalanceEnd || 0;
    pnlChange += summary.pnlChange || 0;
    pnlEnd += summary.pnlEnd || 0;
    remainingCostBasisFiatEnd += summary.remainingCostBasisFiatEnd || 0;
    if (
      !hasRate &&
      typeof summary.rateEnd === 'number' &&
      Number.isFinite(summary.rateEnd) &&
      summary.rateEnd > 0
    ) {
      hasRate = true;
    }
  }
  const hasPnl = summaries.length > 0;

  return {
    fiatValue,
    pnlChange,
    pnlEnd,
    remainingCostBasisFiatEnd,
    hasRate,
    hasPnl,
    pnlPercent:
      remainingCostBasisFiatEnd > 0
        ? (pnlEnd / remainingCostBasisFiatEnd) * 100
        : 0,
  };
}

export function buildAssetRowMetricsFromAnalysis(args: {
  storedWallets: StoredWallet[];
  analysis?: PnlAnalysisResult;
  currentRatesByAssetId?: Record<string, number>;
  gainLossMode: GainLossMode;
  collapseAcrossChains?: boolean;
}): AssetRowMetrics[] {
  const collapseAcrossChains = args.collapseAcrossChains !== false;
  const isTodayGainLoss = args.gainLossMode === '1D';
  const analysis = args.analysis;
  const assetSummaryByAssetId = new Map(
    (analysis?.assetSummaries || []).map(summary => [summary.assetId, summary]),
  );

  const walletsByGroupKey = new Map<string, StoredWallet[]>();

  for (const wallet of args.storedWallets || []) {
    if (!isPortfolioRuntimeMainnetLikeNetwork(wallet.summary.network)) {
      continue;
    }

    const coin = (wallet.summary.currencyAbbreviation || '').toLowerCase();
    if (!coin) {
      continue;
    }

    const assetId = getAssetIdFromWallet(wallet.summary);
    const groupKey = collapseAcrossChains ? coin : assetId;
    const list = walletsByGroupKey.get(groupKey) || [];
    list.push(wallet);
    walletsByGroupKey.set(groupKey, list);
  }

  const rows: AssetRowMetrics[] = [];

  for (const [key, groupWallets] of walletsByGroupKey.entries()) {
    if (!groupWallets.length) {
      continue;
    }

    const first = groupWallets[0];
    const coin = (first.summary.currencyAbbreviation || '').toLowerCase();
    const repWallet = collapseAcrossChains
      ? groupWallets.find(
          wallet =>
            (wallet.summary.chain || '').toLowerCase() === coin &&
            !wallet.summary.tokenAddress,
        ) || first
      : first;

    let totalAtomic = 0n;
    let liveFiatValue = 0;
    let missingLiveRate = false;
    const uniqueAssetIds = new Set<string>();

    for (const wallet of groupWallets) {
      const assetId = getAssetIdFromWallet(wallet.summary);
      uniqueAssetIds.add(assetId);

      const decimals = resolveWalletAtomicDecimals({
        unitDecimals: wallet.summary.unitDecimals,
        credentials: wallet.credentials,
      });
      const atomic = parseAtomicToBigint(wallet.summary.balanceAtomic || '0');
      totalAtomic += atomic;
      const currentRate = args.currentRatesByAssetId?.[assetId];
      if (
        atomic > 0n &&
        typeof currentRate === 'number' &&
        Number.isFinite(currentRate) &&
        currentRate > 0
      ) {
        liveFiatValue += atomicToUnitNumber(atomic, decimals) * currentRate;
      } else if (atomic > 0n) {
        missingLiveRate = true;
      }
    }

    if (totalAtomic <= 0n) {
      continue;
    }

    const summaries = Array.from(uniqueAssetIds)
      .map(assetId => assetSummaryByAssetId.get(assetId))
      .filter((summary): summary is AssetPnlSummary => !!summary);
    const aggregatedSummary = aggregateAssetSummaries(summaries);
    const repDecimals = resolveWalletAtomicDecimals({
      unitDecimals: repWallet.summary.unitDecimals,
      credentials: repWallet.credentials,
    });
    const cryptoAmount = formatBigIntDecimal(
      totalAtomic,
      repDecimals,
      Math.min(repDecimals, 8),
    );
    const fiatValue = missingLiveRate
      ? aggregatedSummary.fiatValue
      : liveFiatValue;
    const hasRate = aggregatedSummary.hasRate || !missingLiveRate;
    const showPnlPlaceholder =
      !aggregatedSummary.hasPnl &&
      (!isTodayGainLoss || !aggregatedSummary.hasRate);

    rows.push({
      key,
      currencyAbbreviation: coin,
      chain: repWallet.summary.chain,
      tokenAddress: repWallet.summary.tokenAddress,
      cryptoAmount,
      fiatValue,
      pnlFiat: aggregatedSummary.pnlChange,
      pnlPercent: aggregatedSummary.pnlPercent,
      hasRate,
      hasPnl: aggregatedSummary.hasPnl,
      showPnlPlaceholder,
    });
  }

  return rows.sort((left, right) => right.fiatValue - left.fiatValue);
}

export function buildAssetRowsFromAnalysis(args: {
  storedWallets: StoredWallet[];
  analysis?: PnlAnalysisResult;
  currentRatesByAssetId?: Record<string, number>;
  quoteCurrency: string;
  gainLossMode: GainLossMode;
  collapseAcrossChains?: boolean;
}): AssetRowItem[] {
  const quoteCurrency = (args.quoteCurrency || 'USD').toUpperCase();

  return buildAssetRowMetricsFromAnalysis(args).map(row =>
    buildAssetRowItemFromMetrics({row, quoteCurrency}),
  );
}

export function buildAssetRowItemFromMetrics(args: {
  row: AssetRowMetrics;
  quoteCurrency: string;
}): AssetRowItem {
  const quoteCurrency = (args.quoteCurrency || 'USD').toUpperCase();
  const row = args.row;

  return {
    key: row.key,
    currencyAbbreviation: row.currencyAbbreviation,
    chain: row.chain,
    tokenAddress: row.tokenAddress,
    name: formatCurrencyAbbreviation(row.currencyAbbreviation),
    cryptoAmount: row.cryptoAmount,
    fiatAmount: `${formatFiatAmount(row.fiatValue, quoteCurrency, {
      customPrecision: 'minimal',
    })}${row.showPnlPlaceholder ? '\u00A0' : ''}`,
    deltaFiat: row.showPnlPlaceholder
      ? UNAVAILABLE_DELTA_FIAT
      : formatDeltaFiat(row.pnlFiat, quoteCurrency),
    deltaPercent: row.showPnlPlaceholder
      ? UNAVAILABLE_DELTA_PERCENT
      : formatDeltaPercent(row.pnlPercent),
    isPositive: row.pnlFiat >= 0,
    hasRate: row.hasRate,
    hasPnl: row.hasPnl,
    showPnlPlaceholder: row.showPnlPlaceholder,
  };
}

export default buildAssetRowsFromAnalysis;
