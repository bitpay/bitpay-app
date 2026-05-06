import type {BalanceSnapshotStored} from '../core/pnl/types';
import type {SnapshotIndexV2} from '../core/pnl/snapshotStore';
import {isSnapshotInvalidHistoryMarkerActive} from '../core/pnl/invalidHistory';
import type {PortfolioRuntimeClient} from '../runtime/portfolioClient';
import type {Wallet} from '../../store/wallet/wallet.models';
import {atomicToUnitString} from '../../utils/helper-methods';
import {getWalletLiveAtomicBalance} from '../../utils/portfolio/assets';

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
  | 'invalid_history'
  | 'up_to_date';

export type PortfolioPopulateDecision = {
  walletId: string;
  shouldPopulate: boolean;
  reason: PortfolioPopulateDecisionReason;
  index: SnapshotIndexV2 | null;
  latestSnapshot: BalanceSnapshotStored | null;
  mismatch?: PortfolioSnapshotBalanceMismatch;
};

function buildBalanceMismatch(args: {
  walletId: string;
  computedAtomic: bigint;
  actualAtomic: bigint;
  unitDecimals: number;
}): PortfolioSnapshotBalanceMismatch | undefined {
  if (args.computedAtomic === args.actualAtomic) {
    return undefined;
  }

  return {
    walletId: args.walletId,
    computedAtomic: args.computedAtomic.toString(),
    currentAtomic: args.actualAtomic.toString(),
    deltaAtomic: (args.computedAtomic - args.actualAtomic).toString(),
    computedUnitsHeld: atomicToUnitString(
      args.computedAtomic,
      args.unitDecimals,
    ),
    currentWalletBalance: atomicToUnitString(
      args.actualAtomic,
      args.unitDecimals,
    ),
    delta: atomicToUnitString(
      args.computedAtomic - args.actualAtomic,
      args.unitDecimals,
    ),
  };
}

function parseStoredAtomicBalance(value: unknown): bigint | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return BigInt(normalized);
}

export async function getPortfolioPopulateDecisionForWallet(args: {
  client: PortfolioRuntimeClient;
  wallet: Wallet;
  unitDecimals: number;
  previousMismatch?: PortfolioSnapshotBalanceMismatch;
}): Promise<PortfolioPopulateDecision> {
  const walletId = String(args.wallet?.id || '').trim();
  const invalidHistory = await args.client.getInvalidHistory({walletId});
  if (isSnapshotInvalidHistoryMarkerActive(invalidHistory)) {
    return {
      walletId,
      shouldPopulate: false,
      reason: 'invalid_history',
      index: null,
      latestSnapshot: null,
    };
  }

  const index = await args.client.getSnapshotIndex({walletId});
  if (!index) {
    return {
      walletId,
      shouldPopulate: true,
      reason: 'missing_index',
      index: null,
      latestSnapshot: null,
    };
  }

  const latestSnapshot = await args.client.getLatestSnapshot({walletId});
  if (!latestSnapshot) {
    return {
      walletId,
      shouldPopulate: true,
      reason: 'missing_snapshot',
      index,
      latestSnapshot: null,
    };
  }

  const snapshotAtomic = parseStoredAtomicBalance(latestSnapshot.cryptoBalance);
  if (snapshotAtomic === null) {
    return {
      walletId,
      shouldPopulate: true,
      reason: 'invalid_snapshot_balance',
      index,
      latestSnapshot,
    };
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
    if (args.previousMismatch?.deltaAtomic === mismatch.deltaAtomic) {
      return {
        walletId,
        shouldPopulate: false,
        reason: 'unchanged_balance_mismatch',
        index,
        latestSnapshot,
        mismatch,
      };
    }

    return {
      walletId,
      shouldPopulate: true,
      reason: 'balance_mismatch',
      index,
      latestSnapshot,
      mismatch,
    };
  }

  return {
    walletId,
    shouldPopulate: false,
    reason: 'up_to_date',
    index,
    latestSnapshot,
  };
}

export async function getPortfolioPopulateDecisionsForWallets(args: {
  client: PortfolioRuntimeClient;
  wallets: Wallet[];
  getUnitDecimals: (wallet: Wallet) => Promise<number> | number;
  previousMismatchByWalletId?: {
    [walletId: string]: PortfolioSnapshotBalanceMismatch | undefined;
  };
}): Promise<{
  decisions: PortfolioPopulateDecision[];
  walletIdsToPopulate: string[];
  mismatchByWalletId: {
    [walletId: string]: PortfolioSnapshotBalanceMismatch | undefined;
  };
}> {
  const decisions: PortfolioPopulateDecision[] = [];
  const walletIdsToPopulate: string[] = [];
  const mismatchByWalletId: {
    [walletId: string]: PortfolioSnapshotBalanceMismatch | undefined;
  } = {};

  for (const wallet of args.wallets || []) {
    const unitDecimals = await args.getUnitDecimals(wallet);
    const decision = await getPortfolioPopulateDecisionForWallet({
      client: args.client,
      wallet,
      unitDecimals,
      previousMismatch:
        args.previousMismatchByWalletId?.[String(wallet?.id || '').trim()],
    });
    decisions.push(decision);
    mismatchByWalletId[decision.walletId] = decision.mismatch;
    if (decision.shouldPopulate) {
      walletIdsToPopulate.push(decision.walletId);
    }
  }

  return {
    decisions,
    walletIdsToPopulate,
    mismatchByWalletId,
  };
}
