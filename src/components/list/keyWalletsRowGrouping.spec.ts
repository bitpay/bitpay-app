import {getUtxoRowGrouping} from './keyWalletsRowGrouping';

const btc = {chain: 'btc'};
const ltc = {chain: 'ltc'};
const evmAccount = {chains: ['eth']};

const groupings = (rows: any[]) =>
  rows.map((_, index) => getUtxoRowGrouping(rows, index));

describe('getUtxoRowGrouping', () => {
  it('gives the first chain group a header', () => {
    expect(getUtxoRowGrouping([btc, btc], 0)).toEqual({
      showChainHeader: true,
      isSameChain: false,
      isLast: false,
    });
  });

  it('tucks later wallets of the same chain under the header', () => {
    expect(groupings([btc, btc, ltc])).toEqual([
      {showChainHeader: true, isSameChain: false, isLast: false},
      {showChainHeader: false, isSameChain: true, isLast: false},
      {showChainHeader: true, isSameChain: false, isLast: true},
    ]);
  });

  it('starts a new group after an EVM account, even for the same chain', () => {
    expect(groupings([btc, evmAccount, btc])[2]).toEqual({
      showChainHeader: true,
      isSameChain: false,
      isLast: true,
    });
  });

  it('is the same on every call (no state carried between renders)', () => {
    const rows = [ltc, btc, btc];
    expect(groupings(rows)).toEqual(groupings(rows));
    expect(groupings([btc])).toEqual([
      {showChainHeader: true, isSameChain: false, isLast: true},
    ]);
  });
});
