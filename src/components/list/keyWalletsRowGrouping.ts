import {IsVMChain} from '../../store/wallet/utils/currency';

type GroupableRow = {
  chain?: string;
  chains?: string[];
};

const rowChain = (row?: GroupableRow): string =>
  row?.chain ?? row?.chains?.[0] ?? '';

const utxoRowAt = (rows: GroupableRow[], index: number) => {
  const row = rows[index];
  return row && !IsVMChain(rowChain(row)) ? row : undefined;
};

export interface UtxoRowGrouping {
  /** First wallet of a run of same-chain UTXO wallets: show the chain header. */
  showChainHeader: boolean;
  /** Continues the previous row's chain group (no header, tucked up). */
  isSameChain: boolean;
  /** Last row of the key: no bottom border. */
  isLast: boolean;
}

/**
 * Rows are sorted by fiat balance, so UTXO wallets of one chain can be split
 * by other chains or EVM accounts. A chain group is a run of adjacent UTXO
 * wallets on the same chain; each run gets its own header.
 *
 * Derived only from the row's neighbours in the current list, so the result
 * is the same on every render.
 */
export const getUtxoRowGrouping = (
  rows: GroupableRow[],
  index: number,
): UtxoRowGrouping => {
  const chain = rowChain(rows[index]);
  const prev = utxoRowAt(rows, index - 1);
  const startsGroup = !prev || rowChain(prev) !== chain;

  return {
    showChainHeader: startsGroup,
    isSameChain: !startsGroup,
    isLast: index === rows.length - 1,
  };
};
