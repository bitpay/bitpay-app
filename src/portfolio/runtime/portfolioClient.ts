import type {
  WorkerMethod,
  WorkerMethodMap,
  WorkerRequest,
  WorkerResponse,
} from '../core/engine/workerProtocol';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export type PortfolioClientTransport = {
  dispatch: (
    request: WorkerRequest,
    onResponse: (response: WorkerResponse) => void,
    onFatalError: (error: Error) => void,
  ) => Promise<void>;
  destroy?: () => void;
};

export class PortfolioRuntimeClient {
  private transport: PortfolioClientTransport;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private fatalError: Error | null = null;
  private terminated = false;

  constructor(transport: PortfolioClientTransport) {
    this.transport = transport;
  }

  terminate(): void {
    if (this.terminated) {
      return;
    }

    this.terminated = true;
    const error = new Error('Portfolio runtime client has been terminated.');
    this.rejectAllPending(error);
    this.transport.destroy?.();
  }

  request<M extends WorkerMethod>(
    method: M,
    params: WorkerMethodMap[M]['params'],
  ): Promise<WorkerMethodMap[M]['result']> {
    if (this.terminated) {
      return Promise.reject(
        new Error('Portfolio runtime client has been terminated.'),
      );
    }

    if (this.fatalError) {
      return Promise.reject(this.fatalError);
    }

    const id = this.nextId++;
    const request: WorkerRequest<M> = {
      id,
      method,
      params,
    } as WorkerRequest<M>;

    return new Promise<WorkerMethodMap[M]['result']>((resolve, reject) => {
      this.pending.set(id, {
        resolve: value => resolve(value as WorkerMethodMap[M]['result']),
        reject: error => reject(error),
      });

      this.transport
        .dispatch(
          request,
          response => this.handleResponse(response),
          error => this.failTransport(error),
        )
        .catch(error => {
          this.failTransport(
            error instanceof Error ? error : new Error(String(error)),
          );
        });
    });
  }

  ensureRates(
    params: WorkerMethodMap['rates.ensure']['params'],
  ): Promise<void> {
    return this.request('rates.ensure', params);
  }

  getRateSeriesCache(
    params: WorkerMethodMap['rates.getCache']['params'],
  ): Promise<WorkerMethodMap['rates.getCache']['result']> {
    return this.request('rates.getCache', params);
  }

  getSnapshotIndex(params: WorkerMethodMap['snapshots.getIndex']['params']) {
    return this.request('snapshots.getIndex', params);
  }

  clearWallet(params: WorkerMethodMap['snapshots.clearWallet']['params']) {
    return this.request('snapshots.clearWallet', params);
  }

  prepareWallet(params: WorkerMethodMap['snapshots.prepareWallet']['params']) {
    return this.request('snapshots.prepareWallet', params);
  }

  closeWalletSession(
    params: WorkerMethodMap['snapshots.closeWalletSession']['params'],
  ) {
    return this.request('snapshots.closeWalletSession', params);
  }

  processNextPage(
    params: WorkerMethodMap['snapshots.processNextPage']['params'],
  ) {
    return this.request('snapshots.processNextPage', params);
  }

  finishWallet(params: WorkerMethodMap['snapshots.finishWallet']['params']) {
    return this.request('snapshots.finishWallet', params);
  }

  getLatestSnapshot(
    params: WorkerMethodMap['snapshots.getLatestSnapshot']['params'],
  ) {
    return this.request('snapshots.getLatestSnapshot', params);
  }

  getInvalidHistory(
    params: WorkerMethodMap['snapshots.getInvalidHistory']['params'],
  ) {
    return this.request('snapshots.getInvalidHistory', params);
  }

  listSnapshots(params: WorkerMethodMap['snapshots.listSnapshots']['params']) {
    return this.request('snapshots.listSnapshots', params);
  }

  computeAnalysis(params: WorkerMethodMap['analysis.compute']['params']) {
    return this.request('analysis.compute', params);
  }

  prepareAnalysisSession(
    params: WorkerMethodMap['analysis.prepareSession']['params'],
  ) {
    return this.request('analysis.prepareSession', params);
  }

  computeAnalysisSessionScope(
    params: WorkerMethodMap['analysis.computeSessionScope']['params'],
  ) {
    return this.request('analysis.computeSessionScope', params);
  }

  disposeAnalysisSession(
    params: WorkerMethodMap['analysis.disposeSession']['params'],
  ) {
    return this.request('analysis.disposeSession', params);
  }

  computeAnalysisChart(
    params: WorkerMethodMap['analysis.computeChart']['params'],
  ) {
    return this.request('analysis.computeChart', params);
  }

  computeBalanceChartViewModel(
    params: WorkerMethodMap['analysis.computeBalanceChartViewModel']['params'],
  ) {
    return this.request('analysis.computeBalanceChartViewModel', params);
  }

  startPopulateJob(params: WorkerMethodMap['populate.startJob']['params']) {
    return this.request('populate.startJob', params);
  }

  getPopulateJobStatus(
    params: WorkerMethodMap['populate.getJobStatus']['params'] = {},
  ) {
    return this.request('populate.getJobStatus', params);
  }

  cancelPopulateJob(
    params: WorkerMethodMap['populate.cancelJob']['params'] = {},
  ) {
    return this.request('populate.cancelJob', params);
  }

  listRates(params: WorkerMethodMap['debug.listRates']['params']) {
    return this.request('debug.listRates', params);
  }

  clearRateStorage(params: WorkerMethodMap['debug.clearRates']['params'] = {}) {
    return this.request('debug.clearRates', params);
  }

  clearAllStorage(params: WorkerMethodMap['debug.clearAll']['params'] = {}) {
    return this.request('debug.clearAll', params);
  }

  kvStats(params: WorkerMethodMap['debug.kvStats']['params'] = {}) {
    return this.request('debug.kvStats', params);
  }

  getPopulateWalletTrace(
    params: WorkerMethodMap['debug.getPopulateWalletTrace']['params'],
  ) {
    return this.request('debug.getPopulateWalletTrace', params);
  }

  private handleResponse(response: WorkerResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }

    this.pending.delete(response.id);

    if ('result' in response) {
      pending.resolve(response.result);
      return;
    }

    const error = new Error(response.error || 'Portfolio runtime error.');
    if (response.stack) {
      error.stack = response.stack;
    }
    pending.reject(error);
  }

  private failTransport(error: Error): void {
    if (!this.fatalError) {
      this.fatalError = error;
    }

    this.rejectAllPending(this.fatalError);
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}
