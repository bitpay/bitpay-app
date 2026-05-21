import {
  buildBalanceChartViewModelFromAnalysisChart,
  type BalanceChartViewModel,
} from '../../core/pnl/balanceChartViewModel';
import type {
  ComputeAnalysisArgs,
  ComputeAnalysisSessionScopeArgs,
  ComputeBalanceChartViewModelArgs,
  DisposeAnalysisSessionArgs,
  PrepareAnalysisSessionResult,
} from '../../core/pnl/analysisQueryTypes';
import {
  buildPnlAnalysisChartSeriesFromStreamed,
  buildPnlAnalysisSeriesFromStreamed,
  resolvePnlAnalysisPreloadWindow,
  type PnlAnalysisChartResult,
  type PnlAnalysisResult,
  type PnlAnalysisStreamedArgs,
  type WalletForAnalysisMeta,
  type WalletForStreamedAnalysis,
} from '../../core/pnl/analysisStreaming';
import type {FiatRateInterval, FiatRatePoint} from '../../core/fiatRatesShared';
import {
  getFiatRateAssetRef,
  normalizeFiatRateSeriesChain,
  normalizeFiatRateSeriesCoin,
  normalizeFiatRateSeriesTokenAddress,
} from '../../core/fiatRateIdentity';
import type {PortfolioWorkletKvConfig} from './portfolioWorkletKv';
import {
  ensureWorkletCanonicalAndFxRates,
  getWorkletRateSeriesWithFx,
} from './portfolioWorkletRates';
import {
  findWorkletLastPointAtOrBefore,
  iterateWorkletPoints,
  loadWorkletSnapshotIndex,
} from './portfolioWorkletSnapshots';
import {resolveKnownWalletAtomicDecimals} from '../../core/format';

function getAssetIdFromWallet(wallet: {
  chain?: string;
  currencyAbbreviation?: string;
  tokenAddress?: string;
}): string {
  'worklet';

  const chain = (wallet.chain || '').toLowerCase();
  const coin = (wallet.currencyAbbreviation || '').toLowerCase();
  if (wallet.tokenAddress) {
    return `${chain}:${coin}:${wallet.tokenAddress.toLowerCase()}`;
  }

  return `${chain}:${coin}`;
}

function sanitizeRatePoints(
  pointsRaw: FiatRatePoint[] | undefined,
): FiatRatePoint[] {
  'worklet';

  if (!Array.isArray(pointsRaw)) {
    return [];
  }

  return pointsRaw
    .map(point => ({ts: Number(point.ts), rate: Number(point.rate)}))
    .filter(point => Number.isFinite(point.ts) && Number.isFinite(point.rate))
    .sort((a, b) => a.ts - b.ts);
}

function getRateIntervalsForAnalysis(
  timeframe: FiatRateInterval,
): FiatRateInterval[] {
  'worklet';

  return timeframe === 'ALL' ? ['ALL', '1D'] : [timeframe];
}

function mergeRatePointSeries(seriesList: FiatRatePoint[][]): FiatRatePoint[] {
  'worklet';

  const ratesByTs = new Map<number, number>();

  for (const series of seriesList) {
    for (const point of series) {
      const ts = Number(point.ts);
      const rate = Number(point.rate);
      if (!Number.isFinite(ts) || !Number.isFinite(rate)) {
        continue;
      }
      ratesByTs.set(ts, rate);
    }
  }

  return Array.from(ratesByTs.entries())
    .map(([ts, rate]) => ({ts, rate}))
    .sort((a, b) => a.ts - b.ts);
}

function snapshotIndexHasRows(
  index:
    | {
        chunks?: Array<{
          rows?: number;
        }>;
      }
    | null
    | undefined,
): boolean {
  'worklet';

  return (
    Array.isArray(index?.chunks) &&
    index.chunks.some(chunk => Number(chunk?.rows) > 0)
  );
}

type PreparedWorkletAnalysisSessionData = {
  quoteCurrency: string;
  timeframe: ComputeAnalysisArgs['timeframe'];
  nowMs?: number;
  maxPoints?: number;
  currentRatesByAssetId?: Record<string, number>;
  ratePointsByAssetId: Record<string, FiatRatePoint[]>;
  walletMetasById: Record<string, WalletForAnalysisMeta>;
  walletIds: string[];
  firstNonZeroTsByWalletId: Record<string, number | null>;
};

