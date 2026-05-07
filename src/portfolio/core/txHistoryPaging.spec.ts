import {
  getTxHistoryEntryId,
  getTxHistoryLogicalPageSize,
} from './txHistoryPaging';

describe('txHistoryPaging', () => {
  it('counts logical txs by unique normalized history ID within a page', () => {
    const txs = [
      {
        txid: 'fund',
        time: 1704067200,
        action: 'received',
        amount: '1000',
        fees: '0',
      },
      {
        txid: 'fund',
        time: 1704067200,
        action: 'received',
        amount: '1000',
        fees: '0',
      },
      {
        txid: 'spend',
        time: 1704153600,
        action: 'sent',
        amount: '400',
        fees: '10',
      },
    ];

    expect(getTxHistoryLogicalPageSize(txs as any)).toBe(2);
  });

  it('collapses duplicate rows that only differ by internal BWS id', () => {
    const txs = [
      {
        id: 'internal-1',
        time: 1704067200,
        action: 'received',
        amount: '1000',
        fees: '0',
      },
      {
        id: 'internal-2',
        time: 1704067200,
        action: 'received',
        amount: '1000',
        fees: '0',
      },
    ];

    expect(getTxHistoryLogicalPageSize(txs as any)).toBe(1);
  });

  it('falls back to a composite ID when txid is missing', () => {
    const tx = {
      time: 1704067200,
      action: 'received',
      amount: '1000',
      fees: '0',
    };
    expect(getTxHistoryEntryId(tx as any)).toBe('1704067200:received:1000:0');
  });

  it('does not use the internal BWS id as the canonical history identity', () => {
    const tx = {
      id: 'internal-1',
      time: 1704067200,
      action: 'received',
      amount: '1000',
      fees: '0',
    };

    expect(getTxHistoryEntryId(tx as any)).toBe('1704067200:received:1000:0');
  });
});
