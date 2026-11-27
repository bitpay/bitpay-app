import type {Wallet} from '../../../store/wallet/wallet.models';

/** Below this a wallet's absence from the chart is not worth mentioning. */
const MIN_UNCHARTED_FIAT = 0.01;

/**
 * Visible wallets with a balance that the balance chart did not draw — left
 * out because they are quarantined, have unresolved decimals, or have no
 * usable history (for example one that replays to a negative balance).
 * Largest first.
 *
 * `chartedWalletIds` is the set the chart's visible series actually contains;
 * undefined while that is unknown, which yields no wallets rather than a
 * guess.
 */
export function getUnchartedWallets(args: {
  wallets: Wallet[];
  chartedWalletIds?: ReadonlySet<string>;
}): Wallet[] {
  const charted = args.chartedWalletIds;
  if (!charted) {
    return [];
  }

  return (args.wallets || [])
    .filter(wallet => {
      const walletId = String(wallet?.id || '').trim();
      return (
        !!walletId &&
        !charted.has(walletId) &&
        (Number(wallet?.balance?.fiat) || 0) >= MIN_UNCHARTED_FIAT
      );
    })
    .sort(
      (a, b) =>
        (Number(b?.balance?.fiat) || 0) - (Number(a?.balance?.fiat) || 0),
    );
}

/**
 * The wallet ids a balance-chart series has data for: wallets with a
 * non-zero value at any point. Undefined when the series carries no
 * per-wallet breakdown (single-wallet charts).
 */
export function getChartedWalletIds(
  walletFiatBalanceByWalletId: Record<string, number[]> | undefined,
): string[] | undefined {
  if (!walletFiatBalanceByWalletId) {
    return undefined;
  }

  return Object.keys(walletFiatBalanceByWalletId)
    .filter(walletId =>
      (walletFiatBalanceByWalletId[walletId] || []).some(
        value => Number.isFinite(value) && value !== 0,
      ),
    )
    .sort();
}
