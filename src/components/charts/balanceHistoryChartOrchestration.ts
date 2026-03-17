import type {FiatRateInterval} from '../../store/rate/rate.models';
import type {CachedTimeframeStatus} from '../../utils/portfolio/chartCache';

export type TimeframeChartState<TSeries, TChangeRowData> = {
  series?: TSeries;
  seriesRevision?: string;
  isComputing?: boolean;
  lastAttemptRevision?: string;
  lastError?: string;
  lastResolvedChangeRowData?: TChangeRowData;
};

export type TimeframeChartStateByTimeframe<TSeries, TChangeRowData> = Partial<
  Record<FiatRateInterval, TimeframeChartState<TSeries, TChangeRowData>>
>;

export type BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData> = {
  generation: number;
  byTimeframe: TimeframeChartStateByTimeframe<TSeries, TChangeRowData>;
};

type HydratedTimeframeUpdate<TSeries> = {
  series: TSeries;
  seriesRevision: string;
};

type MergeHydratedSeriesAction<TSeries> = {
  type: 'mergeHydratedSeries';
  updates: Partial<Record<FiatRateInterval, HydratedTimeframeUpdate<TSeries>>>;
};

type StartComputeAction = {
  type: 'startCompute';
  timeframe: FiatRateInterval;
  attemptRevision: string;
  generation: number;
};

type ResolveComputeAction<TSeries> = {
  type: 'resolveCompute';
  timeframe: FiatRateInterval;
  attemptRevision: string;
  series: TSeries;
  seriesRevision: string;
  generation: number;
};

type RejectComputeAction = {
  type: 'rejectCompute';
  timeframe: FiatRateInterval;
  attemptRevision: string;
  error: string;
  generation: number;
};

type SetResolvedChangeRowDataAction<TChangeRowData> = {
  type: 'setResolvedChangeRowData';
  timeframe: FiatRateInterval;
  data: TChangeRowData;
};

type AdvanceGenerationAction = {
  type: 'advanceGeneration';
  generation: number;
};

type ResetAllAction = {
  type: 'resetAll';
  generation: number;
};

export type BalanceHistoryChartOrchestrationAction<TSeries, TChangeRowData> =
  | MergeHydratedSeriesAction<TSeries>
  | StartComputeAction
  | ResolveComputeAction<TSeries>
  | RejectComputeAction
  | SetResolvedChangeRowDataAction<TChangeRowData>
  | AdvanceGenerationAction
  | ResetAllAction;

export const createInitialBalanceHistoryChartOrchestrationState = <
  TSeries,
  TChangeRowData,
>(): BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData> => ({
  generation: 0,
  byTimeframe: {},
});

const updateTimeframeEntry = <TSeries, TChangeRowData>(
  state: BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData>,
  timeframe: FiatRateInterval,
  updater: (
    entry: TimeframeChartState<TSeries, TChangeRowData>,
  ) => TimeframeChartState<TSeries, TChangeRowData>,
): BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData> => {
  const current = state.byTimeframe[timeframe] || {};
  const next = updater(current);

  if (next === current) {
    return state;
  }

  return {
    ...state,
    byTimeframe: {
      ...state.byTimeframe,
      [timeframe]: next,
    },
  };
};

export const balanceHistoryChartOrchestrationReducer = <
  TSeries,
  TChangeRowData,
