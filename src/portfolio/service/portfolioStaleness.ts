import type {BalanceSnapshotStored} from '../core/pnl/types';
import type {SnapshotIndexV2} from '../core/pnl/snapshotStore';
import {
  isSnapshotInvalidHistoryRetryDue,
  isSnapshotMarkerRetryDue,
} from '../core/pnl/invalidHistory';
import type {PortfolioRuntimeClient} from '../runtime/portfolioClient';
import type {Wallet} from '../../store/wallet/wallet.models';
import {atomicToUnitString} from '../../utils/helper-methods';
import {getWalletLiveAtomicBalance} from '../../utils/portfolio/assets';
import {normalizeWalletUnitDecimals} from '../core/format';

export type PortfolioSnapshotBalanceMismatch = {
  walletId: string;
  computedAtomic: string;
  currentAtomic: string;
  deltaAtomic: string;
  computedUnitsHeld: string;
  currentWalletBalance: string;
  delta: string;
};

export type PortfolioPopulateDecisionReason =
  | 'missing_index'
  | 'missing_snapshot'
  | 'invalid_snapshot_balance'
  | 'balance_mismatch'
  | 'unchanged_balance_mismatch'
  | 'excessive_balance_mismatch'
  | 'invalid_decimals'
  | 'invalid_history'
  | 'up_to_date';

export type PortfolioInvalidDecimalsMarker = {
  walletId: string;
  reason: 'invalid_decimals';
  message: string;
};

export type PortfolioExcessiveBalanceMismatchMarker = {
  walletId: string;
  reason: 'excessive_balance_mismatch';
  computedAtomic: string;
  liveAtomic: string;
  deltaAtomic: string;
  ratio: string;
  threshold: number;
  detectedAt: number;
  lastAttemptedAt?: number;
  message: string;
};

export type PortfolioUnitDecimalsResolution =
  | {ok: true; unitDecimals: number}
  | {ok: false; reason: 'invalid_decimals'; message: string};

export type PortfolioPopulateDecision = {
  walletId: string;
  shouldPopulate: boolean;
  reason: PortfolioPopulateDecisionReason;
  index: SnapshotIndexV2 | null;
  latestSnapshot: BalanceSnapshotStored | null;
  mismatch?: PortfolioSnapshotBalanceMismatch;
  invalidDecimals?: PortfolioInvalidDecimalsMarker;
  excessiveBalanceMismatch?: PortfolioExcessiveBalanceMismatchMarker;
};

type WalletIdUpdateMap<T> = {[walletId: string]: T | undefined};

export const getPortfolioInvalidDecimalsMessage = (walletId: string): string =>
  `Wallet ${walletId || 'unknown'} has unresolved token decimals.`;

export const PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_THRESHOLD = 0.1;
export const PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_RETRY_INTERVAL_MS =
  24 * 60 * 60 * 1000;

const PERCENT_BASIS_POINTS = 10_000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isPortfolioExcessiveBalanceMismatchRetryDue = (
  marker: PortfolioExcessiveBalanceMismatchMarker | null | undefined,
  nowMs: number = Date.now(),
  retryIntervalMs?: number,
): boolean =>
  isSnapshotMarkerRetryDue(
    marker,
    nowMs,
    retryIntervalMs,
    PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_RETRY_INTERVAL_MS,
  );

export const markPortfolioExcessiveBalanceMismatchAttempted = (
  marker: PortfolioExcessiveBalanceMismatchMarker,
  lastAttemptedAt: number = Date.now(),
): PortfolioExcessiveBalanceMismatchMarker => {
  const detectedAt = Number.isFinite(Number(marker.detectedAt))
    ? Number(marker.detectedAt)
    : lastAttemptedAt;

  return {
    ...marker,
    detectedAt,
    lastAttemptedAt,
  };
};

