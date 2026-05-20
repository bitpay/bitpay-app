import type {Effect, RootState} from '..';
import type {AppDispatch} from '../../utils/hooks';
import type {Key, Wallet} from '../wallet/wallet.models';
import {DeviceEventEmitter} from 'react-native';
import {GetPrecision} from '../wallet/utils/currency';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {
  getVisibleWalletsFromKeys,
  sortWalletsByAssetFiatPriority,
} from '../../utils/portfolio/assets';
import {
  PortfolioPopulateService,
  buildPortfolioExcessiveBalanceMismatchMarker,
  getPortfolioPopulateDecisionsForWallets,
  getPortfolioInvalidDecimalsMessage,
  type PortfolioPopulateDecision,
  type PortfolioSnapshotBalanceMismatch,
  type PortfolioUnitDecimalsResolution,
} from '../../portfolio/service';
import type {PortfolioPopulateJobStatus} from '../../portfolio/core/engine/populateJob';
import type {StoredWallet} from '../../portfolio/core/types';
import type {SnapshotPersistDebugMode} from '../../portfolio/core/pnl/snapshotStore';
import {getPortfolioRuntimeClient} from '../../portfolio/runtime/portfolioRuntime';
import {clearAssetPnlSummaryCache} from '../../portfolio/ui/assetPnlSummaryCache';
import {waitForStartupWalletStoreInitForPortfolio} from '../wallet/effects/init/init';
import {
  isPortfolioRuntimeEligibleWallet,
  resolvePortfolioWalletUnitDecimalsFromPrecision,
  toPortfolioStoredWallet,
} from '../../portfolio/adapters/rn/walletMappers';
import {logManager} from '../../managers/LogManager';
import {
  cancelPopulatePortfolio,
  clearPortfolio,
  clearWalletPortfolioState,
  failPopulatePortfolio,
  finishPopulatePortfolio,
  markInitialBaselineComplete,
  setInvalidDecimalsByWalletIdUpdates,
  setQuarantinesByWalletIdUpdates,
  setSnapshotBalanceMismatchesByWalletIdUpdates,
  startPopulatePortfolio,
  updatePopulateProgress,
} from './portfolio.actions';
import type {
  InvalidDecimalsMarker,
  PortfolioQuarantineMarker,
  WalletIdMap,
} from './portfolio.models';

let activeRuntimePopulateService: PortfolioPopulateService | undefined;
let deferredPortfolioUnlockSubscription: {remove: () => void} | undefined;
let deferredPortfolioWorkUntilUnlock: Array<() => unknown> = [];
let pendingScopedPopulateRequest:
  | {
      walletIds: Set<string>;
      walletsById: Map<string, Wallet>;
      quoteCurrency?: string;
      forceRetryQuarantined?: boolean;
      runPopulateDecision?: boolean;
    }
  | undefined;

type PortfolioQuarantineRetryOptions = {
  forceRetryQuarantined?: boolean;
};

type PopulatePortfolioWithRuntimeArgs = {
  wallets?: Wallet[];
  walletIds?: string[];
  quoteCurrency?: string;
  snapshotDebugMode?: SnapshotPersistDebugMode;
  completesInitialBaseline?: boolean;
} & PortfolioQuarantineRetryOptions;

type MaybePopulatePortfolioForWalletsWithRuntimeArgs = {
  wallets?: Wallet[];
  walletIds?: string[];
  quoteCurrency?: string;
} & PortfolioQuarantineRetryOptions;

type MaybePopulatePortfolioOnAppLaunchWithRuntimeArgs = {
  quoteCurrency?: string;
} & PortfolioQuarantineRetryOptions;

const resolveQuoteCurrency = (
  ...candidates: Array<string | undefined>
): string => {
  const candidate = candidates.find(v => typeof v === 'string' && v.length);
  return (candidate || 'USD').toUpperCase();
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const getWalletIdsForRedaction = (
  walletIds: Iterable<string | null | undefined>,
): string[] =>
  Array.from(
    new Set(
      Array.from(walletIds)
        .map(walletId => String(walletId || '').trim())
        .filter(walletId => walletId.length > 0),
    ),
  ).sort((a, b) => b.length - a.length);

const redactWalletIdsFromMessage = (
  value: string,
  walletIds: string[],
): string =>
  walletIds.reduce(
    (redacted, walletId) => redacted.split(walletId).join('[redacted]'),
    value,
  );

const warnPortfolioWithRedactedWalletIds = (args: {
  messages: string[];
  walletIds: Iterable<string | null | undefined>;
}): void => {
  const localMessage = args.messages.join(' ');
  const walletIdsToRedact = getWalletIdsForRedaction(args.walletIds);
  logManager.warnWithSentryMessage(
    localMessage,
    redactWalletIdsFromMessage(localMessage, walletIdsToRedact),
  );
};

type ImportedKeyPortfolioLogger = {
  error: (message: string) => void;
};

const toImportedKeyPortfolioErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : JSON.stringify(error);

const getImportedKeyWalletsFromState = (args: {
  state: RootState;
  keyId: string;
  walletIds: string[];
}): Wallet[] => {
  const wantedWalletIds = new Set(args.walletIds);
  if (!args.keyId || !wantedWalletIds.size) {
    return [];
  }

  const key = args.state.WALLET?.keys?.[args.keyId];
  const wallets = Array.isArray(key?.wallets) ? key.wallets : [];
  return wallets.filter(wallet => wantedWalletIds.has(wallet.id));
};

const populateImportedKeyPortfolioWithRuntime =
  (args: {keyId: string; walletIds: string[]}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const wallets = getImportedKeyWalletsFromState({
      state: getState(),
      keyId: args.keyId,
      walletIds: args.walletIds,
    });

    if (!wallets.length) {
      return;
    }

    if (!hasCompletedInitialPortfolioBaseline(getState())) {
      await dispatch(maybePopulatePortfolioOnAppLaunchWithRuntime());
      return;
    }

    await dispatch(populatePortfolioWithRuntime({wallets}));
  };

export const populateImportedKeyPortfolio = ({
  dispatch,
  key,
  logger,
}: {
  dispatch: AppDispatch;
  key: Key;
  logger: ImportedKeyPortfolioLogger;
}): void => {
  const walletIds = key.wallets
    .map(wallet => wallet.id)
    .filter((walletId): walletId is string => !!walletId);

  if (!walletIds.length) {
    return;
  }

  try {
    const result = dispatch(
      populateImportedKeyPortfolioWithRuntime({keyId: key.id, walletIds}),
    );
    void Promise.resolve(result).catch(error => {
      const errMsg = toImportedKeyPortfolioErrorMessage(error);
      logger.error(`[portfolio] Failed populating imported key: ${errMsg}`);
    });
  } catch (error) {
    const errMsg = toImportedKeyPortfolioErrorMessage(error);
    logger.error(`[portfolio] Failed populating imported key: ${errMsg}`);
  }
};

const formatPopulateWalletError = (error: {
  walletId?: string;
  message?: string;
}): string => {
  const walletId = String(error.walletId || '').trim();
  const message = String(error.message || '').trim() || 'Unknown wallet error';
  return walletId ? `${walletId}: ${message}` : message;
};

const buildPopulateStopReason = (args: {
  errors: Array<{walletId: string; message: string}>;
  requestedWalletCount: number;
  completedWalletCount: number;
}): string => {
  if (args.errors.length) {
    const lastError = formatPopulateWalletError(
      args.errors[args.errors.length - 1],
    );
    if (args.errors.length === 1) {
      return `completed with wallet error: ${lastError}`;
    }

    return `completed with ${args.errors.length} wallet errors; last: ${lastError}`;
  }

  if (
    args.requestedWalletCount > 0 &&
    args.completedWalletCount < args.requestedWalletCount
  ) {
    return `completed after ${args.completedWalletCount}/${args.requestedWalletCount} wallets`;
  }

  return 'completed';
};

const logPopulateWalletErrors = (args: {
  errors: Array<{walletId: string; message: string}>;
  requestedWalletCount: number;
  quoteCurrency: string;
  status: PortfolioPopulateJobStatus;
}): void => {
  if (!args.errors.length) {
    return;
  }

  const walletIdsToRedact = getWalletIdsForRedaction(
    args.errors.map(error => error.walletId),
  );
  const localPayload = {
    completedWalletCount: args.status.walletsCompleted,
    errorCount: args.errors.length,
    errors: args.errors.map((error, index) => ({
      index,
      message: String(error.message || ''),
      walletId: String(error.walletId || ''),
    })),
    jobId: args.status.jobId,
    quoteCurrency: args.quoteCurrency,
    requestedWalletCount: args.requestedWalletCount,
    state: args.status.state,
    txRequestsMade: args.status.txRequestsMade,
    txsProcessed: args.status.txsProcessed,
    walletsTotal: args.status.walletsTotal,
  };
  const sentryPayload = {
    ...localPayload,
    errors: localPayload.errors.map(error => ({
      ...error,
      message: redactWalletIdsFromMessage(error.message, walletIdsToRedact),
      walletId: error.walletId ? '[redacted]' : '',
    })),
  };
  const message = '[portfolio] Populate completed with wallet errors';

  logManager.warnWithSentryMessage(
    `${message} ${JSON.stringify(localPayload)}`,
    `${message} ${JSON.stringify(sentryPayload)}`,
  );
};

const dispatchPopulateProgressStatus = (args: {
  dispatch: any;
  status: PortfolioPopulateJobStatus;
  reportedErrorKeys: Set<string>;
}): void => {
  const nextErrors = (args.status.errors || []).filter(error => {
    const key = `${String(error.walletId || '')}::${String(
      error.message || '',
    )}`;
    if (args.reportedErrorKeys.has(key)) {
      return false;
    }
    args.reportedErrorKeys.add(key);
    return true;
  });

  args.dispatch(
    updatePopulateProgress({
      currentWalletId: args.status.currentWalletId,
      walletsTotal: args.status.walletsTotal,
      walletsCompleted: args.status.walletsCompleted,
      txRequestsMade: args.status.txRequestsMade,
      txsProcessed: args.status.txsProcessed,
      walletStatusByIdUpdates: args.status.walletStatusById,
      errorsToAdd: nextErrors.length ? nextErrors : undefined,
    }),
  );
};

const normalizeWalletIds = (walletIds?: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const walletId of walletIds || []) {
    if (typeof walletId !== 'string' || !walletId || seen.has(walletId)) {
      continue;
    }
    seen.add(walletId);
    result.push(walletId);
  }

  return result;
};

