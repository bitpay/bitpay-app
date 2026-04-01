export const PORTFOLIO_POPULATE_DISABLE_TX_THRESHOLD = 1000;

export const shouldDisablePopulateForLargeHistory = (args: {
  txCount: number;
  loadMore: boolean;
}): boolean => {
  const txCount = Number(args.txCount);
  if (!Number.isFinite(txCount)) {
    return false;
  }

  if (txCount > PORTFOLIO_POPULATE_DISABLE_TX_THRESHOLD) {
    return true;
  }

  return txCount >= PORTFOLIO_POPULATE_DISABLE_TX_THRESHOLD && !!args.loadMore;
};
