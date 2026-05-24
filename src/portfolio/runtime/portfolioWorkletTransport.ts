import {runOnRuntimeAsync, type WorkletRuntime} from 'react-native-worklets';

import {
  createPortfolioTxHistorySigningDispatchContextOnRN,
  derivePortfolioTxHistorySigningAuthorityOnRN,
  disposePortfolioTxHistorySigningDispatchContext,
  type PortfolioTxHistorySigningAuthority,
  type PortfolioTxHistorySigningDispatchContext,
} from '../adapters/rn/txHistorySigning';
import {
  buildRuntimeErrorFromDetails,
  toRuntimeError,
} from '../adapters/rn/workletRuntimeShared';
import type {
  WorkerRequest,
  WorkerResponse,
} from '../core/engine/workerProtocol';
import type {WalletCredentials} from '../core/types';
import type {WalletSummary} from '../core/types';
import {toPortfolioRuntimeWalletCredentials} from '../core/runtimeWalletCredentials';
import {normalizeWalletUnitDecimals} from '../core/format';
import type {PortfolioClientTransport} from './portfolioClient';
import type {PortfolioRuntimeHostBootstrapConfig} from './portfolioRuntimeHostConfig';
import {shouldDispatchPortfolioRequestOnRuntimeWorklet} from './portfolioRequestRouting';
import {
  dispatchPortfolioPopulateStartAndWaitOnRuntime,
  dispatchPortfolioRequestOnRuntime,
  type PortfolioRuntimeDispatchContext,
} from './portfolioWorkletDispatch';
import type {PortfolioPopulateJobSigningContextMap} from './worklet/portfolioPopulateJobWorklet';

export type WorkletPortfolioTransportConfig = {
  runtime: WorkletRuntime;
  host: PortfolioRuntimeHostBootstrapConfig;
};

const TERMINAL_WALLET_CLEANUP_METHODS = new Set<string>([
  'snapshots.closeWalletSession',
  'snapshots.clearWallet',
]);

function getWalletIdFromRequest(request: WorkerRequest): string | undefined {
  const params = request.params as any;
  switch (request.method) {
    case 'snapshots.prepareWallet':
      return typeof params?.wallet?.walletId === 'string'
        ? params.wallet.walletId
        : undefined;
    case 'snapshots.processNextPage':
    case 'snapshots.closeWalletSession':
    case 'snapshots.clearWallet':
    case 'snapshots.getIndex':
    case 'snapshots.getLatestSnapshot':
    case 'snapshots.getInvalidHistory':
    case 'snapshots.listSnapshots':
    case 'snapshots.finishWallet':
      return typeof params?.walletId === 'string' ? params.walletId : undefined;
    default:
      return undefined;
  }
}

function isPopulateJobControlRequest(request: WorkerRequest): boolean {
  return (
    request.method === 'populate.startJob' ||
    request.method === 'populate.getJobStatus' ||
    request.method === 'populate.cancelJob'
  );
}

function sanitizeWalletSummaryForRuntime(
  summary: WalletSummary | null | undefined,
): WalletSummary | undefined {
  if (!summary) {
    return undefined;
  }

  const sanitized: WalletSummary = {
    walletId: String(summary.walletId || ''),
    walletName: String(summary.walletName || ''),
    chain: String(summary.chain || ''),
    network: String(summary.network || ''),
    currencyAbbreviation: String(summary.currencyAbbreviation || ''),
    tokenAddress:
      typeof summary.tokenAddress === 'string'
        ? summary.tokenAddress
        : undefined,
    balanceAtomic: String(summary.balanceAtomic || ''),
    balanceFormatted: String(summary.balanceFormatted || ''),
  };

  const unitDecimals = normalizeWalletUnitDecimals(summary.unitDecimals);
  if (typeof unitDecimals === 'number') {
    sanitized.unitDecimals = unitDecimals;
  }

  return sanitized;
}

function sanitizeStoredWalletForRuntime(wallet: any): any {
  const summary = sanitizeWalletSummaryForRuntime(wallet?.summary);
  const walletId = String(wallet?.walletId || summary?.walletId || '').trim();

  return {
    walletId,
    addedAt: wallet?.addedAt,
    summary,
    credentials: toPortfolioRuntimeWalletCredentials(wallet?.credentials),
  };
}

function buildRuntimeRequestForWorklet(request: WorkerRequest): WorkerRequest {
  if (request.method === 'snapshots.prepareWallet') {
    const params = (request.params || {}) as any;
    return {
      ...request,
      params: {
        ...params,
        wallet: sanitizeWalletSummaryForRuntime(params.wallet),
        credentials: toPortfolioRuntimeWalletCredentials(params.credentials),
      },
    } as WorkerRequest;
  }

  if (
    request.method === 'populate.startJob' ||
    request.method === 'analysis.compute' ||
    request.method === 'analysis.prepareSession' ||
    request.method === 'analysis.computeChart' ||
    request.method === 'analysis.computeBalanceChartViewModel'
  ) {
    const params = (request.params || {}) as any;
    const wallets = Array.isArray(params.wallets) ? params.wallets : [];
    return {
      ...request,
      params: {
        ...params,
        wallets: wallets.map(sanitizeStoredWalletForRuntime),
      },
    } as WorkerRequest;
  }

  return request;
}