const getWalletsToPopulateAfterQuarantinePreparation = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  decisions: PortfolioPopulateDecision[];
  walletIdsToPopulate: string[];
  wallets: Wallet[];
}): Promise<Wallet[]> => {
  if (!args.walletIdsToPopulate.length) {
    return [];
  }

  const repairWalletIds = normalizeWalletIds(
    args.decisions.flatMap(decision =>
      decision.reason === 'excessive_balance_mismatch' &&
      decision.shouldPopulate
        ? [decision.walletId]
        : [],
    ),
  );
  const failedRepairWalletIds = new Set<string>();
  if (repairWalletIds.length) {
    const results = await Promise.allSettled(
      repairWalletIds.map(walletId => args.client.clearWallet({walletId})),
    );

    results.forEach((result, index) => {
      if (result.status !== 'rejected') {
        return;
      }

      const walletId = repairWalletIds[index];
      failedRepairWalletIds.add(walletId);
      warnPortfolioWithRedactedWalletIds({
        messages: [
          `[portfolio] Failed clearing runtime wallet snapshots before excessive balance mismatch repair for ${walletId}: ${toErrorMessage(
            result.reason,
          )}`,
        ],
        walletIds: [walletId],
      });
    });
  }

  return args.wallets.filter(
    wallet =>
      args.walletIdsToPopulate.includes(wallet.id) &&
      !failedRepairWalletIds.has(wallet.id),
  );
};

const getScopedPopulateWalletIdsFromArgs = (
  args?: PopulatePortfolioWithRuntimeArgs,
): string[] =>
  normalizeWalletIds([
    ...(Array.isArray(args?.walletIds) ? args.walletIds : []),
    ...(Array.isArray(args?.wallets)
      ? args.wallets.map(wallet => wallet?.id)
      : []),
  ]);

const queueScopedPopulateRequest = (
  args?: PopulatePortfolioWithRuntimeArgs,
  options?: {runPopulateDecision?: boolean},
): boolean => {
  if (!args?.wallets && !args?.walletIds) {
    return false;
  }

  const walletIds = getScopedPopulateWalletIdsFromArgs(args);
  if (!walletIds.length) {
    return false;
  }

  if (!pendingScopedPopulateRequest) {
    pendingScopedPopulateRequest = {
      walletIds: new Set<string>(),
      walletsById: new Map<string, Wallet>(),
      runPopulateDecision: options?.runPopulateDecision === true,
    };
  } else if (options?.runPopulateDecision !== true) {
    pendingScopedPopulateRequest.runPopulateDecision = false;
  }

  walletIds.forEach(walletId => {
    pendingScopedPopulateRequest?.walletIds.add(walletId);
  });

  if (Array.isArray(args.wallets)) {
    args.wallets.forEach(wallet => {
      const walletId = String(wallet?.id || '').trim();
      if (walletId) {
        pendingScopedPopulateRequest?.walletsById.set(walletId, wallet);
      }
    });
  }

  if (args.quoteCurrency) {
    pendingScopedPopulateRequest.quoteCurrency = args.quoteCurrency;
  }

  if (args.forceRetryQuarantined === true) {
    pendingScopedPopulateRequest.forceRetryQuarantined = true;
  }

  return true;
};

const takePendingScopedPopulateRequest = ():
  | (PopulatePortfolioWithRuntimeArgs & {runPopulateDecision?: boolean})
  | undefined => {
  const pending = pendingScopedPopulateRequest;
  pendingScopedPopulateRequest = undefined;

  const walletIds = normalizeWalletIds(Array.from(pending?.walletIds || []));
  if (!walletIds.length) {
    return undefined;
  }

  const wallets: Wallet[] = [];
  const walletIdsToResolveFromState: string[] = [];
  walletIds.forEach(walletId => {
    const wallet = pending?.walletsById.get(walletId);
    if (wallet) {
      wallets.push(wallet);
    } else {
      walletIdsToResolveFromState.push(walletId);
    }
  });

  return {
    ...(wallets.length ? {wallets} : {}),
    ...(walletIdsToResolveFromState.length
      ? {walletIds: walletIdsToResolveFromState}
      : {}),
    quoteCurrency: pending?.quoteCurrency,
    ...(pending?.forceRetryQuarantined === true
      ? {forceRetryQuarantined: true}
      : {}),
    ...(pending?.runPopulateDecision === true
      ? {runPopulateDecision: true}
      : {}),
  };
};