const toThresholdBasisPoints = (threshold: number): bigint => {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return 0n;
  }

  return BigInt(Math.round(threshold * PERCENT_BASIS_POINTS));
};

const formatBigIntRatio = (numerator: bigint, denominator: bigint): string => {
  if (denominator === 0n) {
    return numerator > 0n ? 'Infinity' : '0';
  }

  const scale = 1_000_000n;
  const scaled = (numerator * scale) / denominator;
  const whole = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(6, '0');
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
};

const parseAtomicString = (
  value: unknown,
  allowNegative = true,
): bigint | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  const integerPattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
  if (!integerPattern.test(normalized)) {
    return null;
  }

  return BigInt(normalized);
};

export const getPortfolioExcessiveBalanceMismatchMessage = (args: {
  walletId: string;
  ratio: string;
  threshold: number;
}): string => {
  const thresholdPercent = Math.round(args.threshold * 10000) / 100;
  return `Wallet ${
    args.walletId || 'unknown'
  } snapshot balance exceeds live balance by ${
    args.ratio
  }x (threshold ${thresholdPercent}%).`;
};

export function buildPortfolioExcessiveBalanceMismatchMarker(args: {
  mismatch: PortfolioSnapshotBalanceMismatch;
  threshold?: number;
  detectedAt?: number;
  lastAttemptedAt?: number;
  previousMarker?: PortfolioExcessiveBalanceMismatchMarker;
}): PortfolioExcessiveBalanceMismatchMarker | undefined {
  const threshold = isFiniteNumber(args.threshold)
    ? args.threshold
    : PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_THRESHOLD;
  const computedAtomic = parseAtomicString(args.mismatch.computedAtomic);
  const liveAtomic = parseAtomicString(args.mismatch.currentAtomic);
  if (computedAtomic === null || liveAtomic === null) {
    return undefined;
  }

  const deltaAtomic = computedAtomic - liveAtomic;
  if (deltaAtomic <= 0n) {
    return undefined;
  }

  const thresholdBasisPoints = toThresholdBasisPoints(threshold);
  const isExcessive =
    liveAtomic === 0n
      ? computedAtomic > 0n
      : deltaAtomic * BigInt(PERCENT_BASIS_POINTS) >=
        liveAtomic * thresholdBasisPoints;
  if (!isExcessive) {
    return undefined;
  }

  const ratio = formatBigIntRatio(computedAtomic, liveAtomic);
  const markerDetectedAt = isFiniteNumber(args.detectedAt)
    ? args.detectedAt
    : Date.now();
  const previousDetectedAt = Number(args.previousMarker?.detectedAt);
  const detectedAt = Number.isFinite(previousDetectedAt)
    ? previousDetectedAt
    : markerDetectedAt;
  const lastAttemptedAt = isFiniteNumber(args.lastAttemptedAt)
    ? args.lastAttemptedAt
    : markerDetectedAt;

  return {
    walletId: args.mismatch.walletId,
    reason: 'excessive_balance_mismatch',
    computedAtomic: computedAtomic.toString(),
    liveAtomic: liveAtomic.toString(),
    deltaAtomic: deltaAtomic.toString(),
    ratio,
    threshold,
    detectedAt,
    lastAttemptedAt,
    message: getPortfolioExcessiveBalanceMismatchMessage({
      walletId: args.mismatch.walletId,
      ratio,
      threshold,
    }),
  };
}

function buildBalanceMismatch(args: {
  walletId: string;
  computedAtomic: bigint;
  actualAtomic: bigint;
  unitDecimals: number;
}): PortfolioSnapshotBalanceMismatch | undefined {
  const deltaAtomic = args.computedAtomic - args.actualAtomic;
  if (deltaAtomic === 0n) {
    return undefined;
  }

  return {
    walletId: args.walletId,
    computedAtomic: args.computedAtomic.toString(),
    currentAtomic: args.actualAtomic.toString(),
    deltaAtomic: deltaAtomic.toString(),
    computedUnitsHeld: atomicToUnitString(
      args.computedAtomic,
      args.unitDecimals,
    ),
    currentWalletBalance: atomicToUnitString(
      args.actualAtomic,
      args.unitDecimals,
    ),
    delta: atomicToUnitString(deltaAtomic, args.unitDecimals),
  };
}

