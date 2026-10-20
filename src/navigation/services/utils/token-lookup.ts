import {CurrencyOpts} from '../../../constants/currencies';

type TokenMap = {[key: string]: CurrencyOpts};

const SEP = '\u0000';
const indexes = new WeakMap<TokenMap, Map<string, CurrencyOpts>>();

/**
 * The first token in `tokens` whose `coin` and `chain` equal the given ones —
 * exactly what `Object.values(tokens).find(t => t.coin === coin && t.chain ===
 * chain)` returns — from an index built once per token map.
 *
 * The Buy/Sell/Swap screens look a token up for every currency a provider
 * lists, and the token map holds ~21k entries: as a linear scan that was
 * ~1.2 s of JS-thread time each time Swap opened. The map's identity is a
 * safe cache key: TokenManager publishes a freshly built map on every update
 * and never mutates a published one.
 */
export const findTokenByCoinAndChain = (
  tokens: TokenMap,
  coin: string,
  chain: string,
): CurrencyOpts | undefined => {
  let index = indexes.get(tokens);
  if (!index) {
    index = new Map();
    for (const token of Object.values(tokens)) {
      const key = token.coin + SEP + token.chain;
      // First match wins, as with Array.prototype.find.
      if (!index.has(key)) {
        index.set(key, token);
      }
    }
    indexes.set(tokens, index);
  }
  return index.get(coin + SEP + chain);
};