const drainPendingScopedPopulateRequests = async (
  dispatch: any,
  getState: () => RootState,
  options?: {refreshQuoteCurrencyFromState?: boolean},
): Promise<void> => {
  const pending = takePendingScopedPopulateRequest();
  if (!pending) {
    return;
  }

  const state = getState();
  if (!isPortfolioEnabled(state)) {
    return;
  }

  if (options?.refreshQuoteCurrencyFromState) {
    pending.quoteCurrency = resolveQuoteCurrency(
      state.APP?.defaultAltCurrency?.isoCode,
      state.PORTFOLIO?.quoteCurrency,
      pending.quoteCurrency,
    );
  }

  if (state.PORTFOLIO?.populateStatus?.inProgress) {
    queueScopedPopulateRequest(pending, {
      runPopulateDecision: pending.runPopulateDecision,
    });
    return;
  }

  if (pending.runPopulateDecision) {
    await dispatch(
      maybePopulatePortfolioForWalletsWithRuntime({
        wallets: pending.wallets,
        walletIds: pending.walletIds,
        quoteCurrency: pending.quoteCurrency,
        forceRetryQuarantined: pending.forceRetryQuarantined,
      }),
    );
    return;
  }

  await dispatch(
    populatePortfolioWithRuntime({
      wallets: pending.wallets,
      walletIds: pending.walletIds,
      quoteCurrency: pending.quoteCurrency,
      forceRetryQuarantined: pending.forceRetryQuarantined,
    }),
  );
};

const drainPendingScopedPopulateRequestsAfterRuntimeStop = async (
  dispatch: any,
  getState: () => RootState,
): Promise<void> => {
  if (!pendingScopedPopulateRequest?.walletIds.size) {
    return;
  }

  const didStop = await waitForRuntimePopulateToStop({
    timeoutMs: RUNTIME_MUTATION_WAIT_TIMEOUT_MS,
    pollMs: RUNTIME_MUTATION_POLL_MS,
  });
  if (!didStop) {
    const dropped = takePendingScopedPopulateRequest();
    const droppedWalletIds = getScopedPopulateWalletIdsFromArgs(dropped);
    warnPortfolioWithRedactedWalletIds({
      messages: [
        '[portfolio] Dropped pending scoped populate after cancelled populate did not stop before timeout',
        JSON.stringify({walletIds: droppedWalletIds}),
      ],
      walletIds: droppedWalletIds,
    });
    return;
  }

  await drainPendingScopedPopulateRequests(dispatch, getState, {
    refreshQuoteCurrencyFromState: true,
  });
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, Math.max(0, Math.floor(ms)), undefined);
  });

const shouldWaitForAppUnlockBeforePortfolioWork = (state: RootState): boolean =>
  !!(state.APP?.pinLockActive || state.APP?.biometricLockActive) &&
  !Number.isFinite(Number(state.APP?.lockAuthorizedUntil));

const deferPortfolioWorkUntilAppUnlock = (work: () => unknown): void => {
  deferredPortfolioWorkUntilUnlock.push(work);

  if (deferredPortfolioUnlockSubscription) {
    return;
  }

  deferredPortfolioUnlockSubscription = DeviceEventEmitter.addListener(
    DeviceEmitterEvents.APP_LOCK_MODAL_DISMISSED,
    async () => {
      deferredPortfolioUnlockSubscription?.remove();
      deferredPortfolioUnlockSubscription = undefined;
      const deferredWork = deferredPortfolioWorkUntilUnlock;
      deferredPortfolioWorkUntilUnlock = [];

      await delay(3000);

      deferredWork.forEach(runDeferredWork => {
        try {
          const result = runDeferredWork();
          void Promise.resolve(result).catch(error => {
            logManager.warn(
              `[portfolio] Failed running deferred portfolio work after unlock: ${toErrorMessage(
                error,
              )}`,
            );
          });
        } catch (error: unknown) {
          logManager.warn(
            `[portfolio] Failed running deferred portfolio work after unlock: ${toErrorMessage(
              error,
            )}`,
          );
        }
      });
    },
  );
};

export const clearPortfolioRuntimeUnlockDeferralForTests = (): void => {
  deferredPortfolioUnlockSubscription?.remove();
  deferredPortfolioUnlockSubscription = undefined;
  deferredPortfolioWorkUntilUnlock = [];
  pendingScopedPopulateRequest = undefined;
};

const RUNTIME_MUTATION_WAIT_TIMEOUT_MS = 15000;
const RUNTIME_MUTATION_POLL_MS = 100;
const ACTIVE_RUNTIME_POPULATE_MUTATION_ERROR_PATTERN =
  /background populate job is running/i;

const resolveRuntimeMutationWaitOptions = (args?: {
  timeoutMs?: number;
  pollMs?: number;
}) => ({
  timeoutMs:
    typeof args?.timeoutMs === 'number' && Number.isFinite(args.timeoutMs)
      ? Math.max(0, Math.floor(args.timeoutMs))
      : RUNTIME_MUTATION_WAIT_TIMEOUT_MS,
  pollMs:
    typeof args?.pollMs === 'number' && Number.isFinite(args.pollMs)
      ? Math.max(50, Math.floor(args.pollMs))
      : RUNTIME_MUTATION_POLL_MS,
});

const requestRuntimePopulateCancel = (): void => {
  void getPortfolioRuntimeClient()
    .cancelPopulateJob({})
    .catch(() => undefined);
};

const waitForRuntimePopulateToStop = async (args?: {
  timeoutMs?: number;
  pollMs?: number;
}): Promise<boolean> => {
  const {timeoutMs, pollMs} = resolveRuntimeMutationWaitOptions(args);
  const deadline = Date.now() + timeoutMs;
  const client = getPortfolioRuntimeClient();

  while (Date.now() <= deadline) {
    try {
      const status = await client.getPopulateJobStatus({});
      if (!status?.inProgress) {
        return true;
      }
    } catch {
      // Keep polling until timeout; transient runtime errors during shutdown
      // should not make us assume the populate job has fully stopped.
    }

    await delay(pollMs);
  }

  return false;
};

const isActiveRuntimePopulateMutationError = (error: unknown): boolean =>
  ACTIVE_RUNTIME_POPULATE_MUTATION_ERROR_PATTERN.test(toErrorMessage(error));

