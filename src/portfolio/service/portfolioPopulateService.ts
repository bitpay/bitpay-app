import {BASE_BWS_URL, BWC_TIMEOUT} from '../../constants/config';
import {CANONICAL_FIAT_QUOTE} from '../core/fiatRatesShared';
import type {BwsConfig} from '../core/shared/bws';
import type {StoredWallet} from '../core/types';
import type {SnapshotIngestConfig} from '../core/engine/portfolioEngineTypes';
import {
  type PortfolioPopulateJobStatus,
  type PortfolioPopulateRunResult,
} from '../core/engine/populateJob';
import type {PortfolioRuntimeClient} from '../runtime/portfolioClient';

export type {
  PortfolioPopulateProgress,
  PortfolioPopulateRunResult,
  PortfolioPopulateWalletRunResult,
} from '../core/engine/populateJob';

export type PortfolioPopulateServiceOptions = {
  client: PortfolioRuntimeClient;
  bwsConfig?: BwsConfig;
  ingestConfig?: Partial<SnapshotIngestConfig>;
  pageSize?: number;
  emitRows?: number;
  statusPollMs?: number;
};

const PORTFOLIO_POPULATE_ABORTED_ERROR_MESSAGE = 'PORTFOLIO_POPULATE_ABORTED';
const DEFAULT_POPULATE_STATUS_POLL_MS = 200;

function createDefaultBwsConfig(): BwsConfig {
  return {
    baseUrl: BASE_BWS_URL,
    timeoutMs: BWC_TIMEOUT,
  };
}

function createDefaultIngestConfig(): SnapshotIngestConfig {
  return {
    quoteCurrency: CANONICAL_FIAT_QUOTE,
    compressionEnabled: true,
    chunkRows: 128,
  };
}

function buildFallbackRunResult(status: {
  startedAt: number;
  finishedAt?: number;
  disabledForLargeHistory?: boolean;
  state?: string;
}): PortfolioPopulateRunResult {
  return {
    startedAt: status.startedAt,
    finishedAt: Number(status.finishedAt || Date.now()),
    cancelled: status.state === 'cancelled',
    disabledForLargeHistory: status.disabledForLargeHistory === true,
    results: [],
  };
}

function toJobFailureMessage(status: {
  failureMessage?: string;
  errors?: Array<{message?: string}>;
}): string {
  const firstError = Array.isArray(status.errors)
    ? status.errors[0]
    : undefined;
  return (
    String(status.failureMessage || '').trim() ||
    String(firstError?.message || '').trim() ||
    'Portfolio populate job failed.'
  );
}

function createRequestedPopulateJobId(): string {
  return `portfolio-populate-js-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export type PortfolioPopulateRunOutcome = PortfolioPopulateRunResult & {
  status: PortfolioPopulateJobStatus;
};

export class PortfolioPopulateService {
  private client: PortfolioRuntimeClient;
  private bwsConfig: BwsConfig;
  private ingestConfig: SnapshotIngestConfig;
  private pageSize: number;
  private emitRows?: number;
  private statusPollMs: number;
  private cancelRequested = false;
  private activeJobId: string | undefined;
  private cancelSent = false;

  constructor(options: PortfolioPopulateServiceOptions) {
    this.client = options.client;
    this.bwsConfig = options.bwsConfig ?? createDefaultBwsConfig();
    this.ingestConfig = {
      ...createDefaultIngestConfig(),
      ...(options.ingestConfig || {}),
      quoteCurrency: CANONICAL_FIAT_QUOTE,
    };
    this.pageSize =
      typeof options.pageSize === 'number' && Number.isFinite(options.pageSize)
        ? Math.max(1, Math.floor(options.pageSize))
        : 1000;
    this.emitRows =
      typeof options.emitRows === 'number' && Number.isFinite(options.emitRows)
        ? Math.max(1, Math.floor(options.emitRows))
        : undefined;
    this.statusPollMs =
      typeof options.statusPollMs === 'number' &&
      Number.isFinite(options.statusPollMs)
        ? Math.max(0, Math.floor(options.statusPollMs))
        : DEFAULT_POPULATE_STATUS_POLL_MS;
  }

  cancel(): void {
    this.cancelRequested = true;
    if (this.activeJobId && !this.cancelSent) {
      this.cancelSent = true;
      void this.client
        .cancelPopulateJob({jobId: this.activeJobId})
        .catch(() => {
          this.cancelSent = false;
        });
    }
  }

  resetCancel(): void {
    this.cancelRequested = false;
    this.cancelSent = false;
  }

  isCancelled(): boolean {
    return this.cancelRequested;
  }

  async populateWallets(args: {
    wallets: StoredWallet[];
    onProgress?: (status: PortfolioPopulateJobStatus) => void | Promise<void>;
  }): Promise<PortfolioPopulateRunOutcome> {
    this.resetCancel();
    const requestedJobId = createRequestedPopulateJobId();
    this.activeJobId = requestedJobId;

    try {
      const start = await this.client.startPopulateJob({
        jobId: requestedJobId,
        awaitTerminal: false,
        cfg: this.bwsConfig,
        wallets: args.wallets || [],
        ingest: this.ingestConfig,
        pageSize: this.pageSize,
        emitRows: this.emitRows,
      });
      const status = start?.status;
      if (!status) {
        throw new Error(
          'Portfolio populate job status is unavailable on the runtime.',
        );
      }

      if (args.onProgress) {
        await args.onProgress(status);
      }

      if (status.state === 'failed') {
        throw new Error(toJobFailureMessage(status));
      }

      let terminalStatus = status;
      while (terminalStatus.inProgress) {
        await new Promise(resolve => {
          setTimeout(resolve, this.statusPollMs);
        });
        const nextStatus = await this.client.getPopulateJobStatus({
          jobId: requestedJobId,
        });
        if (!nextStatus) {
          throw new Error(
            'Portfolio populate job status became unavailable on the runtime.',
          );
        }

        terminalStatus = nextStatus;
        if (args.onProgress) {
          await args.onProgress(terminalStatus);
        }

        if (terminalStatus.state === 'failed') {
          throw new Error(toJobFailureMessage(terminalStatus));
        }
      }

      const runResult =
        terminalStatus.result || buildFallbackRunResult(terminalStatus);
      return {
        ...runResult,
        status: terminalStatus,
      };
    } finally {
      this.activeJobId = undefined;
    }
  }
}

export function throwIfPortfolioPopulateCancelled(
  service: Pick<PortfolioPopulateService, 'isCancelled'>,
): void {
  if (service.isCancelled()) {
    throw new Error(PORTFOLIO_POPULATE_ABORTED_ERROR_MESSAGE);
  }
}