const buildPortfolioPopulateDecision = (
  walletId: string,
  shouldPopulate: boolean,
  reason: PortfolioPopulateDecisionReason,
  extras: Partial<PortfolioPopulateDecision> = {},
): PortfolioPopulateDecision => ({
  walletId,
  shouldPopulate,
  reason,
  index: null,
  latestSnapshot: null,
  ...extras,
});

function normalizeUnitDecimalsResolution(
  value: PortfolioUnitDecimalsResolution | number | undefined,
  walletId: string,
): PortfolioUnitDecimalsResolution {
  const unitDecimals = normalizeWalletUnitDecimals(
    typeof value === 'number'
      ? value
      : value && typeof value === 'object' && value.ok === true
      ? typeof value.unitDecimals === 'number'
        ? value.unitDecimals
        : undefined
      : undefined,
  );
  if (typeof unitDecimals === 'number') {
    return {ok: true, unitDecimals};
  }

  if (value && typeof value === 'object' && value.ok === false) {
    return value;
  }

  return {
    ok: false,
    reason: 'invalid_decimals',
    message: getPortfolioInvalidDecimalsMessage(walletId),
  };
}

export async function getPortfolioPopulateDecisionForWallet(args: {
  client: PortfolioRuntimeClient;
  wallet: Wallet;
  unitDecimals: number;
  previousMismatch?: PortfolioSnapshotBalanceMismatch;
}): Promise<PortfolioPopulateDecision> {
  const walletId = String(args.wallet?.id || '').trim();
  const invalidHistory = await args.client.getInvalidHistory({walletId});
  if (invalidHistory) {
    return buildPortfolioPopulateDecision(
      walletId,
      isSnapshotInvalidHistoryRetryDue(invalidHistory),
      'invalid_history',
    );
  }

  const index = await args.client.getSnapshotIndex({walletId});
  if (!index) {
    return buildPortfolioPopulateDecision(walletId, true, 'missing_index');
  }

  const latestSnapshot = await args.client.getLatestSnapshot({walletId});
  if (!latestSnapshot) {
    return buildPortfolioPopulateDecision(walletId, true, 'missing_snapshot', {
      index,
    });
  }

  const snapshotDecisionExtras = {index, latestSnapshot};
  const snapshotAtomic = parseAtomicString(latestSnapshot.cryptoBalance, false);
  if (snapshotAtomic === null) {
    return buildPortfolioPopulateDecision(
      walletId,
      true,
      'invalid_snapshot_balance',
      snapshotDecisionExtras,
    );
  }

  const liveAtomic = getWalletLiveAtomicBalance({
    wallet: args.wallet,
    unitDecimals: args.unitDecimals,
  });
  const mismatch = buildBalanceMismatch({
    walletId,
    computedAtomic: snapshotAtomic,
    actualAtomic: liveAtomic,
    unitDecimals: args.unitDecimals,
  });

  if (mismatch) {
    const extras = {
      ...snapshotDecisionExtras,
      mismatch,
    };
    if (args.previousMismatch?.deltaAtomic === mismatch.deltaAtomic) {
      return buildPortfolioPopulateDecision(
        walletId,
        false,
        'unchanged_balance_mismatch',
        extras,
      );
    }

    return buildPortfolioPopulateDecision(
      walletId,
      true,
      'balance_mismatch',
      extras,
    );
  }

  return buildPortfolioPopulateDecision(
    walletId,
    false,
    'up_to_date',
    snapshotDecisionExtras,
  );
}

