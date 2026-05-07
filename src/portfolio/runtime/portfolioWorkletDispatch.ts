import {scheduleOnRN} from 'react-native-worklets';

import {
  clearPortfolioTxHistorySigningDispatchContextOnRuntime,
  disposePortfolioTxHistorySigningDispatchContext,
  setPortfolioTxHistorySigningDispatchContextOnRuntime,
  type PortfolioTxHistorySigningDispatchContext,
} from '../adapters/rn/txHistorySigning';
import {getRuntimeErrorDetails} from '../adapters/rn/workletRuntimeShared';
import type {
  WorkerRequest,
  WorkerResponse,
} from '../core/engine/workerProtocol';
import type {PortfolioRuntimeHostBootstrapConfig} from './portfolioRuntimeHostConfig';
import {
  canHandlePortfolioRequestOnRuntime,
  handlePortfolioRequestOnRuntime,
} from './worklet/portfolioRequestWorklet';
import {
  handleGetPopulateJobStatusOnWorklet,
  type PortfolioPopulateJobSigningContextMap,
} from './worklet/portfolioPopulateJobWorklet';
import type {PortfolioPopulateJobStartResult} from '../core/engine/populateJob';

export type PortfolioRuntimeDispatchContext = {
  singleRequestSigningContext?: PortfolioTxHistorySigningDispatchContext | null;
  populateJobSigningContextsByWalletId?: PortfolioPopulateJobSigningContextMap;
};

const TERMINAL_POPULATE_POLL_MS = 250;

function clearPopulateSigningContextMap(
  map: PortfolioPopulateJobSigningContextMap | undefined,
): void {
  'worklet';

  if (!map) {
    return;
  }

  for (const walletId of Object.keys(map)) {
    disposePortfolioTxHistorySigningDispatchContext(map[walletId]);
    delete map[walletId];
  }
}

function clearRuntimeDispatchContext(
  dispatchContext: PortfolioRuntimeDispatchContext | null | undefined,
): void {
  'worklet';

  if (!dispatchContext) {
    return;
  }

  // Dispatch contexts are request-owned. After a request completes or a
  // populate start hands off cloned job-owned contexts, nothing here should
  // retain signing authority or handles.
  disposePortfolioTxHistorySigningDispatchContext(
    dispatchContext.singleRequestSigningContext,
  );
  clearPopulateSigningContextMap(
    dispatchContext.populateJobSigningContextsByWalletId,
  );
  delete dispatchContext.singleRequestSigningContext;
  delete dispatchContext.populateJobSigningContextsByWalletId;
}

function delayOnRuntime(ms: number): Promise<void> {
  'worklet';

  return new Promise(resolve => {
    setTimeout(resolve, Math.max(0, Math.floor(ms)), undefined);
  });
}

export function dispatchPortfolioRequestOnRuntime(
  config: PortfolioRuntimeHostBootstrapConfig,
  req: WorkerRequest,
  dispatchContext: PortfolioRuntimeDispatchContext | null | undefined,
  resolveOnRN: (response: WorkerResponse) => void,
  rejectOnRN: (message: string, stack?: string) => void,
): void {
  'worklet';

  void (async () => {
    const isPopulateJobControlRequest =
      req.method === 'populate.startJob' ||
      req.method === 'populate.getJobStatus' ||
      req.method === 'populate.cancelJob';

    try {
      // Populate job-control requests are metadata/control-plane only; wallet
      // work owns the runtime context via withWalletSigningContext(...).
      if (!isPopulateJobControlRequest) {
        setPortfolioTxHistorySigningDispatchContextOnRuntime(
          dispatchContext?.singleRequestSigningContext,
        );
      }

      if (!canHandlePortfolioRequestOnRuntime(req.method)) {
        throw new Error(
          `Portfolio runtime worklet dispatch does not support ${String(
            req.method,
          )}.`,
        );
      }

      const response = await handlePortfolioRequestOnRuntime(
        config,
        req,
        dispatchContext?.populateJobSigningContextsByWalletId,
      );
      if (isPopulateJobControlRequest) {
        clearRuntimeDispatchContext(dispatchContext);
      }
      if (!isPopulateJobControlRequest) {
        clearPortfolioTxHistorySigningDispatchContextOnRuntime();
        clearRuntimeDispatchContext(dispatchContext);
      }
      scheduleOnRN(resolveOnRN, response);
    } catch (error: unknown) {
      if (!isPopulateJobControlRequest) {
        clearPortfolioTxHistorySigningDispatchContextOnRuntime();
      }
      clearRuntimeDispatchContext(dispatchContext);
      const details = getRuntimeErrorDetails(error);
      scheduleOnRN(rejectOnRN, details.message, details.stack);
    }
  })();
}

export function dispatchPortfolioPopulateStartAndWaitOnRuntime(
  config: PortfolioRuntimeHostBootstrapConfig,
  req: WorkerRequest<'populate.startJob'>,
  dispatchContext: PortfolioRuntimeDispatchContext | null | undefined,
  resolveOnRN: (response: WorkerResponse<'populate.startJob'>) => void,
  rejectOnRN: (message: string, stack?: string) => void,
): void {
  'worklet';

  void (async () => {
    try {
      const initialResponse = await handlePortfolioRequestOnRuntime(
        config,
        req,
        dispatchContext?.populateJobSigningContextsByWalletId,
      );
      clearRuntimeDispatchContext(dispatchContext);

      if (!initialResponse.ok) {
        scheduleOnRN(
          resolveOnRN,
          initialResponse as WorkerResponse<'populate.startJob'>,
        );
        return;
      }

      const startResult =
        initialResponse.result as PortfolioPopulateJobStartResult;
      const jobId = String(
        startResult?.jobId || (req.params as {jobId?: string})?.jobId || '',
      ).trim();
      if (!jobId) {
        throw new Error(
          'Portfolio populate start did not return a valid jobId.',
        );
      }

      let terminalStatus = startResult.status;
      while (!terminalStatus || terminalStatus.inProgress) {
        await delayOnRuntime(TERMINAL_POPULATE_POLL_MS);
        const nextStatus = await handleGetPopulateJobStatusOnWorklet(
          config,
          jobId,
        );
        if (!nextStatus) {
          throw new Error(
            `Portfolio populate job ${jobId} became unavailable before completion.`,
          );
        }
        terminalStatus = nextStatus;
      }

      scheduleOnRN(resolveOnRN, {
        id: req.id,
        ok: true,
        result: {
          jobId,
          status: terminalStatus,
        },
      } as WorkerResponse<'populate.startJob'>);
    } catch (error: unknown) {
      clearRuntimeDispatchContext(dispatchContext);
      const details = getRuntimeErrorDetails(error);
      scheduleOnRN(rejectOnRN, details.message, details.stack);
    }
  })();
}