function deriveSigningAuthorityFromCredentials(
  credentials: WalletCredentials | null | undefined,
): PortfolioTxHistorySigningAuthority | undefined {
  let requestPrivKey = String(
    ((credentials || {}) as WalletCredentials).requestPrivKey || '',
  ).trim();

  if (!requestPrivKey) {
    return undefined;
  }

  try {
    const signingAuthority = derivePortfolioTxHistorySigningAuthorityOnRN({
      requestPrivKey,
    });
    return signingAuthority;
  } catch {
    throw new Error('Portfolio txhistory signing authority derivation failed.');
  } finally {
    requestPrivKey = '';
  }
}

function buildSingleRequestSigningContextForRequest(args: {
  request: WorkerRequest;
  sessionSigningAuthorityByWalletId: Map<
    string,
    PortfolioTxHistorySigningAuthority
  >;
}): PortfolioTxHistorySigningDispatchContext | undefined {
  if (isPopulateJobControlRequest(args.request)) {
    return undefined;
  }

  const walletId = getWalletIdFromRequest(args.request);
  const signingAuthority =
    walletId && args.request.method === 'snapshots.processNextPage'
      ? args.sessionSigningAuthorityByWalletId.get(walletId)
      : undefined;

  // Dispatch contexts always carry Nitro Fetch plumbing; only the optional
  // signingAuthority makes a processNextPage context signing-capable.
  // Even requests that do not need BWS signing can still need Nitro Fetch on
  // the runtime (for example, analysis/chart rate warming). Always provide the
  // shared request context so non-wallet worklet queries keep working with
  // fetch preview disabled.
  return createPortfolioTxHistorySigningDispatchContextOnRN({
    signingAuthority,
    requestCount: args.request.method === 'snapshots.processNextPage' ? 4 : 1,
  });
}

function buildPopulateJobSigningContextsForRequest(
  request: WorkerRequest,
): PortfolioPopulateJobSigningContextMap | undefined {
  if (request.method !== 'populate.startJob') {
    return undefined;
  }

  const wallets = Array.isArray((request.params as any)?.wallets)
    ? ((request.params as any).wallets as Array<{
        walletId?: string;
        summary?: {walletId?: string};
        credentials?: WalletCredentials;
      }>)
    : [];

  const out: PortfolioPopulateJobSigningContextMap = {};

  try {
    for (const wallet of wallets) {
      const walletId = String(
        wallet?.summary?.walletId || wallet?.walletId || '',
      ).trim();
      if (!walletId) {
        continue;
      }

      const signingAuthority = deriveSigningAuthorityFromCredentials(
        wallet?.credentials,
      );
      out[walletId] = createPortfolioTxHistorySigningDispatchContextOnRN({
        signingAuthority,
        requestCount: 4,
      });
    }
  } catch (error: unknown) {
    clearPopulateSigningContextMapOnJS(out);
    throw error;
  }

  return Object.keys(out).length ? out : undefined;
}

function clearPopulateSigningContextMapOnJS(
  map: PortfolioPopulateJobSigningContextMap | undefined,
): void {
  if (!map) {
    return;
  }

  for (const walletId of Object.keys(map)) {
    const context = map[walletId];
    if (context) {
      disposePortfolioTxHistorySigningDispatchContext(context);
    }
    delete map[walletId];
  }
}

function clearTransportDispatchContextOnJS(
  dispatchContext: PortfolioRuntimeDispatchContext | undefined,
): void {
  if (!dispatchContext) {
    return;
  }

  const singleRequestSigningContext =
    dispatchContext.singleRequestSigningContext;
  if (singleRequestSigningContext) {
    disposePortfolioTxHistorySigningDispatchContext(
      singleRequestSigningContext,
    );
  }

  const populateJobSigningContextsByWalletId =
    dispatchContext.populateJobSigningContextsByWalletId;
  if (populateJobSigningContextsByWalletId) {
    clearPopulateSigningContextMapOnJS(populateJobSigningContextsByWalletId);
  }

  delete dispatchContext.singleRequestSigningContext;
  delete dispatchContext.populateJobSigningContextsByWalletId;
}

function reconcileSessionCredentialsAfterResponse(args: {
  request: WorkerRequest;
  response?: WorkerResponse;
  walletId?: string;
  sessionSigningAuthorityByWalletId: Map<
    string,
    PortfolioTxHistorySigningAuthority
  >;
}): void {
  const {request, response, walletId, sessionSigningAuthorityByWalletId} = args;

  if (request.method === 'debug.clearAll') {
    sessionSigningAuthorityByWalletId.clear();
    return;
  }

  if (!walletId) {
    return;
  }

  const shouldDeleteCredentials =
    TERMINAL_WALLET_CLEANUP_METHODS.has(request.method) ||
    (response?.ok === true && request.method === 'snapshots.finishWallet') ||
    (response?.ok === false &&
      (request.method === 'snapshots.prepareWallet' ||
        request.method === 'snapshots.processNextPage' ||
        request.method === 'snapshots.finishWallet'));

  if (shouldDeleteCredentials) {
    sessionSigningAuthorityByWalletId.delete(walletId);
  }
}

