import type {SnapshotIndexV2} from '../core/pnl/snapshotStore';
import type {BalanceSnapshotStored} from '../core/pnl/types';
import type {Tx, WalletCredentials, WalletSummary} from '../core/types';

export type BalanceDiagnosticTxPage = {
  pageNumber: number;
  skip: number;
  txs: Tx[];
};

export type BalanceDiagnosticResult = {
  summaryLine: string;
  reportText: string;
};

export type BalanceDiagnosticPopulateCapture = {
  capturedAtMs?: number;
  beforeIndex?: SnapshotIndexV2 | null;
  afterIndex?: SnapshotIndexV2 | null;
  [key: string]: unknown;
};

const toIso = (ms?: number): string => {
  if (!Number.isFinite(Number(ms))) return 'n/a';
  try {
    return new Date(Number(ms)).toISOString();
  } catch {
    return 'n/a';
  }
};

const getTxCount = (pages: BalanceDiagnosticTxPage[]): number =>
  pages.reduce((total, page) => total + (page.txs?.length || 0), 0);

const getIndexSummary = (index?: SnapshotIndexV2 | null): string => {
  if (!index) return 'none';
  return [
    `chunks=${index.chunks?.length || 0}`,
    `nextSkip=${index.checkpoint?.nextSkip ?? 0}`,
    `balanceAtomic=${index.checkpoint?.balanceAtomic ?? '0'}`,
  ].join(', ');
};

export function buildWalletBalanceDiagnostic(args: {
  wallet: WalletSummary;
  credentials: WalletCredentials;
  txPages: BalanceDiagnosticTxPage[];
  index?: SnapshotIndexV2 | null;
  populateCapture?: BalanceDiagnosticPopulateCapture;
  snapshots: BalanceSnapshotStored[];
}): BalanceDiagnosticResult {
  const pageCount = args.txPages.length;
  const txCount = getTxCount(args.txPages);
  const snapshotCount = args.snapshots.length;
  const walletId = String(
    args.wallet.walletId || args.credentials.walletId || '',
  );
  const summaryLine = [
    `wallet=${walletId || 'unknown'}`,
    `pages=${pageCount}`,
    `txs=${txCount}`,
    `snapshots=${snapshotCount}`,
  ].join(' ');

  const reportText = [
    'Wallet balance diagnostic compatibility report',
    '',
    'Detailed diagnostic trace capture has been removed from the portfolio runtime.',
    'This helper remains so the protected debug screen can display fetched history and snapshot counts.',
    '',
    `generatedAt: ${toIso(Date.now())}`,
    `walletId: ${walletId || 'unknown'}`,
    `chain: ${String(args.wallet.chain || args.credentials.chain || '')}`,
    `network: ${String(args.wallet.network || args.credentials.network || '')}`,
    `currency: ${String(
      args.wallet.currencyAbbreviation || args.credentials.coin || '',
    )}`,
    `pages: ${pageCount}`,
    `txs: ${txCount}`,
    `snapshots: ${snapshotCount}`,
    `index: ${getIndexSummary(args.index)}`,
    `populateCaptureAt: ${toIso(args.populateCapture?.capturedAtMs)}`,
    `populateBeforeIndex: ${getIndexSummary(
      args.populateCapture?.beforeIndex,
    )}`,
    `populateAfterIndex: ${getIndexSummary(args.populateCapture?.afterIndex)}`,
  ].join('\n');

  return {
    summaryLine,
    reportText,
  };
}
