jest.mock('../../../../utils/helper-methods', () => {
  const suffixByChain: {[chain: string]: string} = {
    eth: 'e',
    matic: 'm',
    arb: 'arb',
    base: 'base',
    op: 'op',
    sol: 'sol',
  };

  return {
    addTokenChainSuffix: (name: string, chain: string) => {
      const _chain = String(chain || '').toLowerCase();
      const addr =
        _chain === 'sol'
          ? String(name || '')
          : String(name || '').toLowerCase();
      return `${addr}_${suffixByChain[_chain] || _chain}`;
    },
  };
});

import type {SupportedCurrencyOption} from '../../../../constants/SupportedCurrencyOptions';
import {resolveAssetIconData} from './useAssetIconResolver';

const makeOption = (
  overrides: Partial<SupportedCurrencyOption>,
): SupportedCurrencyOption => {
  return {
    id: overrides.id || 'id',
    img: overrides.img || 'supported-img',
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

const makeToken = (args: {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
}) => {
  return {
    symbol: args.symbol,
    name: args.name,
    address: args.address,
    decimals: args.decimals,
    logoURI: args.logoURI,
  };
};

describe('resolveAssetIconData', () => {
  it('returns supported option img/imgSrc when supported option exists (even if token has logoURI)', () => {
    const option = makeOption({
      img: 'supported-img',
      imgSrc: 111 as any,
      currencyAbbreviation: 'usdc',
      chain: 'eth',
      tokenAddress: '0xabc',
    });

    const item = {
      currencyAbbreviation: 'usdc',
      chain: 'eth',
      tokenAddress: '0xABC', // ensure suffix helper lowercases for lookup
    };

    const tokenKey = '0xabc_e';
    const result = resolveAssetIconData({
      item,
      getSupportedOption: () => option,
      tokenOptionsByAddress: {
        [tokenKey]: makeToken({
          symbol: 'usdc',
          name: 'USD Coin',
          address: '0xabc',
          decimals: 6,
          logoURI: 'https://example.com/logo.png',
        }),
      } as any,
      customTokenOptionsByAddress: {} as any,
      bitpayTokenOptionsByAddress: {} as any,
    });

    expect(result).toEqual({
      img: 'supported-img',
      imgSrc: 111,
    });
  });

  it('returns token logoURI when no supported option exists', () => {
    const item = {
      currencyAbbreviation: 'tkn',
      chain: 'eth',
      tokenAddress: '0xDEF',
    };

    const tokenKey = '0xdef_e';
    const result = resolveAssetIconData({
      item,
      getSupportedOption: () => undefined,
      tokenOptionsByAddress: {
        [tokenKey]: makeToken({
          symbol: 'tkn',
          name: 'Token',
          address: '0xdef',
          decimals: 18,
          logoURI: 'https://example.com/custom.png',
        }),
      } as any,
      customTokenOptionsByAddress: {} as any,
      bitpayTokenOptionsByAddress: {} as any,
    });

    expect(result).toEqual({
      img: 'https://example.com/custom.png',
      imgSrc: undefined,
    });
  });

  it('uses custom token options before token context before bitpay constants', () => {
    const item = {
      currencyAbbreviation: 'tkn',
      chain: 'eth',
      tokenAddress: '0xDEF',
    };
    const tokenKey = '0xdef_e';

    const bitpay = {
      [tokenKey]: makeToken({
        symbol: 'tkn',
        name: 'BitPay Token',
        address: '0xdef',
        decimals: 18,
        logoURI: 'bitpay',
      }),
    } as any;

    const tokenContext = {
      [tokenKey]: makeToken({
        symbol: 'tkn',
        name: 'Context Token',
        address: '0xdef',
        decimals: 18,
        logoURI: 'context',
      }),
    } as any;

    const custom = {
      [tokenKey]: makeToken({
        symbol: 'tkn',
        name: 'Custom Token',
        address: '0xdef',
        decimals: 18,
        logoURI: 'custom',
      }),
    } as any;

    const withCustom = resolveAssetIconData({
      item,
      getSupportedOption: () => undefined,
      tokenOptionsByAddress: tokenContext,
      customTokenOptionsByAddress: custom,
      bitpayTokenOptionsByAddress: bitpay,
    });
    expect(withCustom.img).toBe('custom');

    const withoutCustom = resolveAssetIconData({
      item,
      getSupportedOption: () => undefined,
      tokenOptionsByAddress: tokenContext,
      customTokenOptionsByAddress: {} as any,
      bitpayTokenOptionsByAddress: bitpay,
    });
    expect(withoutCustom.img).toBe('context');

    const bitpayOnly = resolveAssetIconData({
      item,
      getSupportedOption: () => undefined,
      tokenOptionsByAddress: {} as any,
      customTokenOptionsByAddress: {} as any,
      bitpayTokenOptionsByAddress: bitpay,
    });
    expect(bitpayOnly.img).toBe('bitpay');
  });
});
