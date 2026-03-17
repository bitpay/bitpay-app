import {startTransition, useCallback, useRef} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {FiatRateInterval} from '../../store/rate/rate.models';
import {upsertBalanceChartScopeTimeframes} from '../../store/portfolio-charts';
import {isAbortError} from '../../utils/abort';
import {formatUnknownError} from '../../utils/errors/formatUnknownError';
import {
  scheduleAfterInteractionsAndFrames,
  type ScheduledAfterInteractionsHandle,
} from '../../utils/scheduleAfterInteractionsAndFrames';
import type {CachedBalanceChartTimeframe} from '../../store/portfolio-charts';
import type {
  BalanceHistoryChartOrchestrationAction,
  TimeframeComputeDisposition,
} from './balanceHistoryChartOrchestration';

type RetryPolicy = 'retry_interrupted_attempts' | 'suppress_after_attempt';

export const useBalanceHistoryChartComputeQueue = <
  TSeries,
  TChangeRowData,
>(args: {
  computeGenerationRef: MutableRefObject<number>;
  computeSeriesForTimeframe: (
    timeframe: FiatRateInterval,
    signal: AbortSignal,
  ) => Promise<{
    cacheEntry: CachedBalanceChartTimeframe;
    series: TSeries;
  }>;
  dispatch: Dispatch<any>;
  dispatchTimeframeState: Dispatch<
    BalanceHistoryChartOrchestrationAction<TSeries, TChangeRowData>
  >;
  getComputeDispositionForTimeframe: (
    timeframe: FiatRateInterval,
    retryPolicy: RetryPolicy,
  ) => TimeframeComputeDisposition;
  getTimeframeAttemptRevision: (timeframe: FiatRateInterval) => string;
  getTimeframeRevision: (
    timeframe: FiatRateInterval,
    historicalRateDeps?: CachedBalanceChartTimeframe['historicalRateDeps'],
  ) => string;
  selectedTimeframe: FiatRateInterval;
  scopeId: string;
  sortedWalletIds: string[];
  balanceOffset: number;
  setDisplayState: Dispatch<
    SetStateAction<
      | {
          series: TSeries;
          timeframe: FiatRateInterval;
        }
      | undefined
    >
  >;
  trackScheduledHandle: (handle: ScheduledAfterInteractionsHandle) => void;
  onComputeError: (context: string, error: unknown) => void;
}) => {
  const enqueueComputeRef = useRef<FiatRateInterval[]>([]);
  const computingQueueRef = useRef(false);
  const selectedTimeframeRef = useRef(args.selectedTimeframe);

  selectedTimeframeRef.current = args.selectedTimeframe;

  const resetComputeQueue = useCallback(() => {
    enqueueComputeRef.current = [];
    computingQueueRef.current = false;
  }, []);

  const retainOnlyQueuedTimeframe = useCallback(
    (timeframe: FiatRateInterval) => {
      enqueueComputeRef.current = enqueueComputeRef.current.filter(
        queuedTimeframe => queuedTimeframe === timeframe,
      );
    },
    [],
  );

  const enqueueTimeframeCompute = useCallback(
    (timeframe: FiatRateInterval, prioritize = false) => {
      const queue = enqueueComputeRef.current;
      const existingIndex = queue.indexOf(timeframe);
      if (existingIndex >= 0) {
        if (prioritize && existingIndex > 0) {
          queue.splice(existingIndex, 1);
          queue.unshift(timeframe);
        }
        return;
      }

      if (prioritize) {
        queue.unshift(timeframe);
      } else {
        queue.push(timeframe);
      }
    },
    [],
  );

  const processQueue = useCallback(() => {
    if (computingQueueRef.current) {
      return;
    }

    computingQueueRef.current = true;

    const runNext = () => {
      const nextTimeframe = enqueueComputeRef.current.shift();
      if (!nextTimeframe) {
        computingQueueRef.current = false;
        return;
      }

      const generation = args.computeGenerationRef.current;
      const attemptRevision = args.getTimeframeAttemptRevision(nextTimeframe);

      args.dispatchTimeframeState({
        type: 'startCompute',
        timeframe: nextTimeframe,
        attemptRevision,
        generation,
      });

      const computeHandle = scheduleAfterInteractionsAndFrames({
        callback: async signal => {
          try {
            if (args.computeGenerationRef.current !== generation) {
              return;
            }

            const computed = await args.computeSeriesForTimeframe(
              nextTimeframe,
              signal,
            );
            const timeframeRevision = args.getTimeframeRevision(
              nextTimeframe,
              computed.cacheEntry.historicalRateDeps,
            );

            if (args.computeGenerationRef.current !== generation) {
              return;
            }

            startTransition(() => {
              args.dispatchTimeframeState({
                type: 'resolveCompute',
                timeframe: nextTimeframe,
                attemptRevision,
                series: computed.series,
                seriesRevision: timeframeRevision,
                generation,
              });

              if (nextTimeframe === selectedTimeframeRef.current) {
                args.setDisplayState(previous =>
                  previous?.series === computed.series &&
                  previous?.timeframe === nextTimeframe
                    ? previous
                    : {
                        series: computed.series,
                        timeframe: nextTimeframe,
                      },
                );
              }
            });

            if (args.computeGenerationRef.current === generation) {
              args.dispatch(
                upsertBalanceChartScopeTimeframes({
                  scopeId: args.scopeId,
                  walletIds: args.sortedWalletIds,
                  quoteCurrency: computed.cacheEntry.quoteCurrency,
                  balanceOffset: args.balanceOffset,
                  timeframes: [computed.cacheEntry],
                }),
              );
            }
          } catch (error: unknown) {
            if (
              args.computeGenerationRef.current !== generation ||
              signal.aborted ||
              isAbortError(error)
            ) {
              return;
            }

            args.onComputeError(`compute failed for ${nextTimeframe}`, error);
            args.dispatchTimeframeState({
              type: 'rejectCompute',
              timeframe: nextTimeframe,
              attemptRevision,
              error: formatUnknownError(error),
              generation,
            });
          } finally {
            if (args.computeGenerationRef.current !== generation) {
              computingQueueRef.current = false;
              return;
            }

            runNext();
          }
        },
      });
      args.trackScheduledHandle(computeHandle);
    };

    runNext();
  }, [
    args.balanceOffset,
    args.computeGenerationRef,
    args.computeSeriesForTimeframe,
    args.dispatch,
    args.dispatchTimeframeState,
    args.getTimeframeAttemptRevision,
    args.getTimeframeRevision,
    args.onComputeError,
    args.scopeId,
    args.setDisplayState,
    args.sortedWalletIds,
    args.trackScheduledHandle,
  ]);

  const queueTimeframeCompute = useCallback(
    (timeframe: FiatRateInterval, prioritize = false) => {
      enqueueTimeframeCompute(timeframe, prioritize);
      processQueue();
    },
    [enqueueTimeframeCompute, processQueue],
  );

  const ensureTimeframeComputed = useCallback(
    (
      timeframe: FiatRateInterval,
      options?: {
        prioritize?: boolean;
        retryPolicy?: RetryPolicy;
      },
    ) => {
      const disposition = args.getComputeDispositionForTimeframe(
        timeframe,
        options?.retryPolicy || 'retry_interrupted_attempts',
      );
      if (!disposition.shouldQueue) {
        return;
      }

      queueTimeframeCompute(timeframe, !!options?.prioritize);
    },
    [args, queueTimeframeCompute],
  );

  return {
    ensureTimeframeComputed,
    queueTimeframeCompute,
    retainOnlyQueuedTimeframe,
    resetComputeQueue,
  };
};