function reconcileSessionCredentialsAfterFatalError(args: {
  request: WorkerRequest;
  walletId?: string;
  sessionSigningAuthorityByWalletId: Map<
    string,
    PortfolioTxHistorySigningAuthority
  >;
}): void {
  const {request, walletId, sessionSigningAuthorityByWalletId} = args;
  if (request.method === 'debug.clearAll') {
    sessionSigningAuthorityByWalletId.clear();
    return;
  }

  if (!walletId) {
    return;
  }

  if (
    request.method === 'snapshots.closeWalletSession' ||
    request.method === 'snapshots.clearWallet' ||
    request.method === 'snapshots.finishWallet' ||
    request.method === 'snapshots.processNextPage' ||
    request.method === 'snapshots.prepareWallet'
  ) {
    sessionSigningAuthorityByWalletId.delete(walletId);
  }
}

function shouldAwaitPopulateTerminalResponse(
  request: WorkerRequest,
): request is WorkerRequest<'populate.startJob'> {
  return (
    request.method === 'populate.startJob' &&
    (request.params as {awaitTerminal?: boolean})?.awaitTerminal === true
  );
}

export function createWorkletPortfolioTransport(
  config: WorkletPortfolioTransportConfig,
): PortfolioClientTransport {
  // Transport-owned session signing authority for the foreground
  // prepareWallet -> processNextPage flow. Values are derived from
  // requestPrivKey on JS, never raw credentials, and are cleared on wallet
  // terminal/error/reset/destroy paths.
  const sessionSigningAuthorityByWalletId = new Map<
    string,
    PortfolioTxHistorySigningAuthority
  >();

  return {
    dispatch: async (
      request: WorkerRequest,
      onResponse: (response: WorkerResponse) => void,
      onFatalError: (error: Error) => void,
    ): Promise<void> => {
      const walletId = getWalletIdFromRequest(request);
      let runtimeRequest = request;
      let dispatchContext: PortfolioRuntimeDispatchContext | undefined;

      try {
        if (request.method === 'snapshots.prepareWallet' && walletId) {
          sessionSigningAuthorityByWalletId.delete(walletId);
          const credentials = (request.params as any)
            ?.credentials as WalletCredentials;
          const signingAuthority =
            deriveSigningAuthorityFromCredentials(credentials);
          if (signingAuthority) {
            sessionSigningAuthorityByWalletId.set(walletId, signingAuthority);
          }
        }

        if (!shouldDispatchPortfolioRequestOnRuntimeWorklet(request)) {
          reconcileSessionCredentialsAfterFatalError({
            request,
            walletId,
            sessionSigningAuthorityByWalletId,
          });
          onFatalError(
            new Error(
              `Portfolio request ${String(
                request.method,
              )} is not routed to the worklet runtime.`,
            ),
          );
          return;
        }

        runtimeRequest = buildRuntimeRequestForWorklet(request);
        dispatchContext = {
          singleRequestSigningContext:
            buildSingleRequestSigningContextForRequest({
              request: runtimeRequest,
              sessionSigningAuthorityByWalletId,
            }),
          populateJobSigningContextsByWalletId:
            buildPopulateJobSigningContextsForRequest(request),
        };

        const dispatchOnRuntime = shouldAwaitPopulateTerminalResponse(
          runtimeRequest,
        )
          ? dispatchPortfolioPopulateStartAndWaitOnRuntime
          : dispatchPortfolioRequestOnRuntime;

        await runOnRuntimeAsync(
          config.runtime,
          dispatchOnRuntime,
          config.host,
          runtimeRequest,
          dispatchContext,
          (response: WorkerResponse) => {
            reconcileSessionCredentialsAfterResponse({
              request: runtimeRequest,
              response,
              walletId,
              sessionSigningAuthorityByWalletId,
            });
            onResponse(response);
          },
          (message: string, stack?: string) => {
            reconcileSessionCredentialsAfterFatalError({
              request: runtimeRequest,
              walletId,
              sessionSigningAuthorityByWalletId,
            });
            onFatalError(buildRuntimeErrorFromDetails(message, stack));
          },
        );
      } catch (error: unknown) {
        clearTransportDispatchContextOnJS(dispatchContext);
        reconcileSessionCredentialsAfterFatalError({
          request: runtimeRequest,
          walletId,
          sessionSigningAuthorityByWalletId,
        });
        onFatalError(toRuntimeError(error));
      } finally {
        clearTransportDispatchContextOnJS(dispatchContext);
      }
    },
    destroy: () => {
      sessionSigningAuthorityByWalletId.clear();
    },
  };
}