const clearRuntimeStorageAfterPopulateStops = async (
  clear: () => Promise<void>,
): Promise<void> => {
  const deadline = Date.now() + RUNTIME_MUTATION_WAIT_TIMEOUT_MS;

  await waitForRuntimePopulateToStop({
    timeoutMs: RUNTIME_MUTATION_WAIT_TIMEOUT_MS,
    pollMs: RUNTIME_MUTATION_POLL_MS,
  });

  let lastError: unknown;
  while (Date.now() <= deadline) {
    try {
      await clear();
      return;
    } catch (error: unknown) {
      lastError = error;
      if (!isActiveRuntimePopulateMutationError(error)) {
        throw error;
      }
    }

    requestRuntimePopulateCancel();

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await delay(Math.min(RUNTIME_MUTATION_POLL_MS, remainingMs));
  }

  throw (
    lastError ??
    new Error(
      'Timed out clearing runtime portfolio storage while a background populate job was stopping.',
    )
  );
};

const cancelActiveRuntimePopulateIfNeeded = (
  dispatch: any,
  state?: RootState,
): boolean => {
  if (!state?.PORTFOLIO?.populateStatus?.inProgress) {
    return false;
  }

  activeRuntimePopulateService?.cancel();
  requestRuntimePopulateCancel();
  activeRuntimePopulateService = undefined;
  dispatch(cancelPopulatePortfolio());
  return true;
};

const isPortfolioEnabled = (state: RootState): boolean =>
  state.APP?.showPortfolioValue === true;

const hasCompletedInitialPortfolioBaseline = (state: RootState): boolean =>
  typeof state.PORTFOLIO?.lastFullPopulateCompletedAt === 'number' &&
  Number.isFinite(state.PORTFOLIO.lastFullPopulateCompletedAt);

const isSettledInitialBaselineNoopDecision = (
  decision: PortfolioPopulateDecision,
): boolean =>
  decision.reason === 'up_to_date' ||
  decision.reason === 'unchanged_balance_mismatch' ||
  decision.reason === 'zero_balance_no_history' ||
  decision.reason === 'invalid_history' ||
  decision.reason === 'invalid_decimals' ||
  decision.reason === 'excessive_balance_mismatch' ||
  decision.reason === 'zero_balance_token_missing_index';

const dispatchWalletIdMapUpdates = <T>(
  dispatch: any,
  updates: WalletIdMap<T> | undefined,
  actionCreator: (updates: WalletIdMap<T>) => unknown,
): void => {
  if (updates && Object.keys(updates).length) {
    dispatch(actionCreator(updates));
  }
};

type PortfolioMarkerUpdates = {
  invalidDecimalsByWalletId: WalletIdMap<InvalidDecimalsMarker>;
  quarantinesByWalletId: WalletIdMap<PortfolioQuarantineMarker>;
};

const dispatchPortfolioMarkerUpdates = (
  dispatch: any,
  updates: PortfolioMarkerUpdates,
): void => {
  dispatchWalletIdMapUpdates(
    dispatch,
    updates.invalidDecimalsByWalletId,
    setInvalidDecimalsByWalletIdUpdates,
  );
  dispatchWalletIdMapUpdates(
    dispatch,
    updates.quarantinesByWalletId,
    setQuarantinesByWalletIdUpdates,
  );
};

const canMarkInitialBaselineCompleteFromDecisions = (args: {
  decisions: PortfolioPopulateDecision[];
  eligibleWalletCount: number;
  walletIdsToPopulate: string[];
}): boolean =>
  !args.walletIdsToPopulate.length &&
  (!args.eligibleWalletCount ||
    (args.decisions.length === args.eligibleWalletCount &&
      args.decisions.every(isSettledInitialBaselineNoopDecision)));

const isMainnetLikeWallet = (wallet: Wallet): boolean => {
  const network = String(wallet?.network || '')
    .trim()
    .toLowerCase();
  return network === 'livenet' || network === 'mainnet';
};

const getVisibleMainnetWalletsFromState = (state: RootState): Wallet[] => {
  const keys = state.WALLET?.keys || {};
  const homeCarouselConfig = state.APP?.homeCarouselConfig;

  return getVisibleWalletsFromKeys(keys, homeCarouselConfig).filter(
    isMainnetLikeWallet,
  );
};

const getWalletsFromState = (state: RootState): Wallet[] =>
  Object.values(state.WALLET?.keys || {}).flatMap((key: any) =>
    Array.isArray(key?.wallets) ? key.wallets : [],
  );

const getAllMainnetWalletsFromState = (state: RootState): Wallet[] =>
  getWalletsFromState(state).filter(isMainnetLikeWallet);

const getMainnetWalletsByIdsFromState = (
  state: RootState,
  walletIds: string[],
): Wallet[] => {
  const wantedWalletIds = new Set(normalizeWalletIds(walletIds));
  if (!wantedWalletIds.size) {
    return [];
  }

  const out: Wallet[] = [];
  const seen = new Set<string>();

  getAllMainnetWalletsFromState(state).forEach(wallet => {
    const walletId = String(wallet?.id || '').trim();
    if (!walletId || seen.has(walletId) || !wantedWalletIds.has(walletId)) {
      return;
    }

    seen.add(walletId);
    out.push(wallet);
  });

  return out;
};

const getAllMainnetWalletIdsFromState = (state: RootState): string[] =>
  normalizeWalletIds(
    getAllMainnetWalletsFromState(state).map(wallet =>
      String(wallet?.id || '').trim(),
    ),
  );

const resolvePopulateWallets = (args: {
  state: RootState;
  wallets?: Wallet[];
  walletIds?: string[];
}): Wallet[] => {
  const walletIdsFilter = Array.isArray(args.walletIds)
    ? new Set(normalizeWalletIds(args.walletIds))
    : undefined;

  if (Array.isArray(args.wallets)) {
    const seen = new Set<string>();
    const out: Wallet[] = [];
    const addWallet = (wallet: Wallet) => {
      const walletId = String(wallet?.id || '').trim();
      if (!walletId || seen.has(walletId) || !isMainnetLikeWallet(wallet)) {
        return;
      }

      seen.add(walletId);
      out.push(wallet);
    };

    args.wallets.forEach(addWallet);
    if (walletIdsFilter?.size) {
      getMainnetWalletsByIdsFromState(
        args.state,
        Array.from(walletIdsFilter),
      ).forEach(addWallet);
    }

    return out;
  }

  const providedWallets = Array.isArray(args.wallets)
    ? args.wallets
    : getVisibleMainnetWalletsFromState(args.state);

  return providedWallets
    .filter(wallet => !walletIdsFilter || walletIdsFilter.has(wallet.id))
    .filter(isMainnetLikeWallet);
};

const resolveWalletUnitDecimalsForPortfolio = (
  dispatch: any,
  wallet: Wallet,
): PortfolioUnitDecimalsResolution => {
  const precision = dispatch(
    GetPrecision(
      wallet.currencyAbbreviation,
      wallet.chain,
      wallet.tokenAddress,
    ),
  );
  const unitDecimals = resolvePortfolioWalletUnitDecimalsFromPrecision({
    wallet,
    precisionUnitDecimals: precision?.unitDecimals,
  });
  if (typeof unitDecimals === 'number') {
    return {ok: true, unitDecimals};
  }

  const walletId = String(wallet?.id || '').trim();
  return {
    ok: false,
    reason: 'invalid_decimals',
    message: getPortfolioInvalidDecimalsMessage(walletId),
  };
};

