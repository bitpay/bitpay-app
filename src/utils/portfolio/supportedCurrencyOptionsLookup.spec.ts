import type {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {createSupportedCurrencyOptionLookup} from './supportedCurrencyOptionsLookup';

const makeOption = (
  overrides: Partial<SupportedCurrencyOption>,
): SupportedCurrencyOption => {
  return {
    id: overrides.id || 'id',
    img: overrides.img || '',
    currencyName: overrides.currencyName || 'Currency',
    currencyAbbreviation: overrides.currencyAbbreviation || '',
    chain: overrides.chain || '',
    chainName: overrides.chainName || 'Chain',
    imgSrc: overrides.imgSrc || (0 as any),
    hasMultisig: overrides.hasMultisig,
    isToken: overrides.isToken,
    badgeUri: overrides.badgeUri,
    badgeSrc: overrides.badgeSrc,
    priority: overrides.priority,
    tokenAddress: overrides.tokenAddress,
  };
};

describe('createSupportedCurrencyOptionLookup', () => {
  it('prefers strict chain+token, then token-only, then token fallback by abbreviation', () => {
    const ethToken = makeOption({
      id: 'eth-token',
      currencyAbbreviation: 'usdc',
      chain: 'eth',
      tokenAddress: '0x111',
    });
    const maticToken = makeOption({
      id: 'matic-token',
      currencyAbbreviation: 'usdc',
      chain: 'matic',
      tokenAddress: '0xabc',
    });
    const arbToken = makeOption({
      id: 'arb-token',
      currencyAbbreviation: 'usdc',
      chain: 'arb',
      tokenAddress: '0xabc',
    });
    const lookup = createSupportedCurrencyOptionLookup([
      ethToken,
      maticToken,
      arbToken,
    ]);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'USDC',
        chain: 'arb',
        tokenAddress: '0xABC',
      }),
    ).toBe(arbToken);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'USDC',
        chain: 'op',
        tokenAddress: '0xABC',
      }),
    ).toBe(maticToken);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'USDC',
        chain: 'op',
        tokenAddress: '0x999',
      }),
    ).toBe(ethToken);
  });

  it('does not fall back to non-token options when tokenAddress is present', () => {
    const coinOption = makeOption({
      id: 'btc-coin',
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    const lookup = createSupportedCurrencyOptionLookup([coinOption]);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'btc',
        chain: 'btc',
        tokenAddress: '0xabc',
      }),
    ).toBeUndefined();
  });

  it('uses strict empty-chain+token match before token-only fallback', () => {
    const ethToken = makeOption({
      id: 'eth-token',
      currencyAbbreviation: 'usdt',
      chain: 'eth',
      tokenAddress: '0xabc',
    });
    const emptyChainToken = makeOption({
      id: 'empty-chain-token',
      currencyAbbreviation: 'usdt',
      chain: '',
      tokenAddress: '0xabc',
    });
    const lookup = createSupportedCurrencyOptionLookup([
      ethToken,
      emptyChainToken,
    ]);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'usdt',
        chain: '',
        tokenAddress: '0xabc',
      }),
    ).toBe(emptyChainToken);
  });

  it('uses wildcard chain (chain===abbr) as first abbreviation match when token is absent', () => {
    const first = makeOption({
      id: 'first',
      currencyAbbreviation: 'matic',
      chain: 'eth',
    });
    const second = makeOption({
      id: 'second',
      currencyAbbreviation: 'matic',
      chain: 'matic',
    });
    const lookup = createSupportedCurrencyOptionLookup([first, second]);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'matic',
        chain: 'matic',
      }),
    ).toBe(first);
  });

  it('uses strict chain match before abbreviation fallback when token is absent', () => {
    const first = makeOption({
      id: 'first',
      currencyAbbreviation: 'eth',
      chain: 'eth',
    });
    const second = makeOption({
      id: 'second',
      currencyAbbreviation: 'eth',
      chain: '',
    });
    const lookup = createSupportedCurrencyOptionLookup([first, second]);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'eth',
        chain: '',
      }),
    ).toBe(second);

    expect(
      lookup.getOption({
        currencyAbbreviation: 'eth',
        chain: 'base',
      }),
    ).toBe(first);
  });
});