type PortfolioWorkletAnalysisState = {
  nextPreparedWorkletAnalysisSessionId: number;
  preparedSessionsById: Record<
    string,
    PreparedWorkletAnalysisSessionData | undefined
  >;
};

type GlobalWithPortfolioWorkletAnalysisState = typeof globalThis & {
  __bitpayPortfolioWorkletAnalysisStateV1__?: PortfolioWorkletAnalysisState;
};

const PORTFOLIO_WORKLET_ANALYSIS_STATE_GLOBAL_KEY =
  '__bitpayPortfolioWorkletAnalysisStateV1__';

function getOrCreatePortfolioWorkletAnalysisState(): PortfolioWorkletAnalysisState {
  'worklet';

  const globalWithState = globalThis as GlobalWithPortfolioWorkletAnalysisState;
  const existing = globalWithState[PORTFOLIO_WORKLET_ANALYSIS_STATE_GLOBAL_KEY];
  if (existing) {
    return existing;
  }

  const created: PortfolioWorkletAnalysisState = {
    nextPreparedWorkletAnalysisSessionId: 1,
    preparedSessionsById: {},
  };
  globalWithState[PORTFOLIO_WORKLET_ANALYSIS_STATE_GLOBAL_KEY] = created;
  return created;
}

function buildEmptyPreparedWorkletAnalysisSessionData(args: {
  quoteCurrency: string;
  timeframe: ComputeAnalysisArgs['timeframe'];
  nowMs: ComputeAnalysisArgs['nowMs'];
  maxPoints: ComputeAnalysisArgs['maxPoints'];
  currentRatesByAssetId?: Record<string, number>;
}): PreparedWorkletAnalysisSessionData {
  'worklet';

  return {
    quoteCurrency: args.quoteCurrency,
    timeframe: args.timeframe,
    nowMs: args.nowMs,
    maxPoints: args.maxPoints,
    currentRatesByAssetId: args.currentRatesByAssetId,
    ratePointsByAssetId: {},
    walletMetasById: {},
    walletIds: [],
    firstNonZeroTsByWalletId: {},
  };
}

function getStoredWalletKnownUnitDecimals(wallet: any): number | undefined {
  'worklet';

  return resolveKnownWalletAtomicDecimals({
    unitDecimals: wallet?.summary?.unitDecimals,
    credentials: wallet?.credentials || {},
  });
}

function isStoredWalletDecimalsResolvedForAnalysis(wallet: any): boolean {
  'worklet';

  const tokenAddress = normalizeFiatRateSeriesTokenAddress(
    wallet?.summary?.chain,
    wallet?.summary?.tokenAddress || wallet?.credentials?.token?.address,
  );
  if (!tokenAddress) {
    return true;
  }

  return typeof getStoredWalletKnownUnitDecimals(wallet) === 'number';
}