const getPortfolioPopulateDecisionsForRuntimeWallets = (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  dispatch: any;
  state: RootState;
  wallets: Wallet[];
  forceRetryQuarantined?: boolean;
}) =>
  getPortfolioPopulateDecisionsForWallets({
    client: args.client,
    wallets: args.wallets,
    getUnitDecimals: wallet =>
      resolveWalletUnitDecimalsForPortfolio(args.dispatch, wallet),
    previousMismatchByWalletId:
      args.state.PORTFOLIO?.snapshotBalanceMismatchesByWalletId,
    quarantinesByWalletId: args.state.PORTFOLIO?.quarantinesByWalletId,
    forceRetryQuarantined: args.forceRetryQuarantined,
  });

const getWalletById = (wallets: Wallet[]): Map<string, Wallet> =>
  wallets.reduce((walletById, wallet) => {
    const walletId = String(wallet?.id || '').trim();
    if (walletId) {
      walletById.set(walletId, wallet);
    }
    return walletById;
  }, new Map<string, Wallet>());

type SnapshotBalanceHealthUpdates = {
  mismatchByWalletId: WalletIdMap<PortfolioSnapshotBalanceMismatch>;
  quarantinesByWalletId: WalletIdMap<PortfolioQuarantineMarker>;
};

const createEmptySnapshotBalanceHealthUpdates =
  (): SnapshotBalanceHealthUpdates => ({
    mismatchByWalletId: {},
    quarantinesByWalletId: {},
  });

const buildSnapshotBalanceHealthUpdatesAfterPopulate = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  dispatch: any;
  previousMismatchByWalletId?: WalletIdMap<PortfolioSnapshotBalanceMismatch>;
  previousQuarantinesByWalletId?: WalletIdMap<PortfolioQuarantineMarker>;
  walletIds: string[];
  wallets: Wallet[];
}): Promise<SnapshotBalanceHealthUpdates> => {
  const walletIds = normalizeWalletIds(args.walletIds);
  if (!walletIds.length) {
    return createEmptySnapshotBalanceHealthUpdates();
  }

  const walletById = getWalletById(args.wallets);
  const completedWallets = walletIds
    .map(walletId => walletById.get(walletId))
    .filter((wallet): wallet is Wallet => !!wallet);
  if (!completedWallets.length) {
    return createEmptySnapshotBalanceHealthUpdates();
  }

  const decisions = await getPortfolioPopulateDecisionsForWallets({
    client: args.client,
    wallets: completedWallets,
    getUnitDecimals: wallet =>
      resolveWalletUnitDecimalsForPortfolio(args.dispatch, wallet),
    previousMismatchByWalletId: args.previousMismatchByWalletId,
  });

  const updates = createEmptySnapshotBalanceHealthUpdates();
  const detectedAt = Date.now();

  decisions.decisions.forEach(decision => {
    if (decision.mismatch) {
      const previousQuarantine =
        args.previousQuarantinesByWalletId?.[decision.walletId];
      const previousExcessiveMarker =
        previousQuarantine?.reason === 'excessive_balance_mismatch'
          ? previousQuarantine
          : undefined;
      updates.mismatchByWalletId[decision.walletId] = decision.mismatch;
      updates.quarantinesByWalletId[decision.walletId] =
        buildPortfolioExcessiveBalanceMismatchMarker({
          mismatch: decision.mismatch,
          detectedAt,
          previousMarker: previousExcessiveMarker,
        });
      return;
    }

    if (decision.quarantine) {
      updates.mismatchByWalletId[decision.walletId] = undefined;
      updates.quarantinesByWalletId[decision.walletId] = decision.quarantine;
      return;
    }

    if (
      decision.reason === 'up_to_date' ||
      decision.reason === 'zero_balance_no_history'
    ) {
      updates.mismatchByWalletId[decision.walletId] = undefined;
      updates.quarantinesByWalletId[decision.walletId] = undefined;
    }
  });

  return updates;
};

const getDoneWalletIdsFromPopulateStatus = (
  status?: PortfolioPopulateJobStatus,
): string[] =>
  normalizeWalletIds(
    Object.entries(status?.walletStatusById || {}).flatMap(
      ([walletId, walletStatus]) => (walletStatus === 'done' ? [walletId] : []),
    ),
  );

const getErrorMessageByWalletIdFromPopulateStatus = (
  status?: PortfolioPopulateJobStatus,
): WalletIdMap<string> => {
  const errorMessageByWalletId: WalletIdMap<string> = {};

  (status?.errors || []).forEach(error => {
    const walletId = String(error?.walletId || '').trim();
    if (!walletId) {
      return;
    }

    errorMessageByWalletId[walletId] =
      String(error?.message || '').trim() ||
      'Portfolio populate failed for wallet.';
  });

  Object.entries(status?.walletStatusById || {}).forEach(
    ([walletId, walletStatus]) => {
      const normalizedWalletId = String(walletId || '').trim();
      if (
        !normalizedWalletId ||
        walletStatus !== 'error' ||
        errorMessageByWalletId[normalizedWalletId]
      ) {
        return;
      }

      errorMessageByWalletId[normalizedWalletId] =
        'Portfolio populate failed for wallet.';
    },
  );

  return errorMessageByWalletId;
};

const maskUncheckedDoneWalletStatuses = (args: {
  healthCheckedWalletIds: Set<string>;
  status: PortfolioPopulateJobStatus;
}): PortfolioPopulateJobStatus => {
  const walletStatusById = args.status.walletStatusById || {};
  let changed = false;
  const nextWalletStatusById = {...walletStatusById};

  Object.entries(walletStatusById).forEach(([walletId, walletStatus]) => {
    if (walletStatus !== 'done' || args.healthCheckedWalletIds.has(walletId)) {
      return;
    }

    nextWalletStatusById[walletId] = 'in_progress';
    changed = true;
  });

  return changed
    ? {
        ...args.status,
        walletStatusById: nextWalletStatusById,
      }
    : args.status;
};

const refreshCompletedWalletBalanceHealth = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  dispatch: any;
  fallbackWallets: Wallet[];
  getState: () => RootState;
  healthCheckedWalletIds: Set<string>;
  isCurrentPopulateService: () => boolean;
  walletIds: string[];
}): Promise<void> => {
  const uncheckedWalletIds = normalizeWalletIds(args.walletIds).filter(
    walletId => !args.healthCheckedWalletIds.has(walletId),
  );
  if (!uncheckedWalletIds.length) {
    return;
  }

  let walletIdsToCheck: string[] = [];
  try {
    const currentState = args.getState();
    const currentWallets = getAllMainnetWalletsFromState(currentState);
    const walletById = getWalletById(
      currentWallets.length ? currentWallets : args.fallbackWallets,
    );
    walletIdsToCheck = uncheckedWalletIds.filter(walletId =>
      walletById.has(walletId),
    );
    if (!walletIdsToCheck.length) {
      return;
    }

    const balanceHealthUpdates =
      await buildSnapshotBalanceHealthUpdatesAfterPopulate({
        client: args.client,
        dispatch: args.dispatch,
        previousMismatchByWalletId:
          currentState.PORTFOLIO?.snapshotBalanceMismatchesByWalletId,
        previousQuarantinesByWalletId:
          currentState.PORTFOLIO?.quarantinesByWalletId,
        walletIds: walletIdsToCheck,
        wallets: Array.from(walletById.values()),
      });

    if (!args.isCurrentPopulateService()) {
      return;
    }

    dispatchWalletIdMapUpdates(
      args.dispatch,
      balanceHealthUpdates.mismatchByWalletId,
      setSnapshotBalanceMismatchesByWalletIdUpdates,
    );
    dispatchWalletIdMapUpdates(
      args.dispatch,
      balanceHealthUpdates.quarantinesByWalletId,
      setQuarantinesByWalletIdUpdates,
    );
    walletIdsToCheck.forEach(walletId => {
      args.healthCheckedWalletIds.add(walletId);
    });
  } catch (error: unknown) {
    warnPortfolioWithRedactedWalletIds({
      messages: [
        `[portfolio] Could not refresh snapshot balance mismatches after wallet progress: ${toErrorMessage(
          error,
        )}`,
      ],
      walletIds: walletIdsToCheck,
    });
  }
};

