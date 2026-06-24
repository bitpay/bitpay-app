import type {Tx} from './types';

export const getTxHistoryEntryId = (tx: Tx): string => {
  'worklet';

  const txid = String(
    (tx as any)?.txid ??
      (tx as any)?.txHash ??
      (tx as any)?.txhash ??
      (tx as any)?.hash ??
      '',
  ).trim();
  if (txid) return txid;

  // Do not fall back to BWS's internal `id`. For some wallet histories,
  // duplicate economic rows can share the same on-chain transaction while
  // carrying different internal ids, which breaks dedupe and paging.
  const parts = [
    String((tx as any)?.time ?? ''),
    String((tx as any)?.action ?? ''),
    String((tx as any)?.amount ?? ''),
    String((tx as any)?.fees ?? ''),
  ];
  const optionalParts = [
    String(
      (tx as any)?.blockheight ??
        (tx as any)?.blockHeight ??
        (tx as any)?.block_height ??
        '',
    ).trim(),
    String((tx as any)?.nonce ?? '').trim(),
    String((tx as any)?.addressTo ?? (tx as any)?.toAddress ?? '').trim(),
  ];

  while (optionalParts.length && !optionalParts[optionalParts.length - 1]) {
    optionalParts.pop();
  }

  return [...parts, ...optionalParts].join(':');
};

export const getTxHistoryLogicalPageSize = (txs: Tx[]): number => {
  'worklet';

  if (!txs.length) return 0;

  const seen = new Set<string>();
  for (const tx of txs) {
    const id = getTxHistoryEntryId(tx);
    if (!id) continue;
    seen.add(id);
  }
  return seen.size;
};

export const dedupeTxHistoryPage = (txs: Tx[]): Tx[] => {
  'worklet';

  if (txs.length <= 1) return txs;

  const seen = new Set<string>();
  const out: Tx[] = [];
  for (const tx of txs) {
    const id = getTxHistoryEntryId(tx);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(tx);
  }
  return out;
};