async function prepareWorkletAnalysisSessionData(
  config: PortfolioWorkletKvConfig,
  args: ComputeAnalysisArgs,
): Promise<PreparedWorkletAnalysisSessionData> {
  'worklet';

  if (!args.wallets.length) {
    return buildEmptyPreparedWorkletAnalysisSessionData({
      quoteCurrency: String(args.quoteCurrency || 'USD').toUpperCase(),
      timeframe: args.timeframe,
      nowMs: args.nowMs,
      maxPoints: args.maxPoints,
      currentRatesByAssetId: args.currentRatesByAssetId,
    });
  }

  const targetQuoteCurrency = String(args.quoteCurrency || 'USD').toUpperCase();
  const analysisWallets = args.wallets.filter(
    isStoredWalletDecimalsResolvedForAnalysis,
  );
  const walletMetas: WalletForAnalysisMeta[] = analysisWallets.map(wallet => ({
    walletId: wallet.summary.walletId,
    walletName: wallet.summary.walletName,
    assetId: getAssetIdFromWallet(wallet.summary),
    rateCoin: normalizeFiatRateSeriesCoin(wallet.summary.currencyAbbreviation),
    currencyAbbreviation: wallet.summary.currencyAbbreviation,
    chain: normalizeFiatRateSeriesChain(wallet.summary.chain),
    tokenAddress: normalizeFiatRateSeriesTokenAddress(
      wallet.summary.chain,
      wallet.summary.tokenAddress,
    ),
    unitDecimals: getStoredWalletKnownUnitDecimals(wallet),
    liveBalanceAtomic: wallet.summary.balanceAtomic,
    credentials: wallet.credentials,
  }));
  const walletMetaByWalletId = new Map(
    walletMetas.map(meta => [meta.walletId, meta] as const),
  );

  const snapshotIndexesByWalletId = new Map(
    await Promise.all(
      analysisWallets.map(async wallet => {
        return [
          wallet.summary.walletId,
          await loadWorkletSnapshotIndex(config, wallet.summary.walletId),
        ] as const;
      }),
    ),
  );
  const walletIdsWithSnapshots = new Set(
    analysisWallets
      .filter(wallet =>
        snapshotIndexHasRows(
          snapshotIndexesByWalletId.get(wallet.summary.walletId),
        ),
      )
      .map(wallet => wallet.summary.walletId),
  );
  const walletsWithSnapshots = analysisWallets.filter(wallet =>
    walletIdsWithSnapshots.has(wallet.summary.walletId),
  );

  if (!walletsWithSnapshots.length) {
    return buildEmptyPreparedWorkletAnalysisSessionData({
      quoteCurrency: targetQuoteCurrency,
      timeframe: args.timeframe,
      nowMs: args.nowMs,
      maxPoints: args.maxPoints,
      currentRatesByAssetId: args.currentRatesByAssetId,
    });
  }

  const baseAssets = Array.from(
    new Map(
      walletsWithSnapshots.map(wallet => {
        const assetRef = getFiatRateAssetRef({
          currencyAbbreviation: wallet.summary.currencyAbbreviation,
          chain: wallet.summary.chain,
          tokenAddress: wallet.summary.tokenAddress,
        });
        const assetId = getAssetIdFromWallet(wallet.summary);
        return [
          assetId,
          {
            assetId,
            coin: assetRef.coin,
            chain: assetRef.chain,
            tokenAddress: assetRef.tokenAddress,
          },
        ] as const;
      }),
    ).values(),
  );
  const rateIntervals = getRateIntervalsForAnalysis(args.timeframe);

  for (const interval of rateIntervals) {
    await ensureWorkletCanonicalAndFxRates({
      storage: config.storage,
      registryKey: config.registryKey,
      cfg: args.cfg,
      quoteCurrency: targetQuoteCurrency,
      timeframe: interval,
      assets: baseAssets,
    });
  }

  const ratePointsByAssetId: Record<string, FiatRatePoint[]> = {};
  for (const asset of baseAssets) {
    const pointsByInterval: FiatRatePoint[][] = [];
    for (const interval of rateIntervals) {
      const series = await getWorkletRateSeriesWithFx({
        storage: config.storage,
        registryKey: config.registryKey,
        quoteCurrency: targetQuoteCurrency,
        coin: asset.coin,
        interval,
        chain: asset.chain,
        tokenAddress: asset.tokenAddress,
      });
      const points = sanitizeRatePoints(series?.points);
      if (points.length) {
        pointsByInterval.push(points);
      }
    }
    const points = mergeRatePointSeries(pointsByInterval);
    if (points.length) {
      ratePointsByAssetId[asset.assetId] = points;
    }
  }

  const walletMetasWithRates = walletMetas.filter(
    meta => (ratePointsByAssetId[meta.assetId]?.length ?? 0) > 0,
  );
  const walletIdsWithRates = new Set(
    walletMetasWithRates.map(meta => meta.walletId),
  );
  const walletsWithSnapshotsAndRates = walletsWithSnapshots.filter(wallet =>
    walletIdsWithRates.has(wallet.summary.walletId),
  );

  if (!walletsWithSnapshotsAndRates.length) {
    return buildEmptyPreparedWorkletAnalysisSessionData({
      quoteCurrency: targetQuoteCurrency,
      timeframe: args.timeframe,
      nowMs: args.nowMs,
      maxPoints: args.maxPoints,
      currentRatesByAssetId: args.currentRatesByAssetId,
    });
  }

  const firstNonZeroTsByWalletId: Record<string, number | null> = {};
  for (const wallet of walletsWithSnapshotsAndRates) {
    const walletId = wallet.summary.walletId;
    const ts =
      snapshotIndexesByWalletId.get(walletId)?.checkpoint?.firstNonZeroTs;
    firstNonZeroTsByWalletId[walletId] =
      typeof ts === 'number' && Number.isFinite(ts) && ts > 0 ? ts : null;
  }

  return {
    quoteCurrency: targetQuoteCurrency,
    timeframe: args.timeframe,
    nowMs: args.nowMs,
    maxPoints: args.maxPoints,
    currentRatesByAssetId: args.currentRatesByAssetId,
    ratePointsByAssetId,
    walletMetasById: walletsWithSnapshotsAndRates.reduce<
      Record<string, WalletForAnalysisMeta>
    >((accumulator, wallet) => {
      const walletId = wallet.summary.walletId;
      const walletMeta = walletMetaByWalletId.get(walletId);
      if (!walletMeta) {
        throw new Error(`Missing analysis wallet metadata for ${walletId}.`);
      }
      accumulator[walletId] = walletMeta;
      return accumulator;
    }, {}),
    walletIds: walletsWithSnapshotsAndRates.map(
      wallet => wallet.summary.walletId,
    ),
    firstNonZeroTsByWalletId,
  };
}

