import type {BalanceSnapshotStored} from '../core/pnl/types';
import type {SnapshotIndexV2} from '../core/pnl/snapshotStore';
import {
  isSnapshotInvalidHistoryRetryDue,
  isSnapshotMarkerRetryDue,
} from '../core/pnl/invalidHistory';
import type {PortfolioRuntimeClient} from '../runtime/portfolioClient';
import type {Wallet} from '../../store/wallet/wallet.models';
import {atomicToUnitString} from '../../utils/helper-methods';
import {
  getPortfolioWalletTokenAddress,
  getWalletLiveAtomicBalance,
} from '../../utils/portfolio/assets';
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
  | 'zero_balance_no_history'
  | 'invalid_snapshot_balance'
  | 'balance_mismatch'
  | 'unchanged_balance_mismatch'
  | 'excessive_balance_mismatch'
  | 'zero_balance_token_missing_index'
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

export type PortfolioZeroBalanceTokenMissingIndexMarker = {
  walletId: string;
  reason: 'zero_balance_token_missing_index';
  tokenAddress: string;
  liveAtomic: '0';
  chain?: string;
  detectedAt: number;
  lastAttemptedAt?: number;
  message: string;
};

export type PortfolioQuarantineMarker =
  | PortfolioExcessiveBalanceMismatchMarker
  | PortfolioZeroBalanceTokenMissingIndexMarker;

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
  quarantine?: PortfolioQuarantineMarker;
};

type WalletIdUpdateMap<T> = {[walletId: string]: T | undefined};

export const getPortfolioInvalidDecimalsMessage = (walletId: string): string =>
  `Wallet ${walletId || 'unknown'} has unresolved token decimals.`;

export const PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_THRESHOLD = 0.1;
export const PORTFOLIO_QUARANTINE_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_RETRY_INTERVAL_MS =
  PORTFOLIO_QUARANTINE_RETRY_INTERVAL_MS;

const PERCENT_BASIS_POINTS = 10_000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isPortfolioQuarantineRetryDue = (
  marker: PortfolioQuarantineMarker | null | undefined,
  nowMs: number = Date.now(),
  retryIntervalMs?: number,
): boolean =>
  isSnapshotMarkerRetryDue(
    marker,
    nowMs,
    retryIntervalMs,
    PORTFOLIO_QUARANTINE_RETRY_INTERVAL_MS,
  );

export const isPortfolioExcessiveBalanceMismatchRetryDue =
  isPortfolioQuarantineRetryDue;

export const markPortfolioQuarantineAttempted = <
  T extends PortfolioQuarantineMarker,
>(
  marker: T,
  lastAttemptedAt: number = Date.now(),
): T => {
  const detectedAt = Number.isFinite(Number(marker.detectedAt))
    ? Number(marker.detectedAt)
    : lastAttemptedAt;

  return {
    ...marker,
    detectedAt,
    lastAttemptedAt,
  };
};

export const markPortfolioExcessiveBalanceMismatchAttempted =
  markPortfolioQuarantineAttempted;

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

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

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
  return `Wallet ${
    args.walletId || 'unknown'
  } snapshot balance differs from live balance by ${args.ratio}x (threshold ${
    Math.round(args.threshold * 10000) / 100
  }%).`;
};