const refreshFailedWalletQuarantinesAfterPopulate = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  dispatch: any;
  fallbackWallets: Wallet[];
  getState: () => RootState;
  isCurrentPopulateService: () => boolean;
  status: PortfolioPopulateJobStatus;
}): Promise<void> => {
  const errorMessageByWalletId = getErrorMessageByWalletIdFromPopulateStatus(
    args.status,
  );
  const errorWalletIds = normalizeWalletIds(
    Object.keys(errorMessageByWalletId),
  );
  if (!errorWalletIds.length) {
    return;
  }

  let walletIdsToCheck: string[] = [];
  try {
    const currentState = args.getState();
    const currentWallets = getAllMainnetWalletsFromState(currentState);
    const walletById = getWalletById(
      currentWallets.length ? currentWallets : args.fallbackWallets,
    );
    walletIdsToCheck = errorWalletIds.filter(walletId =>
      walletById.has(walletId),
    );
    if (!walletIdsToCheck.length) {
      return;
    }

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client: args.client,
      wallets: walletIdsToCheck
        .map(walletId => walletById.get(walletId))
        .filter((wallet): wallet is Wallet => !!wallet),
      getUnitDecimals: wallet =>
        resolveWalletUnitDecimalsForPortfolio(args.dispatch, wallet),
      previousMismatchByWalletId:
        currentState.PORTFOLIO?.snapshotBalanceMismatchesByWalletId,
      quarantinesByWalletId: currentState.PORTFOLIO?.quarantinesByWalletId,
      zeroBalanceTokenMissingIndexErrorByWalletId: errorMessageByWalletId,
    });

    if (!args.isCurrentPopulateService()) {
      return;
    }

    dispatchWalletIdMapUpdates(
      args.dispatch,
      decisions.quarantinesByWalletId,
      setQuarantinesByWalletIdUpdates,
    );
  } catch (error: unknown) {
    warnPortfolioWithRedactedWalletIds({
      messages: [
        `[portfolio] Could not refresh failed-wallet portfolio quarantines after populate: ${toErrorMessage(
          error,
        )}`,
      ],
      walletIds: walletIdsToCheck,
    });
  }
};

const hasNoRemainingInitialPopulateWork = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  dispatch: any;
  state: RootState;
}): Promise<boolean> => {
  const wallets = getVisibleMainnetWalletsFromState(args.state).filter(
    isPortfolioRuntimeEligibleWallet,
  );

  if (!wallets.length) {
    return true;
  }

  try {
    const decisions = await getPortfolioPopulateDecisionsForRuntimeWallets({
      client: args.client,
      dispatch: args.dispatch,
      state: args.state,
      wallets,
    });
    dispatchPortfolioMarkerUpdates(args.dispatch, decisions);
    return canMarkInitialBaselineCompleteFromDecisions({
      decisions: decisions.decisions,
      eligibleWalletCount: wallets.length,
      walletIdsToPopulate: decisions.walletIdsToPopulate,
    });
  } catch (error: unknown) {
    warnPortfolioWithRedactedWalletIds({
      messages: [
        `[portfolio] Could not verify initial populate completion after scoped populate: ${toErrorMessage(
          error,
        )}`,
      ],
      walletIds: wallets.map(wallet => wallet.id),
    });
    return false;
  }
};

const isRuntimeStorageFullyCleared = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  walletIds: string[];
}): Promise<boolean> => {
  const {client, walletIds} = args;
  const stats = await client.kvStats();
  const totalKeys = Number(stats?.totalKeys ?? 0);
  if (Number.isFinite(totalKeys) && totalKeys > 0) {
    return false;
  }

  const rateEntries = await client.listRates({});
  if (Array.isArray(rateEntries) && rateEntries.length) {
    return false;
  }

  if (walletIds.length) {
    const indexes = await Promise.all(
      walletIds.map(async walletId => {
        try {
          return await client.getSnapshotIndex({walletId});
        } catch {
          return null;
        }
      }),
    );

    if (indexes.some(index => !!index)) {
      return false;
    }
  }

  return !Number.isFinite(totalKeys) || totalKeys <= 0;
};

const waitForRuntimeStorageToClear = async (args: {
  client: ReturnType<typeof getPortfolioRuntimeClient>;
  walletIds: string[];
  timeoutMs?: number;
  pollMs?: number;
}): Promise<void> => {
  const {timeoutMs, pollMs} = resolveRuntimeMutationWaitOptions(args);
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      if (
        await isRuntimeStorageFullyCleared({
          client: args.client,
          walletIds: args.walletIds,
        })
      ) {
        return;
      }
    } catch (error: unknown) {
      lastError = error;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await delay(Math.min(pollMs, remainingMs));
  }

  throw (
    lastError ??
    new Error('Timed out waiting for runtime portfolio storage to fully clear.')
  );
};

export const cancelPopulatePortfolioWithRuntime =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const didCancelActivePopulate = cancelActiveRuntimePopulateIfNeeded(
      dispatch,
      getState(),
    );

    if (!didCancelActivePopulate) {
      pendingScopedPopulateRequest = undefined;
      return;
    }

    await drainPendingScopedPopulateRequestsAfterRuntimeStop(
      dispatch,
      getState,
    );
  };

export const clearPortfolioWithRuntime =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const state = getState();
    cancelActiveRuntimePopulateIfNeeded(dispatch, state);
    pendingScopedPopulateRequest = undefined;
    const client = getPortfolioRuntimeClient();
    const walletIds = getAllMainnetWalletIdsFromState(state);

    try {
      await clearRuntimeStorageAfterPopulateStops(() =>
        client.clearAllStorage(),
      );
      await waitForRuntimeStorageToClear({
        client,
        walletIds,
      });
      clearAssetPnlSummaryCache();
    } catch (error: unknown) {
      warnPortfolioWithRedactedWalletIds({
        messages: [
          '[portfolio] Failed clearing runtime portfolio storage: ' +
            toErrorMessage(error),
        ],
        walletIds,
      });
      throw error;
    }

    dispatch(clearPortfolio());
  };

