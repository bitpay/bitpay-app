import type {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';

type OptionLookupArgs = {
  currencyAbbreviation?: string;
  chain?: string;
  tokenAddress?: string;
};

export type SupportedCurrencyOptionLookup = {
  getOption: (args: OptionLookupArgs) => SupportedCurrencyOption | undefined;
};

const normalize = (value: string | undefined): string =>
  (value || '').toLowerCase();

const byAbbrChainKey = (abbr: string, chain: string): string =>
  `${abbr}:${chain}`;
const byAbbrTokenKey = (abbr: string, tokenLower: string): string =>
  `${abbr}:${tokenLower}`;
const byAbbrChainTokenKey = (
  abbr: string,
  chain: string,
  tokenLower: string,
): string => `${abbr}:${chain}:${tokenLower}`;

// Builds O(1) lookup tables for SupportedCurrencyOptions while preserving the
// fallback order currently used by `findSupportedCurrencyOptionForAsset`:
// - If tokenAddress is present:
//   1) strict chain+tokenAddress
//   2) tokenAddress-only
//   3) first option for abbreviation that has tokenAddress
// - If tokenAddress is not present:
//   1) strict chain (unless chain is wildcard=abbr, then use first abbr match)
//   2) first option for abbreviation
export const createSupportedCurrencyOptionLookup = (
  options: SupportedCurrencyOption[],
): SupportedCurrencyOptionLookup => {
  const byAbbr = new Map<string, SupportedCurrencyOption>();
  const byAbbrChain = new Map<string, SupportedCurrencyOption>();
  const byAbbrToken = new Map<string, SupportedCurrencyOption>();
  const byAbbrChainToken = new Map<string, SupportedCurrencyOption>();
  const tokenFallbackByAbbr = new Map<string, SupportedCurrencyOption>();

  for (const opt of options || []) {
    const abbr = normalize(opt?.currencyAbbreviation);
    if (!abbr) {
      continue;
    }
    const chain = normalize(opt?.chain);
    const tokenLower = opt?.tokenAddress ? normalize(opt.tokenAddress) : '';

    // First option wins so we preserve ordering-based behavior.
    if (!byAbbr.has(abbr)) {
      byAbbr.set(abbr, opt);
    }

    if (opt?.tokenAddress && !tokenFallbackByAbbr.has(abbr)) {
      tokenFallbackByAbbr.set(abbr, opt);
    }

    const chainKey = byAbbrChainKey(abbr, chain);
    if (!byAbbrChain.has(chainKey)) {
      byAbbrChain.set(chainKey, opt);
    }

    if (tokenLower) {
      const tokenKey = byAbbrTokenKey(abbr, tokenLower);
      if (!byAbbrToken.has(tokenKey)) {
        byAbbrToken.set(tokenKey, opt);
      }
      const strictKey = byAbbrChainTokenKey(abbr, chain, tokenLower);
      if (!byAbbrChainToken.has(strictKey)) {
        byAbbrChainToken.set(strictKey, opt);
      }
    }
  }

  const getOption = (
    args: OptionLookupArgs,
  ): SupportedCurrencyOption | undefined => {
    const abbr = normalize(args.currencyAbbreviation);
    if (!abbr) {
      return undefined;
    }

    const chain = normalize(args.chain);
    const tokenLower = args.tokenAddress
      ? normalize(args.tokenAddress)
      : undefined;
    const isWildcardChain = chain === abbr && !tokenLower;

    if (tokenLower) {
      const strict = byAbbrChainToken.get(
        byAbbrChainTokenKey(abbr, chain, tokenLower),
      );
      if (strict) {
        return strict;
      }

      const byToken = byAbbrToken.get(byAbbrTokenKey(abbr, tokenLower));
      if (byToken) {
        return byToken;
      }

      return tokenFallbackByAbbr.get(abbr);
    }

    if (isWildcardChain) {
      return byAbbr.get(abbr);
    }

    const byChain = byAbbrChain.get(byAbbrChainKey(abbr, chain));
    if (byChain) {
      return byChain;
    }

    return byAbbr.get(abbr);
  };

  return {getOption};
};