>(
  state: BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData>,
  action: BalanceHistoryChartOrchestrationAction<TSeries, TChangeRowData>,
): BalanceHistoryChartOrchestrationState<TSeries, TChangeRowData> => {
  switch (action.type) {
    case 'mergeHydratedSeries': {
      let didChange = false;
      const nextByTimeframe = {...state.byTimeframe};

      for (const timeframe of Object.keys(
        action.updates,
      ) as FiatRateInterval[]) {
        const update = action.updates[timeframe];
        if (!update) {
          continue;
        }

        const current = state.byTimeframe[timeframe] || {};
        if (
          current.series === update.series &&
          current.seriesRevision === update.seriesRevision
        ) {
          continue;
        }

        nextByTimeframe[timeframe] = {
          ...current,
          series: update.series,
          seriesRevision: update.seriesRevision,
        };
        didChange = true;
      }

      return didChange
        ? {
            ...state,
            byTimeframe: nextByTimeframe,
          }
        : state;
    }

    case 'startCompute':
      if (action.generation !== state.generation) {
        return state;
      }
      return updateTimeframeEntry(state, action.timeframe, current => ({
        ...current,
        isComputing: true,
        lastAttemptRevision: action.attemptRevision,
        lastError: undefined,
      }));

    case 'resolveCompute':
      if (action.generation !== state.generation) {
        return state;
      }
      return updateTimeframeEntry(state, action.timeframe, current => ({
        ...current,
        series: action.series,
        seriesRevision: action.seriesRevision,
        isComputing: false,
        lastAttemptRevision: action.attemptRevision,
        lastError: undefined,
      }));

    case 'rejectCompute':
      if (action.generation !== state.generation) {
        return state;
      }
      return updateTimeframeEntry(state, action.timeframe, current => ({
        ...current,
        isComputing: false,
        lastAttemptRevision: action.attemptRevision,
        lastError: action.error,
      }));

    case 'setResolvedChangeRowData':
      return updateTimeframeEntry(state, action.timeframe, current => {
        if (current.lastResolvedChangeRowData === action.data) {
          return current;
        }

        return {
          ...current,
          lastResolvedChangeRowData: action.data,
        };
      });

    case 'advanceGeneration': {
      let didChange = state.generation !== action.generation;
      const nextByTimeframe = {...state.byTimeframe};

      for (const timeframe of Object.keys(
        state.byTimeframe,
      ) as FiatRateInterval[]) {
        const current = state.byTimeframe[timeframe];
        if (!current?.isComputing) {
          continue;
        }

        nextByTimeframe[timeframe] = {
          ...current,
          isComputing: false,
        };
        didChange = true;
      }

      return didChange
        ? {
            generation: action.generation,
            byTimeframe: nextByTimeframe,
          }
        : state;
    }

    case 'resetAll':
      return {
        generation: action.generation,
        byTimeframe: {},
      };

    default:
      return state;
  }
};

type TimeframeComputeRetryPolicy =
  | 'retry_interrupted_attempts'
  | 'suppress_after_attempt';

export type TimeframeComputeDisposition =
  | {shouldQueue: true}
  | {
      shouldQueue: false;
      reason:
        | 'cached'
        | 'current_series'
        | 'successful_attempt'
        | 'already_computing'
        | 'no_snapshots'
        | 'inputs_not_ready'
        | 'retry_suppressed_after_error'
        | 'retry_suppressed_after_attempt';
    };

export const getTimeframeComputeDisposition = <TSeries, TChangeRowData>(args: {
  cachedStatus: CachedTimeframeStatus;
  timeframeRevision: string;
  attemptRevision: string;
  timeframeState?: TimeframeChartState<TSeries, TChangeRowData>;
  hasAnySnapshots: boolean;
  inputsReady: boolean;
  retryPolicy: TimeframeComputeRetryPolicy;
}): TimeframeComputeDisposition => {
  const state = args.timeframeState;

  if (args.cachedStatus === 'fresh' || args.cachedStatus === 'patchable') {
    return {shouldQueue: false, reason: 'cached'};
  }

  if (state?.series && state.seriesRevision === args.timeframeRevision) {
    return {shouldQueue: false, reason: 'current_series'};
  }

  if (
    state?.series &&
    state.lastAttemptRevision === args.attemptRevision &&
    !state.lastError
  ) {
    return {shouldQueue: false, reason: 'successful_attempt'};
  }

  if (
    state?.isComputing &&
    state.lastAttemptRevision === args.attemptRevision
  ) {
    return {shouldQueue: false, reason: 'already_computing'};
  }

  if (!args.hasAnySnapshots) {
    return {shouldQueue: false, reason: 'no_snapshots'};
  }

  if (!args.inputsReady) {
    return {shouldQueue: false, reason: 'inputs_not_ready'};
  }

  if (state?.lastAttemptRevision === args.attemptRevision) {
    if (state.lastError) {
      return {
        shouldQueue: false,
        reason: 'retry_suppressed_after_error',
      };
    }

    if (args.retryPolicy === 'suppress_after_attempt') {
      return {
        shouldQueue: false,
        reason: 'retry_suppressed_after_attempt',
      };
    }
  }

  return {shouldQueue: true};
};

export const selectComputedSeriesForAttempt = <TSeries, TChangeRowData>(args: {
  timeframeState?: TimeframeChartState<TSeries, TChangeRowData>;
  timeframeRevision: string;
  attemptRevision: string;
}): TSeries | undefined => {
  const state = args.timeframeState;
  if (!state?.series) {
    return undefined;
  }

  if (state.seriesRevision === args.timeframeRevision) {
    return state.series;
  }

  if (state.lastAttemptRevision === args.attemptRevision && !state.lastError) {
    return state.series;
  }

  return undefined;
};

export const selectTimeframeErrorForAttempt = <TSeries, TChangeRowData>(args: {
  timeframeState?: TimeframeChartState<TSeries, TChangeRowData>;
  attemptRevision: string;
}): string | undefined => {
  return args.timeframeState?.lastAttemptRevision === args.attemptRevision
    ? args.timeframeState.lastError
    : undefined;
};