export const clearWalletPortfolioDataWithRuntime =
  (args: {walletIds: string[]}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const walletIds = normalizeWalletIds(args.walletIds);
    if (!walletIds.length) {
      return;
    }

    cancelActiveRuntimePopulateIfNeeded(dispatch, getState());
    pendingScopedPopulateRequest = undefined;
    await waitForRuntimePopulateToStop();

    const client = getPortfolioRuntimeClient();
    const results = await Promise.allSettled(
      walletIds.map(walletId => client.clearWallet({walletId})),
    );

    results.forEach((result, index) => {
      if (result.status !== 'rejected') {
        return;
      }

      const walletId = walletIds[index];
      warnPortfolioWithRedactedWalletIds({
        messages: [
          `[portfolio] Failed clearing runtime wallet storage for ${walletId}: ${toErrorMessage(
            result.reason,
          )}`,
        ],
        walletIds: [walletId],
      });
    });

    dispatch(clearWalletPortfolioState({walletIds}));
  };

export const maybePopulatePortfolioForWalletsWithRuntime =
  (
    args: MaybePopulatePortfolioForWalletsWithRuntimeArgs,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    if (!isPortfolioEnabled(state)) {
      return;
    }
    if (shouldWaitForAppUnlockBeforePortfolioWork(state)) {
      deferPortfolioWorkUntilAppUnlock(() => {
        dispatch(maybePopulatePortfolioForWalletsWithRuntime(args));
      });
      return;
    }
    if (state.PORTFOLIO?.populateStatus?.inProgress) {
      if (args.forceRetryQuarantined === true) {
        queueScopedPopulateRequest(args, {runPopulateDecision: true});
      }
      return;
    }

    const scopedWalletIds = normalizeWalletIds(args.walletIds);
    const scopedWallets = scopedWalletIds.length
      ? getMainnetWalletsByIdsFromState(state, scopedWalletIds)
      : Array.isArray(args.wallets)
      ? args.wallets
      : [];
    const runtimeEligibleWallets = scopedWallets.filter(
      isPortfolioRuntimeEligibleWallet,
    );
    if (!runtimeEligibleWallets.length) {
      return;
    }

    const client = getPortfolioRuntimeClient();
    const decisions = await getPortfolioPopulateDecisionsForRuntimeWallets({
      client,
      dispatch,
      state,
      wallets: runtimeEligibleWallets,
      forceRetryQuarantined: args.forceRetryQuarantined,
    });

    dispatch(
      setSnapshotBalanceMismatchesByWalletIdUpdates(
        decisions.mismatchByWalletId,
      ),
    );
    dispatchPortfolioMarkerUpdates(dispatch, decisions);

    const walletsToPopulate =
      await getWalletsToPopulateAfterQuarantinePreparation({
        client,
        decisions: decisions.decisions,
        wallets: runtimeEligibleWallets,
        walletIdsToPopulate: decisions.walletIdsToPopulate,
      });
    if (!walletsToPopulate.length) {
      return;
    }

    await dispatch(
      populatePortfolioWithRuntime({
        wallets: walletsToPopulate,
        quoteCurrency: args.quoteCurrency,
      }),
    );
  };

export const maybePopulatePortfolioOnAppLaunchWithRuntime =
  (
    args?: MaybePopulatePortfolioOnAppLaunchWithRuntimeArgs,
  ): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const initialState = getState();
    if (!isPortfolioEnabled(initialState)) {
      return;
    }
    if (shouldWaitForAppUnlockBeforePortfolioWork(initialState)) {
      deferPortfolioWorkUntilAppUnlock(() => {
        dispatch(maybePopulatePortfolioOnAppLaunchWithRuntime(args));
      });
      return;
    }
    if (initialState.PORTFOLIO?.populateStatus?.inProgress) {
      if (args?.forceRetryQuarantined === true) {
        queueScopedPopulateRequest(
          {
            wallets: getVisibleMainnetWalletsFromState(initialState),
            quoteCurrency: args?.quoteCurrency,
            forceRetryQuarantined: true,
          },
          {runPopulateDecision: true},
        );
      }
      return;
    }

    const waitResult = await waitForStartupWalletStoreInitForPortfolio();
    if (waitResult.status !== 'completed' || !waitResult.walletInitSuccess) {
      logManager.warn(
        '[portfolio] Launch wallet status refresh did not complete before populate decision',
        JSON.stringify(waitResult),
      );
      await dispatch(
        populatePortfolioWithRuntime({
          quoteCurrency: args?.quoteCurrency,
        }),
      );
      return;
    }

    const state = getState();
    if (
      !isPortfolioEnabled(state) ||
      state.PORTFOLIO?.populateStatus?.inProgress
    ) {
      return;
    }

    const quoteCurrency = resolveQuoteCurrency(
      args?.quoteCurrency,
      state.APP?.defaultAltCurrency?.isoCode,
    );
    const runtimeEligibleWallets = getVisibleMainnetWalletsFromState(
      state,
    ).filter(isPortfolioRuntimeEligibleWallet);

    if (!runtimeEligibleWallets.length) {
      if (!hasCompletedInitialPortfolioBaseline(state)) {
        dispatch(
          markInitialBaselineComplete({
            completedAt: Date.now(),
            quoteCurrency,
          }),
        );
      }
      return;
    }

    const client = getPortfolioRuntimeClient();
    const decisions = await getPortfolioPopulateDecisionsForRuntimeWallets({
      client,
      dispatch,
      state,
      wallets: runtimeEligibleWallets,
      forceRetryQuarantined: args?.forceRetryQuarantined,
    });

    dispatch(
      setSnapshotBalanceMismatchesByWalletIdUpdates(
        decisions.mismatchByWalletId,
      ),
    );
    dispatchPortfolioMarkerUpdates(dispatch, decisions);

    if (
      canMarkInitialBaselineCompleteFromDecisions({
        decisions: decisions.decisions,
        eligibleWalletCount: runtimeEligibleWallets.length,
        walletIdsToPopulate: decisions.walletIdsToPopulate,
      }) &&
      !hasCompletedInitialPortfolioBaseline(getState())
    ) {
      dispatch(
        markInitialBaselineComplete({
          completedAt: Date.now(),
          quoteCurrency,
        }),
      );
    }

    const walletsToPopulate =
      await getWalletsToPopulateAfterQuarantinePreparation({
        client,
        decisions: decisions.decisions,
        wallets: runtimeEligibleWallets,
        walletIdsToPopulate: decisions.walletIdsToPopulate,
      });
    if (!walletsToPopulate.length) {
      return;
    }

    await dispatch(
      populatePortfolioWithRuntime({
        completesInitialBaseline: !hasCompletedInitialPortfolioBaseline(
          getState(),
        ),
        wallets: walletsToPopulate,
        quoteCurrency,
      }),
    );
  };