export const getPortfolioZeroBalanceTokenMissingIndexMessage = (args: {
  walletId: string;
  tokenAddress: string;
  populateErrorMessage?: string;
}): string => {
  const populateErrorMessage = String(args.populateErrorMessage || '').trim();
  return `Wallet ${
    args.walletId || 'unknown'
  } is a zero-balance token wallet with no portfolio snapshot index for token ${
    args.tokenAddress || 'unknown'
  }.${
    populateErrorMessage ? ` Last populate error: ${populateErrorMessage}` : ''
  }`;
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
  const absDeltaAtomic = absBigInt(deltaAtomic);
  if (absDeltaAtomic === 0n) {
    return undefined;
  }

  const thresholdBasisPoints = toThresholdBasisPoints(threshold);
  const absLiveAtomic = absBigInt(liveAtomic);
  const isExcessive =
    absLiveAtomic === 0n
      ? absDeltaAtomic > 0n
      : absDeltaAtomic * BigInt(PERCENT_BASIS_POINTS) >=
        absLiveAtomic * thresholdBasisPoints;
  if (!isExcessive) {
    return undefined;
  }

  const ratio = formatBigIntRatio(absDeltaAtomic, absLiveAtomic);
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

export function buildPortfolioZeroBalanceTokenMissingIndexMarker(args: {
  walletId: string;
  wallet: Wallet;
  detectedAt?: number;
  lastAttemptedAt?: number;
  populateErrorMessage?: string;
}): PortfolioZeroBalanceTokenMissingIndexMarker | undefined {
  const walletId = String(args.walletId || '').trim();
  const tokenAddress = getPortfolioWalletTokenAddress(args.wallet);
  if (!walletId || !tokenAddress) {
    return undefined;
  }

  const detectedAt = isFiniteNumber(args.detectedAt)
    ? args.detectedAt
    : Date.now();

  return {
    walletId,
    reason: 'zero_balance_token_missing_index',
    tokenAddress,
    liveAtomic: '0',
    chain: String(args.wallet?.chain || '').trim() || undefined,
    detectedAt,
    lastAttemptedAt: isFiniteNumber(args.lastAttemptedAt)
      ? args.lastAttemptedAt
      : detectedAt,
    message: getPortfolioZeroBalanceTokenMissingIndexMessage({
      walletId,
      tokenAddress,
      populateErrorMessage: args.populateErrorMessage,
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

const buildBalanceMismatchDecision = (args: {
  walletId: string;
  mismatch: PortfolioSnapshotBalanceMismatch;
  previousMismatch?: PortfolioSnapshotBalanceMismatch;
  extras: Partial<PortfolioPopulateDecision>;
}): PortfolioPopulateDecision =>
  buildPortfolioPopulateDecision(
    args.walletId,
    args.previousMismatch?.deltaAtomic !== args.mismatch.deltaAtomic,
    args.previousMismatch?.deltaAtomic === args.mismatch.deltaAtomic
      ? 'unchanged_balance_mismatch'
      : 'balance_mismatch',
    {...args.extras, mismatch: args.mismatch},
  );

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
  forceRetryQuarantined?: boolean;
  zeroBalanceTokenMissingIndexErrorMessage?: string;
}): Promise<PortfolioPopulateDecision> {
  const walletId = String(args.wallet?.id || '').trim();
  const invalidHistory = await args.client.getInvalidHistory({walletId});
  if (invalidHistory) {
    return buildPortfolioPopulateDecision(
      walletId,
      args.forceRetryQuarantined === true ||
        isSnapshotInvalidHistoryRetryDue(invalidHistory),
      'invalid_history',
    );
  }

  const index = await args.client.getSnapshotIndex({walletId});
  if (!index) {
    const liveAtomic = getWalletLiveAtomicBalance({
      wallet: args.wallet,
      unitDecimals: args.unitDecimals,
    });
    if (
      liveAtomic === 0n &&
      getPortfolioWalletTokenAddress(args.wallet) &&
      String(args.zeroBalanceTokenMissingIndexErrorMessage || '').trim()
    ) {
      const quarantine = buildPortfolioZeroBalanceTokenMissingIndexMarker({
        walletId,
        wallet: args.wallet,
        populateErrorMessage: args.zeroBalanceTokenMissingIndexErrorMessage,
      });
      if (quarantine) {
        return buildPortfolioPopulateDecision(
          walletId,
          args.forceRetryQuarantined === true,
          'zero_balance_token_missing_index',
          {quarantine},
        );
      }
    }

    return buildPortfolioPopulateDecision(walletId, true, 'missing_index');
  }

  const latestSnapshot = await args.client.getLatestSnapshot({walletId});
  if (!latestSnapshot) {
    const liveAtomic = getWalletLiveAtomicBalance({
      wallet: args.wallet,
      unitDecimals: args.unitDecimals,
    });
    const checkpointAtomic =
      parseAtomicString(index?.checkpoint?.balanceAtomic, false) ?? 0n;
    const mismatch = buildBalanceMismatch({
      walletId,
      computedAtomic: checkpointAtomic,
      actualAtomic: liveAtomic,
      unitDecimals: args.unitDecimals,
    });
    if (mismatch) {
      return buildBalanceMismatchDecision({
        walletId,
        mismatch,
        previousMismatch: args.previousMismatch,
        extras: {index},
      });
    }

    if (liveAtomic === 0n) {
      return buildPortfolioPopulateDecision(
        walletId,
        false,
        'zero_balance_no_history',
        {index},
      );
    }

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
    return buildBalanceMismatchDecision({
      walletId,
      mismatch,
      previousMismatch: args.previousMismatch,
      extras: snapshotDecisionExtras,
    });
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
  quarantinesByWalletId?: WalletIdUpdateMap<PortfolioQuarantineMarker>;
  zeroBalanceTokenMissingIndexErrorByWalletId?: WalletIdUpdateMap<string>;
  forceRetryQuarantined?: boolean;
}): Promise<{
  decisions: PortfolioPopulateDecision[];
  walletIdsToPopulate: string[];
  mismatchByWalletId: WalletIdUpdateMap<PortfolioSnapshotBalanceMismatch>;
  invalidDecimalsByWalletId: WalletIdUpdateMap<PortfolioInvalidDecimalsMarker>;
  quarantinesByWalletId: WalletIdUpdateMap<PortfolioQuarantineMarker>;
}> {
  const decisions: PortfolioPopulateDecision[] = [];
  const walletIdsToPopulate: string[] = [];
  const nowMs = Date.now();
  const mismatchByWalletId: WalletIdUpdateMap<PortfolioSnapshotBalanceMismatch> =
    {};
  const invalidDecimalsByWalletId: WalletIdUpdateMap<PortfolioInvalidDecimalsMarker> =
    {};
  const quarantinesByWalletId: WalletIdUpdateMap<PortfolioQuarantineMarker> =
    {};
  const recordDecision = (decision: PortfolioPopulateDecision) => {
    decisions.push(decision);
    mismatchByWalletId[decision.walletId] = decision.mismatch;
    invalidDecimalsByWalletId[decision.walletId] = decision.invalidDecimals;
    quarantinesByWalletId[decision.walletId] = decision.quarantine;
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

    const quarantine = args.quarantinesByWalletId?.[walletId];
    const getWalletDecision = () =>
      getPortfolioPopulateDecisionForWallet({
        client: args.client,
        wallet,
        unitDecimals: decimalsResolution.unitDecimals,
        previousMismatch: args.previousMismatchByWalletId?.[walletId],
        forceRetryQuarantined: args.forceRetryQuarantined,
        zeroBalanceTokenMissingIndexErrorMessage:
          args.zeroBalanceTokenMissingIndexErrorByWalletId?.[walletId],
      });
    if (quarantine?.reason === 'zero_balance_token_missing_index') {
      const liveAtomic = getWalletLiveAtomicBalance({
        wallet,
        unitDecimals: decimalsResolution.unitDecimals,
      });
      const tokenAddress = getPortfolioWalletTokenAddress(wallet);
      const index = await args.client.getSnapshotIndex({walletId});

      if (liveAtomic !== 0n || !tokenAddress || index) {
        recordDecision(await getWalletDecision());
        continue;
      }
    }

    if (quarantine) {
      const retryDue =
        args.forceRetryQuarantined === true ||
        isPortfolioQuarantineRetryDue(quarantine, nowMs);

      recordDecision(
        buildPortfolioPopulateDecision(walletId, retryDue, quarantine.reason, {
          quarantine: retryDue
            ? markPortfolioQuarantineAttempted(quarantine, nowMs)
            : quarantine,
        }),
      );
      continue;
    }

    recordDecision(await getWalletDecision());
  }

  return {
    decisions,
    walletIdsToPopulate,
    mismatchByWalletId,
    invalidDecimalsByWalletId,
    quarantinesByWalletId,
  };
}
