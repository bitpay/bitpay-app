import type {WorkerMethod, WorkerRequest} from '../core/engine/workerProtocol';

const WORKLET_METHODS: Record<WorkerMethod, true> = {
  'rates.ensure': true,
  'rates.getCache': true,
  'snapshots.getIndex': true,
  'snapshots.clearWallet': true,
  'snapshots.prepareWallet': true,
  'snapshots.closeWalletSession': true,
  'snapshots.processNextPage': true,
  'snapshots.finishWallet': true,
  'snapshots.getLatestSnapshot': true,
  'snapshots.getInvalidHistory': true,
  'snapshots.listSnapshots': true,
  'analysis.compute': true,
  'analysis.prepareSession': true,
  'analysis.computeSessionScope': true,
  'analysis.disposeSession': true,
  'analysis.computeChart': true,
  'analysis.computeBalanceChartViewModel': true,
  'populate.startJob': true,
  'populate.getJobStatus': true,
  'populate.cancelJob': true,
  'debug.listRates': true,
  'debug.clearRates': true,
  'debug.clearAll': true,
  'debug.kvStats': true,
  'debug.getPopulateWalletTrace': true,
};

export function isWorkletPopulateMethod(method: WorkerMethod): boolean {
  return (
    method === 'snapshots.prepareWallet' ||
    method === 'snapshots.processNextPage' ||
    method === 'snapshots.finishWallet' ||
    method === 'snapshots.closeWalletSession'
  );
}

export function shouldDispatchPortfolioRequestOnRuntimeWorklet(
  requestOrMethod: WorkerRequest | WorkerMethod,
): boolean {
  const method =
    typeof requestOrMethod === 'string'
      ? requestOrMethod
      : requestOrMethod.method;

  return WORKLET_METHODS[method] === true;
}
