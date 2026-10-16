import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {
  RangoBlockchainMeta,
  RangoEnv,
  RangoTransaction,
  RangoTransactionType,
} from '../../../../store/swap-crypto/models/rango.models';

export const rangoEnv: RangoEnv = __DEV__ ? 'sandbox' : 'production';

/**
 * Master switch for the Rango offer.
 *
 * Setting `showOffer: false` on the default offer is NOT sufficient — the
 * offer selector recomputes `showOffer` from isPairSupported() for every
 * exchange in SwapCryptoSupportedExchanges and overwrites it. This flag is
 * checked after that, so it is the only gate that actually holds.
 *
 * Flip to true in the PR that wires signing and broadcast.
 */
export const RANGO_EXECUTION_ENABLED = false;

/**
 * Default slippage, in percent. Rango rejects the swap rather than filling
 * past this, so it is a user-protection bound rather than a target.
 */
export const RANGO_DEFAULT_SLIPPAGE = 1.5;

/**
 * BitPay chain code -> Rango blockchain name.
 *
 * Verified against GET /basic/meta/blockchains. Rango exposes 104 chains; only
 * the ones the wallet can custody are listed here, because a route we cannot
 * sign is worse than no route at all.
 */
export const BITPAY_CHAIN_TO_RANGO: {[chain: string]: string} = {
  btc: 'BTC',
  bch: 'BCH',
  doge: 'DOGE',
  ltc: 'LTC',
  eth: 'ETH',
  matic: 'POLYGON',
  pol: 'POLYGON',
  arb: 'ARBITRUM',
  base: 'BASE',
  op: 'OPTIMISM',
  sol: 'SOLANA',
  // xrp -> 'XRPL' exists and is enabled upstream, but Rango returns an XRPL
  // transaction type the wallet does not sign yet. Deliberately omitted until
  // that path is implemented — see rangoSupportsTxType().
};

/**
 * Deduplicated Rango blockchain names for the chains we support. Both `matic`
 * and `pol` map to POLYGON, so Object.values() alone would repeat it.
 */
export const RANGO_SUPPORTED_BLOCKCHAINS: string[] = Array.from(
  new Set(Object.values(BITPAY_CHAIN_TO_RANGO)),
);

export const RANGO_TO_BITPAY_CHAIN: {[name: string]: string} = Object.entries(
  BITPAY_CHAIN_TO_RANGO,
).reduce((acc, [bitpayChain, rangoName]) => {
  // 'matic' wins over 'pol' for the reverse lookup so existing wallets keep
  // resolving to the chain code the rest of the app already uses.
  if (!acc[rangoName] || bitpayChain === 'matic') {
    acc[rangoName] = bitpayChain;
  }
  return acc;
}, {} as {[name: string]: string});

/**
 * Transaction types the wallet can currently build and sign.
 *
 * EVM      -> contract call, with an optional ERC20 approval first
 * TRANSFER -> UTXO send with the memo written as an OP_RETURN output
 * SOLANA   -> serialised Solana transaction
 */
export const RANGO_SUPPORTED_TX_TYPES: RangoTransactionType[] = [
  'EVM',
  'TRANSFER',
  'SOLANA',
];

export const rangoSupportsTxType = (
  type: RangoTransactionType | undefined,
): boolean => !!type && RANGO_SUPPORTED_TX_TYPES.includes(type);

export const getRangoChain = (chain: string): string | undefined =>
  BITPAY_CHAIN_TO_RANGO[chain?.toLowerCase()];

export const getBitpayChainFromRango = (
  blockchain: string,
): string | undefined => RANGO_TO_BITPAY_CHAIN[blockchain?.toUpperCase()];

/**
 * Builds Rango's asset identifier.
 *
 *   native: BLOCKCHAIN.SYMBOL                 e.g. BTC.BTC, ETH.ETH
 *   token:  BLOCKCHAIN.SYMBOL--0xcontract     e.g. ETH.USDC--0xa0b8...
 *
 * Returns undefined when the chain is not one we can sign for, so callers can
 * skip the pair rather than send Rango a request that cannot be fulfilled.
 */
export const getRangoAsset = (
  coin: string,
  chain: string,
  tokenAddress?: string,
): string | undefined => {
  const rangoChain = getRangoChain(chain);
  if (!rangoChain) {
    return undefined;
  }

  const symbol = coin?.toUpperCase();
  if (!symbol) {
    return undefined;
  }

  if (tokenAddress) {
    return `${rangoChain}.${symbol}--${tokenAddress.toLowerCase()}`;
  }

  // No contract address means this must be the chain's native asset. Emitting
  // `ETH.USDC` for a token we have no address for makes Rango answer
  // "Incorrect native token" — better to decline the pair here.
  if (!IsERCToken(coin, chain)) {
    return `${rangoChain}.${symbol}`;
  }

  return undefined;
};

/**
 * Coin support is driven by the live meta response rather than a hard-coded
 * list, so newly listed tokens do not require an app release. The static chain
 * map above is still the gate: a token on a chain we cannot sign is excluded
 * no matter what Rango reports.
 */
/**
 * TODO(rango-execution): when the live token list is wired in, it must be
 * keyed with getExternalServiceSymbol() like the rest of the swap module and
 * matched on contract address, not symbol — OPTIMISM lists two USDC and BASE
 * two USDT, so a symbol match picks the wrong one.
 */
export const isCoinSupportedByRango = (
  coin: string,
  chain: string,
  supportedCoins?: string[],
): boolean => {
  if (!getRangoChain(chain)) {
    return false;
  }

  // Without the live list we cannot know whether Rango lists this asset, and
  // claiming support we cannot honour surfaces an offer that never fills.
  // `coin === chain` is also wrong as a native-asset test: ETH on Arbitrum and
  // POL on the chain the app calls 'matic' are both native but fail it.
  if (!supportedCoins?.length) {
    return false;
  }

  const symbol = `${coin}_${chain}`.toLowerCase();
  return supportedCoins.includes(symbol);
};

export const rangoGetEnabledChains = (
  blockchains: RangoBlockchainMeta[],
): string[] =>
  (blockchains ?? [])
    .filter(b => b.enabled && rangoSupportsTxType(b.type))
    .map(b => getBitpayChainFromRango(b.name))
    .filter((c): c is string => !!c);

/**
 * Rango reports business failures as a 200 with an `error` field, so a
 * successful HTTP call is not a successful quote.
 */
export const rangoIsRouteUsable = (res: {
  resultType?: string;
  route?: unknown;
  error?: string | null;
}): boolean => res?.resultType === 'OK' && !!res?.route && !res?.error;

export const rangoGetErrorMessage = (res: {
  resultType?: string;
  error?: string | null;
}): string | undefined => {
  if (res?.error) {
    return res.error;
  }
  switch (res?.resultType) {
    case 'NO_ROUTE':
      return 'No route found for this pair.';
    case 'INPUT_LIMIT_ISSUE':
      return 'Amount is outside the supported range for this route.';
    case 'HIGH_IMPACT':
      return 'This route has a high price impact.';
    default:
      return undefined;
  }
};

/**
 * True when the EVM transaction needs an ERC20 approval before the swap can be
 * signed. The spender is quote-specific for some bridges, so it is read from
 * the response every time rather than cached.
 */
export const rangoNeedsApproval = (tx: RangoTransaction | null): boolean =>
  !!tx && tx.type === 'EVM' && !!tx.approveTo && !!tx.approveData;