export async function getPortfolioPopulateDecisionsForWallets(args: {
  client: PortfolioRuntimeClient;
  wallets: Wallet[];
  getUnitDecimals: (
    wallet: Wallet,
  ) =>
    | Promise<PortfolioUnitDecimalsResolution | number | undefined>
    | PortfolioUnitDecimalsResolution
    | number
    | undefined;
  previousMismatchByWalletId?: WalletIdUpdateMap<PortfolioSnapshotBalanceMismatch>;
  excessiveBalanceMismatchByWalletId?: WalletIdUpdateMap<PortfolioExcessiveBalanceMismatchMarker>;
}): Promise<{
  decisions: PortfolioPopulateDecision[];
  walletIdsToPopulate: string[];
  mismatchByWalletId: WalletIdUpdateMap<PortfolioSnapshotBalanceMismatch>;
  invalidDecimalsByWalletId: WalletIdUpdateMap<PortfolioInvalidDecimalsMarker>;
  excessiveBalanceMismatchByWalletId: WalletIdUpdateMap<PortfolioExcessiveBalanceMismatchMarker>;
}> {
  const decisions: PortfolioPopulateDecision[] = [];
  const walletIdsToPopulate: string[] = [];
  const nowMs = Date.now();
  const mismatchByWalletId: WalletIdUpdateMap<PortfolioSnapshotBalanceMismatch> =
    {};
  const invalidDecimalsByWalletId: WalletIdUpdateMap<PortfolioInvalidDecimalsMarker> =
    {};
  const excessiveBalanceMismatchByWalletId: WalletIdUpdateMap<PortfolioExcessiveBalanceMismatchMarker> =
    {};
  const recordDecision = (decision: PortfolioPopulateDecision) => {
    decisions.push(decision);
    mismatchByWalletId[decision.walletId] = decision.mismatch;
    invalidDecimalsByWalletId[decision.walletId] = decision.invalidDecimals;
    excessiveBalanceMismatchByWalletId[decision.walletId] =
      decision.excessiveBalanceMismatch;
    if (decision.shouldPopulate) {
      walletIdsToPopulate.push(decision.walletId);
    }
  };

  for (const wallet of args.wallets || []) {
    const walletId = String(wallet?.id || '').trim();
    const decimalsResolution = normalizeUnitDecimalsResolution(
      await args.getUnitDecimals(wallet),
      walletId,
    );
    if (!decimalsResolution.ok) {
      const invalidDecimals: PortfolioInvalidDecimalsMarker = {
        walletId,
        reason: 'invalid_decimals',
        message: decimalsResolution.message,
      };
      recordDecision(
        buildPortfolioPopulateDecision(walletId, false, 'invalid_decimals', {
          invalidDecimals,
        }),
      );
      continue;
    }

    const excessiveBalanceMismatch =
      args.excessiveBalanceMismatchByWalletId?.[walletId];
    if (excessiveBalanceMismatch) {
      const retryDue = isPortfolioExcessiveBalanceMismatchRetryDue(
        excessiveBalanceMismatch,
        nowMs,
      );

      recordDecision(
        buildPortfolioPopulateDecision(
          walletId,
          retryDue,
          'excessive_balance_mismatch',
          {
            excessiveBalanceMismatch: retryDue
              ? markPortfolioExcessiveBalanceMismatchAttempted(
                  excessiveBalanceMismatch,
                  nowMs,
                )
              : excessiveBalanceMismatch,
          },
        ),
      );
      continue;
    }

    const decision = await getPortfolioPopulateDecisionForWallet({
      client: args.client,
      wallet,
      unitDecimals: decimalsResolution.unitDecimals,
      previousMismatch: args.previousMismatchByWalletId?.[walletId],
    });
    recordDecision(decision);
  }

  return {
    decisions,
    walletIdsToPopulate,
    mismatchByWalletId,
    invalidDecimalsByWalletId,
    excessiveBalanceMismatchByWalletId,
  };
}