async function buildWorkletStreamedAnalysisArgsFromPreparedSessionData(
  config: PortfolioWorkletKvConfig,
  prepared: PreparedWorkletAnalysisSessionData,
  walletIds?: string[],
): Promise<PnlAnalysisStreamedArgs> {
  'worklet';

  const selectedWalletIds = Array.from(
    new Set(
      (Array.isArray(walletIds) && walletIds.length
        ? walletIds
        : prepared.walletIds
      )
        .map(walletId => String(walletId || ''))
        .filter(walletId => !!prepared.walletMetasById[walletId]),
    ),
  );

  if (!selectedWalletIds.length) {
    return {
      cfg: {quoteCurrency: prepared.quoteCurrency},
      wallets: [],
      timeframe: prepared.timeframe,
      ratePointsByAssetId: {},
      currentRatesByAssetId: prepared.currentRatesByAssetId,
      nowMs: prepared.nowMs,
      maxPoints: prepared.maxPoints,
    };
  }

  const selectedWalletMetas = selectedWalletIds.map(
    walletId => prepared.walletMetasById[walletId],
  );
  const firstNonZeroTs =
    prepared.timeframe === 'ALL'
      ? selectedWalletIds.reduce<number | null>((best, walletId) => {
          const candidate = prepared.firstNonZeroTsByWalletId[walletId];
          if (
            typeof candidate !== 'number' ||
            !Number.isFinite(candidate) ||
            candidate <= 0
          ) {
            return best;
          }
          if (best === null || candidate < best) {
            return candidate;
          }
          return best;
        }, null)
      : null;
  const resolved = resolvePnlAnalysisPreloadWindow({
    cfg: {quoteCurrency: prepared.quoteCurrency},
    wallets: selectedWalletMetas,
    timeframe: prepared.timeframe,
    ratePointsByAssetId: prepared.ratePointsByAssetId,
    currentRatesByAssetId: prepared.currentRatesByAssetId,
    firstNonZeroTs,
    nowMs: prepared.nowMs,
    maxPoints: prepared.maxPoints,
  });

  const wallets: WalletForStreamedAnalysis[] = [];
  for (const walletId of selectedWalletIds) {
    const walletMeta = prepared.walletMetasById[walletId];
    const basePoint = await findWorkletLastPointAtOrBefore({
      storage: config.storage,
      registryKey: config.registryKey,
      walletId,
      tsMs: resolved.startTs,
    });
    wallets.push({
      wallet: walletMeta,
      basePoint,
      points: iterateWorkletPoints({
        storage: config.storage,
        registryKey: config.registryKey,
        walletId,
        fromExclusive: resolved.startTs,
        toInclusive: resolved.endTs,
      }),
    });
  }

  return {
    cfg: {quoteCurrency: prepared.quoteCurrency},
    wallets,
    timeframe: prepared.timeframe,
    ratePointsByAssetId: prepared.ratePointsByAssetId,
    currentRatesByAssetId: prepared.currentRatesByAssetId,
    firstNonZeroTs,
    startTs: resolved.startTs,
    endTs: resolved.endTs,
    nowMs: resolved.nowMs,
    maxPoints: prepared.maxPoints,
    resolvedWindow: resolved,
  };
}

