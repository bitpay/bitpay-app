import {parseAtomicToBigint} from './format';
import type {Tx, WalletCredentials} from './types';

export type TokenWalletTxHistoryContext = {
  tokenAddress?: string;
  receiveAddress?: string;
  chain?: string;
  currencyAbbreviation?: string;
};

export type PreparedTokenWalletTxHistoryRow = {
  tx: Tx;
  effectAmountAtomic?: string;
};

const toOptionalString = (value: unknown): string | undefined => {
  'worklet';

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

const normalizeComparableAddress = (
  value: unknown,
  chain: string | undefined,
): string | undefined => {
  'worklet';

  const normalized = toOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  return String(chain || '')
    .trim()
    .toLowerCase() === 'sol'
    ? normalized
    : normalized.toLowerCase();
};

const cloneTxForNormalization = (tx: Tx): Tx => {
  'worklet';

  const out = {...tx};
  if (Array.isArray((tx as any)?.effects)) {
    out.effects = (tx as any).effects.map((effect: any) => ({...effect}));
  }
  return out;
};

const sumEffectAmountsAtomic = (effects: any[]): string => {
  'worklet';

  let total = 0n;
  for (const effect of effects) {
    total += parseAtomicToBigint((effect as any)?.amount ?? 0);
  }
  return total.toString();
};

export const buildTokenWalletTxHistoryContextFromCredentials = (
  credentials: WalletCredentials | undefined,
): TokenWalletTxHistoryContext => {
  'worklet';

  return {
    tokenAddress:
      toOptionalString((credentials as any)?.token?.address) ||
      toOptionalString((credentials as any)?.tokenAddress),
    receiveAddress: toOptionalString((credentials as any)?.receiveAddress),
    chain: toOptionalString((credentials as any)?.chain),
    currencyAbbreviation:
      toOptionalString((credentials as any)?.token?.symbol) ||
      toOptionalString((credentials as any)?.coin),
  };
};

export const prepareTokenWalletTxHistoryRow = (args: {
  tx: Tx;
  context: TokenWalletTxHistoryContext;
}): PreparedTokenWalletTxHistoryRow | null => {
  'worklet';

  const chain =
    toOptionalString(args.context.chain) ||
    toOptionalString((args.tx as any)?.chain);
  const tokenAddress = normalizeComparableAddress(
    args.context.tokenAddress,
    chain,
  );
  const receiveAddress = normalizeComparableAddress(
    args.context.receiveAddress,
    chain,
  );
  const tx = cloneTxForNormalization(args.tx);

  if (args.context.currencyAbbreviation) {
    tx.coin = args.context.currencyAbbreviation;
  }
  if (chain) {
    tx.chain = chain;
  }

  if (!tokenAddress) {
    return {tx};
  }

  const effects = Array.isArray((tx as any)?.effects)
    ? ((tx as any).effects as any[])
    : null;
  if (!effects || effects.length === 0) {
    return {tx};
  }

  const action = String((tx as any)?.action || (tx as any)?.type || '')
    .trim()
    .toLowerCase();

  const filteredEffects = effects.filter(effect => {
    const effectTokenAddress = normalizeComparableAddress(
      effect?.contractAddress,
      chain,
    );
    if (effectTokenAddress !== tokenAddress) {
      return false;
    }

    if (action !== 'received' || !receiveAddress) {
      return true;
    }

    return normalizeComparableAddress(effect?.to, chain) === receiveAddress;
  });

  tx.effects = filteredEffects;
  if (!filteredEffects.length) {
    return null;
  }

  return {
    tx,
    effectAmountAtomic: sumEffectAmountsAtomic(filteredEffects),
  };
};

export const normalizeTokenWalletTxHistoryPage = (args: {
  txs: Tx[];
  context: TokenWalletTxHistoryContext;
}): Tx[] => {
  'worklet';

  const tokenAddress = toOptionalString(args.context.tokenAddress);
  if (!tokenAddress) {
    return args.txs || [];
  }

  const out: Tx[] = [];
  for (const tx of args.txs || []) {
    const prepared = prepareTokenWalletTxHistoryRow({
      tx,
      context: args.context,
    });
    if (!prepared) {
      continue;
    }
    if (prepared.effectAmountAtomic === '0') {
      continue;
    }
    if (prepared.effectAmountAtomic !== undefined) {
      prepared.tx.amount = prepared.effectAmountAtomic;
    }
    out.push(prepared.tx);
  }
  return out;
};
