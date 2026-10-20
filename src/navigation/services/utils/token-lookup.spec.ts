import {CurrencyOpts} from '../../../constants/currencies';
import {findTokenByCoinAndChain} from './token-lookup';

const token = (coin: string, chain: string, logoURI: string) =>
  ({coin, chain, logoURI} as unknown as CurrencyOpts);

// The behaviour being replaced, kept here as the oracle.
const linearFind = (
  tokens: {[key: string]: CurrencyOpts},
  coin: string,
  chain: string,
) => Object.values(tokens).find(t => t.coin === coin && t.chain === chain);

describe('findTokenByCoinAndChain', () => {
  const tokens = {
    '0xa_e': token('usdc', 'eth', 'a'),
    '0xb_m': token('usdc', 'matic', 'b'),
    // Same coin and chain as the first entry: find returns the first one.
    '0xc_e': token('usdc', 'eth', 'c'),
    '0xd_arb': token('link', 'arb', 'd'),
    // Coin/chain pairs that would collide if simply concatenated.
    '0xe_e': token('ab', 'c', 'e'),
    '0xf_e': token('a', 'bc', 'f'),
  };

  it('matches Object.values(...).find for every pair, present or not', () => {
    const coins = ['usdc', 'link', 'ab', 'a', 'eth', 'USDC', ''];
    const chains = ['eth', 'matic', 'arb', 'c', 'bc', 'base', ''];
    coins.forEach(coin =>
      chains.forEach(chain =>
        expect(findTokenByCoinAndChain(tokens, coin, chain)).toBe(
          linearFind(tokens, coin, chain),
        ),
      ),
    );
  });

  it('returns the first matching token', () => {
    expect(findTokenByCoinAndChain(tokens, 'usdc', 'eth')?.logoURI).toBe('a');
  });

  it('indexes each token map separately', () => {
    const updated = {'0xz_e': token('usdc', 'eth', 'z')};
    expect(findTokenByCoinAndChain(tokens, 'usdc', 'eth')?.logoURI).toBe('a');
    expect(findTokenByCoinAndChain(updated, 'usdc', 'eth')?.logoURI).toBe('z');
    expect(findTokenByCoinAndChain(updated, 'link', 'arb')).toBeUndefined();
  });
});
