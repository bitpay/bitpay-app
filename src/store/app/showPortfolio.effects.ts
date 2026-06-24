import {EXCHANGE_RATES_CURRENCIES} from '../../constants/config';
import {logManager} from '../../managers/LogManager';
import {replaceRuntimeFiatRateSeriesCache} from '../../portfolio/ui/fiatRateSeries';
import {formatUnknownError} from '../../utils/errors/formatUnknownError';
import type {Effect, RootState} from '../index';
import {
  cancelPopulatePortfolio,
  clearPortfolioWithRuntime,
  populatePortfolio,
} from '../portfolio';
import {FIAT_RATE_SERIES_CACHED_INTERVALS} from '../rate/rate.models';
import {remountHomeChart, showPortfolioValue} from './app.actions';

let showPortfolioMutationGeneration = 0;
let showPortfolioMutationQueue: Promise<void> = Promise.resolve();

const isLatestShowPortfolioMutation = (
  generation: number,
  getState: () => RootState,
  expectedValue: boolean,
): boolean =>
  generation === showPortfolioMutationGeneration &&
  getState().APP?.showPortfolioValue === expectedValue;

const isLatestShowPortfolioMutationGeneration = (generation: number): boolean =>
  generation === showPortfolioMutationGeneration;

const enqueueShowPortfolioMutation = (
  work: () => Promise<void>,
  options?: {throwOnError?: boolean},
): Promise<void> => {
  const queuedWork = showPortfolioMutationQueue
    .catch(() => undefined)
    .then(work);

  showPortfolioMutationQueue = queuedWork.catch(() => undefined);
  if (options?.throwOnError) {
    return queuedWork;
  }

  return queuedWork.catch((error: unknown) => {
    logManager.error(
      '[portfolio] Show Portfolio mutation failed',
      formatUnknownError(error),
    );
  });
};

const markRuntimeClearRequired = (dispatch: any): void => {
  dispatch(cancelPopulatePortfolio());
};

const runRuntimeClear = async (dispatch: any): Promise<void> => {
  await dispatch(clearPortfolioWithRuntime());
  dispatch(remountHomeChart());
};

const rebuildRuntimeFiatRateCache = async (getState: () => RootState) => {
  const selectedFiatCode = (
    getState().APP?.defaultAltCurrency?.isoCode || 'USD'
  ).toUpperCase();

  try {
    await replaceRuntimeFiatRateSeriesCache({
      quoteCurrency: selectedFiatCode,
      requests: EXCHANGE_RATES_CURRENCIES.map(coin => ({
        coin,
        intervals: [...FIAT_RATE_SERIES_CACHED_INTERVALS],
      })),
    });
  } catch (error: unknown) {
    logManager.error(
      '[portfolio] Could not rebuild runtime fiat-rate cache after clearing portfolio',
      formatUnknownError(error),
    );
  }
};

export const setShowPortfolioValueWithRuntimeReset =
  (
    value: boolean,
    options?: {
      throwOnRuntimeClearFailure?: boolean;
    },
  ): Effect<Promise<void>> =>
  (dispatch, getState) => {
    const generation = ++showPortfolioMutationGeneration;

    if (!value || getState().APP?.showPortfolioValue !== false) {
      dispatch(showPortfolioValue(false));
    }
    markRuntimeClearRequired(dispatch);

    return enqueueShowPortfolioMutation(
      async () => {
        if (value && !isLatestShowPortfolioMutationGeneration(generation)) {
          return;
        }

        try {
          await runRuntimeClear(dispatch);
        } catch (error: unknown) {
          logManager.error(
            '[portfolio] Show Portfolio runtime clear failed',
            formatUnknownError(error),
          );
          if (options?.throwOnRuntimeClearFailure) {
            throw error;
          }
          return;
        }

        if (!value) {
          if (isLatestShowPortfolioMutation(generation, getState, false)) {
            await rebuildRuntimeFiatRateCache(getState);
          }

          return;
        }

        if (!isLatestShowPortfolioMutationGeneration(generation)) {
          return;
        }

        dispatch(showPortfolioValue(true));

        try {
          const result = dispatch(populatePortfolio() as any);
          void Promise.resolve(result).catch(error => {
            logManager.error(
              '[portfolio] Show Portfolio populate failed',
              formatUnknownError(error),
            );
          });
        } catch (error: unknown) {
          logManager.error(
            '[portfolio] Show Portfolio populate failed',
            formatUnknownError(error),
          );
        }
      },
      {throwOnError: options?.throwOnRuntimeClearFailure},
    );
  };

export const resetShowPortfolioValueRuntimeResetForTests = (): void => {
  showPortfolioMutationGeneration = 0;
  showPortfolioMutationQueue = Promise.resolve();
};