async function computeWorkletAnalysisFromPreparedSessionData(
  config: PortfolioWorkletKvConfig,
  prepared: PreparedWorkletAnalysisSessionData,
  walletIds?: string[],
): Promise<PnlAnalysisResult> {
  'worklet';

  const streamedArgs =
    await buildWorkletStreamedAnalysisArgsFromPreparedSessionData(
      config,
      prepared,
      walletIds,
    );

  return buildPnlAnalysisSeriesFromStreamed(streamedArgs);
}

export async function computeWorkletAnalysis(
  config: PortfolioWorkletKvConfig,
  args: ComputeAnalysisArgs,
): Promise<PnlAnalysisResult> {
  'worklet';
  const prepared = await prepareWorkletAnalysisSessionData(config, args);
  return computeWorkletAnalysisFromPreparedSessionData(config, prepared);
}

export async function prepareWorkletAnalysisSession(
  config: PortfolioWorkletKvConfig,
  args: ComputeAnalysisArgs,
): Promise<PrepareAnalysisSessionResult> {
  'worklet';

  const prepared = await prepareWorkletAnalysisSessionData(config, args);
  const state = getOrCreatePortfolioWorkletAnalysisState();
  const sessionId = `analysis-session:${state.nextPreparedWorkletAnalysisSessionId++}`;
  state.preparedSessionsById[sessionId] = prepared;
  return {sessionId};
}

export async function computeWorkletAnalysisSessionScope(
  config: PortfolioWorkletKvConfig,
  args: ComputeAnalysisSessionScopeArgs,
): Promise<PnlAnalysisResult> {
  'worklet';

  const prepared =
    getOrCreatePortfolioWorkletAnalysisState().preparedSessionsById[
      args.sessionId
    ];
  if (!prepared) {
    throw new Error(
      `Prepared portfolio analysis session not found: ${args.sessionId}`,
    );
  }

  return computeWorkletAnalysisFromPreparedSessionData(
    config,
    prepared,
    args.walletIds,
  );
}

export function disposeWorkletAnalysisSession(
  args: DisposeAnalysisSessionArgs,
): void {
  'worklet';

  delete getOrCreatePortfolioWorkletAnalysisState().preparedSessionsById[
    args.sessionId
  ];
}

export function clearWorkletAnalysisSessions(): void {
  'worklet';

  getOrCreatePortfolioWorkletAnalysisState().preparedSessionsById = {};
}

export async function computeWorkletAnalysisChart(
  config: PortfolioWorkletKvConfig,
  args: ComputeAnalysisArgs,
): Promise<PnlAnalysisChartResult> {
  'worklet';
  const prepared = await prepareWorkletAnalysisSessionData(config, args);
  const streamedArgs =
    await buildWorkletStreamedAnalysisArgsFromPreparedSessionData(
      config,
      prepared,
    );
  return buildPnlAnalysisChartSeriesFromStreamed(streamedArgs);
}

export async function computeWorkletBalanceChartViewModel(
  config: PortfolioWorkletKvConfig,
  args: ComputeBalanceChartViewModelArgs,
): Promise<BalanceChartViewModel> {
  'worklet';

  const chart = await computeWorkletAnalysisChart(config, args);
  return buildBalanceChartViewModelFromAnalysisChart({
    chart,
    walletIds: args.walletIds,
    dataRevisionSig: args.dataRevisionSig,
    balanceOffset: args.balanceOffset,
  });
}