export const populatePortfolioWithRuntime =
  (args?: PopulatePortfolioWithRuntimeArgs): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const state = getState();
    if (!isPortfolioEnabled(state)) {
      return;
    }
    if (shouldWaitForAppUnlockBeforePortfolioWork(state)) {
      deferPortfolioWorkUntilAppUnlock(() => {
        dispatch(populatePortfolioWithRuntime(args));
      });
      return;
    }
    if (state.PORTFOLIO?.populateStatus?.inProgress) {
      queueScopedPopulateRequest(args);
      return;
    }
    const hasScopedPopulateArgs = !!args?.wallets || !!args?.walletIds;

    const quoteCurrency = resolveQuoteCurrency(
      args?.quoteCurrency,
      state.APP?.defaultAltCurrency?.isoCode,
    );

    const walletsToPopulate = resolvePopulateWallets({
      state,
      wallets: args?.wallets,
      walletIds: args?.walletIds,
    });

    const prioritizedWalletsToPopulate =
      sortWalletsByAssetFiatPriority(walletsToPopulate);

    const storedWallets: StoredWallet[] = [];
    const invalidDecimalsErrors: Array<{walletId: string; message: string}> =
      [];
    const markerUpdates: PortfolioMarkerUpdates = {
      invalidDecimalsByWalletId: {},
      quarantinesByWalletId: {},
    };
    const storedWalletIds = new Set<string>();

    for (const wallet of prioritizedWalletsToPopulate) {
      if (!isPortfolioRuntimeEligibleWallet(wallet)) {
        continue;
      }

      const walletId = String(wallet?.id || '').trim();
      if (walletId && storedWalletIds.has(walletId)) {
        continue;
      }

      const decimalsResolution = resolveWalletUnitDecimalsForPortfolio(
        dispatch,
        wallet,
      );
      if (!decimalsResolution.ok) {
        if (walletId) {
          markerUpdates.invalidDecimalsByWalletId[walletId] = {
            walletId,
            reason: 'invalid_decimals',
            message: decimalsResolution.message,
          };
          markerUpdates.quarantinesByWalletId[walletId] = undefined;
        }
        invalidDecimalsErrors.push({
          walletId,
          message: decimalsResolution.message,
        });
        warnPortfolioWithRedactedWalletIds({
          messages: [`[portfolio] ${decimalsResolution.message}`],
          walletIds: [walletId],
        });
        continue;
      }

      if (walletId) {
        markerUpdates.invalidDecimalsByWalletId[walletId] = undefined;
      }
      const storedWallet = toPortfolioStoredWallet({
        wallet,
        unitDecimals: decimalsResolution.unitDecimals,
      });
      storedWallets.push(storedWallet);
      if (walletId) {
        storedWalletIds.add(walletId);
      }
    }

    dispatchPortfolioMarkerUpdates(dispatch, markerUpdates);

    if (!storedWallets.length) {
      return;
    }

    dispatch(startPopulatePortfolio({quoteCurrency}));
    if (invalidDecimalsErrors.length) {
      dispatch(
        updatePopulateProgress({
          errorsToAdd: invalidDecimalsErrors,
          walletStatusByIdUpdates: Object.fromEntries(
            invalidDecimalsErrors
              .filter(error => error.walletId)
              .map(error => [error.walletId, 'error' as const]),
          ),
        }),
      );
    }
    const reportedErrorKeys = new Set<string>();

    const runtimeClient = getPortfolioRuntimeClient();
    const service = new PortfolioPopulateService({
      client: runtimeClient,
    });
    activeRuntimePopulateService = service;
    const isCurrentPopulateService = () =>
      activeRuntimePopulateService === service;
    const healthCheckedWalletIds = new Set<string>();

    const dispatchPopulateProgressAfterBalanceHealth = async (
      status: PortfolioPopulateJobStatus,
    ): Promise<void> => {
      await refreshCompletedWalletBalanceHealth({
        client: runtimeClient,
        dispatch,
        fallbackWallets: prioritizedWalletsToPopulate,
        getState,
        healthCheckedWalletIds,
        isCurrentPopulateService,
        walletIds: getDoneWalletIdsFromPopulateStatus(status),
      });

      if (!isCurrentPopulateService()) {
        return;
      }

      dispatchPopulateProgressStatus({
        dispatch,
        status: maskUncheckedDoneWalletStatuses({
          healthCheckedWalletIds,
          status,
        }),
        reportedErrorKeys,
      });
    };

    try {
      const result = await service.populateWallets({
        wallets: storedWallets,
        onProgress: async status => {
          if (!isCurrentPopulateService()) {
            return;
          }
          await dispatchPopulateProgressAfterBalanceHealth(status);
        },
      });
      if (!isCurrentPopulateService()) {
        return;
      }

      const finalStatus = result.status;
      const completedWalletIds = normalizeWalletIds([
        ...getDoneWalletIdsFromPopulateStatus(finalStatus),
        ...(result.results || []).flatMap(runResult =>
          runResult?.cancelled
            ? []
            : [String(runResult?.walletId || '').trim()],
        ),
      ]);

      await refreshCompletedWalletBalanceHealth({
        client: runtimeClient,
        dispatch,
        fallbackWallets: prioritizedWalletsToPopulate,
        getState,
        healthCheckedWalletIds,
        isCurrentPopulateService,
        walletIds: completedWalletIds,
      });
      if (!isCurrentPopulateService()) {
        return;
      }
      await refreshFailedWalletQuarantinesAfterPopulate({
        client: runtimeClient,
        dispatch,
        fallbackWallets: prioritizedWalletsToPopulate,
        getState,
        isCurrentPopulateService,
        status: finalStatus,
      });
      if (!isCurrentPopulateService()) {
        return;
      }
      dispatchPopulateProgressStatus({
        dispatch,
        status: maskUncheckedDoneWalletStatuses({
          healthCheckedWalletIds,
          status: finalStatus,
        }),
        reportedErrorKeys,
      });
      logPopulateWalletErrors({
        errors: finalStatus.errors,
        requestedWalletCount: storedWallets.length,
        quoteCurrency,
        status: finalStatus,
      });

      if (result.cancelled) {
        if (isCurrentPopulateService()) {
          dispatch(cancelPopulatePortfolio());
        }
        return;
      }

      if (!isCurrentPopulateService()) {
        return;
      }
      const completedWalletHealthChecked = completedWalletIds.every(walletId =>
        healthCheckedWalletIds.has(walletId),
      );
      const hasCompletedFullPopulate =
        finalStatus.state === 'completed' &&
        !finalStatus.inProgress &&
        completedWalletHealthChecked &&
        (args?.completesInitialBaseline === true ||
          !hasScopedPopulateArgs ||
          (await hasNoRemainingInitialPopulateWork({
            client: runtimeClient,
            dispatch,
            state: getState(),
          })));
      const lastFullPopulateCompletedAt = hasCompletedFullPopulate
        ? result.finishedAt
        : undefined;
      if (!isCurrentPopulateService()) {
        return;
      }

      dispatch(
        finishPopulatePortfolio({
          finishedAt: result.finishedAt,
          ...(typeof lastFullPopulateCompletedAt === 'number'
            ? {lastFullPopulateCompletedAt}
            : {}),
          reason: buildPopulateStopReason({
            errors: finalStatus.errors,
            requestedWalletCount: storedWallets.length,
            completedWalletCount: finalStatus.walletsCompleted,
          }),
          quoteCurrency,
        }),
      );
    } catch (error: unknown) {
      if (!isCurrentPopulateService()) {
        return;
      }
      dispatch(
        failPopulatePortfolio({
          error: toErrorMessage(error),
        }),
      );
    } finally {
      if (activeRuntimePopulateService === service) {
        activeRuntimePopulateService = undefined;
        await drainPendingScopedPopulateRequests(dispatch, getState);
      }
    }
  };
