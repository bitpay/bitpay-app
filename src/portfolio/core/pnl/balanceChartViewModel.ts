import type {FiatRateInterval} from '../fiatRatesShared';
import {
  computePointExtrema,
  normalizeLineChartPoints,
  toFiniteNumber,
  type LineChartPointFactoryArgs,
} from '../lineChartMath';
import type {PnlAnalysisChartResult} from './analysisStreaming';

export type {ComputeBalanceChartViewModelArgs} from './analysisQueryTypes';

export type BalanceChartGraphPointDto = {
  ts: number;
  value: number;
};

export type BalanceChartAnalysisPointDto = {
  timestamp: number;
  totalFiatBalance: number;
  totalRemainingCostBasisFiat: number;
  totalUnrealizedPnlFiat: number;
  totalPnlChange: number;
  totalPnlPercent: number;
  totalCryptoBalanceFormatted?: string;
};

export type BalanceChartViewModelExtrema = {
  minIndex: number;
  maxIndex: number;
  minPoint: BalanceChartGraphPointDto;
  maxPoint: BalanceChartGraphPointDto;
};

export type BalanceChartViewModelChangeRow = {
  totalPnlChange: number;
  totalPnlPercent: number;
};

export type BalanceChartViewModel = {
  timeframe: FiatRateInterval;
  quoteCurrency: string;
  walletIds: string[];
  dataRevisionSig: string;
  balanceOffset: number;
  graphPoints: BalanceChartGraphPointDto[];
  analysisPoints: BalanceChartAnalysisPointDto[];
  latestTotalFiatBalance?: number;
  latestDisplayedTotalFiatBalance?: number;
  totalPnlChange?: number;
  totalPnlPercent?: number;
  minMax?: BalanceChartViewModelExtrema;
  changeRow?: BalanceChartViewModelChangeRow;
};

function normalizeBalanceOffset(value: unknown): number {
  'worklet';

  return toFiniteNumber(value, 0);
}

function getSortedUniqueWalletIds(walletIds: string[] | undefined): string[] {
  'worklet';

  const seen: Record<string, true> = {};
  const out: string[] = [];

  for (const walletId of walletIds || []) {
    const normalized = String(walletId || '');
    if (!normalized || seen[normalized]) {
      continue;
    }
    seen[normalized] = true;
    out.push(normalized);
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function getBalanceChartGraphPointTimestamp(
  point: BalanceChartGraphPointDto,
): unknown {
  'worklet';

  return point?.ts;
}

function getBalanceChartGraphPointValue(
  point: BalanceChartGraphPointDto,
): unknown {
  'worklet';

  return point?.value;
}

function makeBalanceChartGraphPoint(
  args: LineChartPointFactoryArgs<
    BalanceChartGraphPointDto,
    BalanceChartGraphPointDto
  >,
): BalanceChartGraphPointDto {
  'worklet';

  return {
    ts: args.timestamp,
    value: args.value,
  };
}

function normalizeGraphPointDtos(
  points: BalanceChartGraphPointDto[],
): BalanceChartGraphPointDto[] {
  'worklet';

  return normalizeLineChartPoints(points, {
    getTimestamp: getBalanceChartGraphPointTimestamp,
    getValue: getBalanceChartGraphPointValue,
    makePoint: makeBalanceChartGraphPoint,
  });
}

function computeGraphPointExtrema(
  points: BalanceChartGraphPointDto[],
): BalanceChartViewModelExtrema | undefined {
  'worklet';

  return computePointExtrema(points, getBalanceChartGraphPointValue);
}

export function buildBalanceChartViewModelFromAnalysisChart(args: {
  chart: PnlAnalysisChartResult;
  walletIds?: string[];
  dataRevisionSig?: string;
  balanceOffset?: number;
}): BalanceChartViewModel {
  'worklet';

  const chart = args.chart;
  const balanceOffset = normalizeBalanceOffset(args.balanceOffset);
  const length = Math.min(
    Array.isArray(chart.timestamps) ? chart.timestamps.length : 0,
    Array.isArray(chart.totalFiatBalance) ? chart.totalFiatBalance.length : 0,
    Array.isArray(chart.totalRemainingCostBasisFiat)
      ? chart.totalRemainingCostBasisFiat.length
      : 0,
    Array.isArray(chart.totalUnrealizedPnlFiat)
      ? chart.totalUnrealizedPnlFiat.length
      : 0,
    Array.isArray(chart.totalPnlChange) ? chart.totalPnlChange.length : 0,
    Array.isArray(chart.totalPnlPercent) ? chart.totalPnlPercent.length : 0,
  );

  const rawGraphPoints: BalanceChartGraphPointDto[] = [];
  const rawAnalysisPoints: BalanceChartAnalysisPointDto[] = [];

  for (let index = 0; index < length; index++) {
    const timestamp = Number(chart.timestamps[index]);
    const totalFiatBalance = Number(chart.totalFiatBalance[index]);
    const totalRemainingCostBasisFiat = Number(
      chart.totalRemainingCostBasisFiat[index],
    );
    const totalUnrealizedPnlFiat = Number(chart.totalUnrealizedPnlFiat[index]);
    const totalPnlChange = Number(chart.totalPnlChange[index]);
    const totalPnlPercent = Number(chart.totalPnlPercent[index]);
    const totalCryptoBalanceFormatted = Array.isArray(
      chart.totalCryptoBalanceFormatted,
    )
      ? chart.totalCryptoBalanceFormatted[index]
      : undefined;

    if (
      ![
        timestamp,
        totalFiatBalance,
        totalRemainingCostBasisFiat,
        totalUnrealizedPnlFiat,
        totalPnlChange,
        totalPnlPercent,
      ].every(Number.isFinite)
    ) {
      continue;
    }

    rawGraphPoints.push({
      ts: timestamp,
      value: totalFiatBalance + balanceOffset,
    });
    rawAnalysisPoints.push({
      timestamp,
      totalFiatBalance,
      totalRemainingCostBasisFiat,
      totalUnrealizedPnlFiat,
      totalPnlChange,
      totalPnlPercent,
      totalCryptoBalanceFormatted:
        typeof totalCryptoBalanceFormatted === 'string'
          ? totalCryptoBalanceFormatted
          : undefined,
    });
  }

  const graphPoints = normalizeGraphPointDtos(rawGraphPoints);
  const analysisPoints = rawAnalysisPoints.slice(0, graphPoints.length);
  const latestPoint = analysisPoints.length
    ? analysisPoints[analysisPoints.length - 1]
    : undefined;

  return {
    timeframe: chart.timeframe,
    quoteCurrency: String(chart.quoteCurrency || '').toUpperCase(),
    walletIds: getSortedUniqueWalletIds(args.walletIds),
    dataRevisionSig: String(args.dataRevisionSig || ''),
    balanceOffset,
    graphPoints,
    analysisPoints,
    latestTotalFiatBalance: latestPoint?.totalFiatBalance,
    latestDisplayedTotalFiatBalance:
      typeof latestPoint?.totalFiatBalance === 'number'
        ? latestPoint.totalFiatBalance + balanceOffset
        : undefined,
    totalPnlChange: latestPoint?.totalPnlChange,
    totalPnlPercent: latestPoint?.totalPnlPercent,
    minMax: computeGraphPointExtrema(graphPoints),
    changeRow: latestPoint
      ? {
          totalPnlChange: latestPoint.totalPnlChange,
          totalPnlPercent: latestPoint.totalPnlPercent,
        }
      : undefined,
  };
}
