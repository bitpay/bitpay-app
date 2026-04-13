// Mock heavy wallet/crypto dependencies that are imported at module level
// but not needed for the pure utility functions under test.
jest.mock('../store/wallet/effects/address/address', () => ({createWalletAddress: jest.fn()}));
jest.mock('../store/wallet/effects', () => ({createMultipleWallets: jest.fn()}));
jest.mock('../store/wallet/utils/wallet', () => ({checkEncryptPassword: jest.fn(), toFiat: jest.fn()}));
jest.mock('../store/wallet/effects/amount/amount', () => ({FormatAmount: jest.fn()}));
jest.mock('../store/moralis/moralis.effects', () => ({getERC20TokenPrice: jest.fn()}));
jest.mock('../api/etherscan', () => ({default: {}}));
jest.mock('../managers/TokenManager', () => ({tokenManager: {}}));
jest.mock('../managers/LogManager', () => ({logManager: {log: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()}}));

import {
  titleCasing,
  unitStringToAtomicBigInt,
  atomicToUnitString,
  changeOpacity,
  parsePath,
  getDerivationStrategy,
  getNetworkName,
  getAccount,
  isValidDerivationPath,
  keyExtractor,
  getSignificantDigits,
  formatFiatAmount,
  formatFiat,
  findContact,
  getContactObj,
  shouldScale,
  formatCryptoAddress,
  calculatePercentageDifference,
  getLastDayTimestampStartOfHourMs,
  formatFiatAmountObj,
  convertToFiat,
  getErrorString,
  addTokenChainSuffix,
  formatCurrencyAbbreviation,
  getCurrencyAbbreviation,
  getProtocolName,
  getEVMFeeCurrency,
  getCWCChain,
  getChainUsingSuffix,
  isL2NoSideChainNetwork,
  camelCaseToUpperWords,
  removeTrailingZeros,
  extractAddresses,
  splitInputsToChunks,
  toggleTSSModal,
  sleep,
  suffixChainMap,
} from './helper-methods';
import {Network} from '../constants';

describe('titleCasing', () => {
  it('capitalizes the first letter', () => {
    expect(titleCasing('hello')).toBe('Hello');
    expect(titleCasing('world')).toBe('World');
  });

  it('leaves already-capitalized strings unchanged', () => {
    expect(titleCasing('Hello')).toBe('Hello');
  });

  it('handles single character', () => {
    expect(titleCasing('a')).toBe('A');
  });
});

describe('unitStringToAtomicBigInt', () => {
  it('converts whole number strings', () => {
    expect(unitStringToAtomicBigInt('1', 8)).toBe(100000000n);
    expect(unitStringToAtomicBigInt('10', 8)).toBe(1000000000n);
    expect(unitStringToAtomicBigInt('0', 8)).toBe(0n);
  });

  it('converts decimal strings', () => {
    expect(unitStringToAtomicBigInt('0.5', 8)).toBe(50000000n);
    expect(unitStringToAtomicBigInt('1.5', 8)).toBe(150000000n);
    expect(unitStringToAtomicBigInt('0.00000001', 8)).toBe(1n);
  });

  it('handles negative values', () => {
    expect(unitStringToAtomicBigInt('-1', 8)).toBe(-100000000n);
    expect(unitStringToAtomicBigInt('-0.5', 8)).toBe(-50000000n);
  });

  it('returns 0n for empty/invalid input', () => {
    expect(unitStringToAtomicBigInt('', 8)).toBe(0n);
    expect(unitStringToAtomicBigInt(undefined as any, 8)).toBe(0n);
  });

  it('strips commas from formatted numbers', () => {
    expect(unitStringToAtomicBigInt('1,000', 8)).toBe(100000000000n);
  });

  it('handles 0 decimals', () => {
    expect(unitStringToAtomicBigInt('42', 0)).toBe(42n);
  });

  it('truncates fractional digits beyond unitDecimals', () => {
    // 0.123456789 with 6 decimals → 123456
    expect(unitStringToAtomicBigInt('0.123456789', 6)).toBe(123456n);
  });
});

describe('atomicToUnitString', () => {
  it('converts atomic bigint back to unit string', () => {
    expect(atomicToUnitString(100000000n, 8)).toBe('1');
    expect(atomicToUnitString(150000000n, 8)).toBe('1.5');
    expect(atomicToUnitString(1n, 8)).toBe('0.00000001');
  });

  it('handles zero', () => {
    expect(atomicToUnitString(0n, 8)).toBe('0');
  });

  it('handles negative values', () => {
    expect(atomicToUnitString(-100000000n, 8)).toBe('-1');
    expect(atomicToUnitString(-50000000n, 8)).toBe('-0.5');
  });

  it('handles 0 decimals', () => {
    expect(atomicToUnitString(42n, 0)).toBe('42');
  });

  it('trims trailing zeros from fractional part', () => {
    expect(atomicToUnitString(150000000n, 8)).toBe('1.5'); // not '1.50000000'
  });

  it('round-trips with unitStringToAtomicBigInt', () => {
    const values = ['1', '0.5', '0.00000001', '100.12345678'];
    for (const v of values) {
      const atomic = unitStringToAtomicBigInt(v, 8);
      expect(atomicToUnitString(atomic, 8)).toBe(v);
    }
  });
});

describe('changeOpacity', () => {
  it('converts a 6-digit hex to rgba with opacity', () => {
    expect(changeOpacity('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(changeOpacity('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(changeOpacity('#1a3b8b', 0.8)).toBe('rgba(26, 59, 139, 0.8)');
  });

  it('converts a 3-digit hex to rgba', () => {
    expect(changeOpacity('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(changeOpacity('#000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('clamps opacity to 0–1', () => {
    expect(changeOpacity('#ffffff', 2)).toBe('rgba(255, 255, 255, 1)');
    expect(changeOpacity('#ffffff', -1)).toBe('rgba(255, 255, 255, 0)');
  });

  it('returns the original value for invalid hex', () => {
    expect(changeOpacity('notacolor', 0.5)).toBe('notacolor');
  });
});

describe('parsePath', () => {
  it('parses BIP44 path', () => {
    const result = parsePath("m/44'/0'/0'");
    expect(result.purpose).toBe("44'");
    expect(result.coinCode).toBe("0'");
    expect(result.account).toBe("0'");
  });

  it('parses BIP84 path', () => {
    const result = parsePath("m/84'/0'/0'");
    expect(result.purpose).toBe("84'");
    expect(result.coinCode).toBe("0'");
  });
});

describe('getDerivationStrategy', () => {
  it('returns BIP44 for purpose 44', () => {
    expect(getDerivationStrategy("m/44'/0'/0'")).toBe('BIP44');
  });

  it('returns BIP45 for purpose 45', () => {
    expect(getDerivationStrategy("m/45'")).toBe('BIP45');
  });

  it('returns BIP48 for purpose 48', () => {
    expect(getDerivationStrategy("m/48'/0'/0'")).toBe('BIP48');
  });

  it('returns BIP84 for purpose 84', () => {
    expect(getDerivationStrategy("m/84'/0'/0'")).toBe('BIP84');
  });

  it('returns empty string for unknown purpose', () => {
    expect(getDerivationStrategy("m/99'/0'/0'")).toBe('');
  });
});

describe('getNetworkName', () => {
  it('returns livenet for BIP45', () => {
    expect(getNetworkName("m/45'")).toBe('livenet');
  });

  it('returns livenet for BTC mainnet coin code 0', () => {
    expect(getNetworkName("m/44'/0'/0'")).toBe('livenet');
  });

  it('returns testnet for coin code 1', () => {
    expect(getNetworkName("m/44'/1'/0'")).toBe('testnet');
  });

  it('returns livenet for ETH coin code 60', () => {
    expect(getNetworkName("m/44'/60'/0'")).toBe('livenet');
  });

  it('returns livenet for BCH coin code 145', () => {
    expect(getNetworkName("m/44'/145'/0'")).toBe('livenet');
  });
});

describe('getAccount', () => {
  it('returns 0 for BIP45 paths', () => {
    expect(getAccount("m/45'")).toBe(0);
  });

  it('parses account index from standard paths', () => {
    expect(getAccount("m/44'/0'/0'")).toBe(0);
    expect(getAccount("m/44'/0'/1'")).toBe(1);
    expect(getAccount("m/44'/0'/5'")).toBe(5);
  });

  it('returns undefined when account segment is missing', () => {
    expect(getAccount("m/44'/0'")).toBeUndefined();
  });
});

// ─── NEW TESTS ────────────────────────────────────────────────────────────────

describe('isValidDerivationPath', () => {
  it('returns true for BIP45 path regardless of chain', () => {
    expect(isValidDerivationPath("m/45'", 'btc')).toBe(true);
    expect(isValidDerivationPath("m/45'", 'eth')).toBe(true);
  });

  it('validates btc coin codes', () => {
    expect(isValidDerivationPath("m/44'/0'/0'", 'btc')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'btc')).toBe(true);
    expect(isValidDerivationPath("m/44'/145'/0'", 'btc')).toBe(false);
  });

  it('validates bch coin codes', () => {
    expect(isValidDerivationPath("m/44'/145'/0'", 'bch')).toBe(true);
    expect(isValidDerivationPath("m/44'/0'/0'", 'bch')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'bch')).toBe(true);
    expect(isValidDerivationPath("m/44'/3'/0'", 'bch')).toBe(false);
  });

  it('validates eth/matic/arb/base/op coin codes', () => {
    for (const chain of ['eth', 'matic', 'arb', 'base', 'op']) {
      expect(isValidDerivationPath("m/44'/60'/0'", chain)).toBe(true);
      expect(isValidDerivationPath("m/44'/0'/0'", chain)).toBe(true);
      expect(isValidDerivationPath("m/44'/1'/0'", chain)).toBe(true);
      expect(isValidDerivationPath("m/44'/145'/0'", chain)).toBe(false);
    }
  });

  it('validates sol coin codes', () => {
    expect(isValidDerivationPath("m/44'/501'/0'", 'sol')).toBe(true);
    expect(isValidDerivationPath("m/44'/0'/0'", 'sol')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'sol')).toBe(true);
    expect(isValidDerivationPath("m/44'/60'/0'", 'sol')).toBe(false);
  });

  it('validates xrp coin codes', () => {
    expect(isValidDerivationPath("m/44'/144'/0'", 'xrp')).toBe(true);
    expect(isValidDerivationPath("m/44'/0'/0'", 'xrp')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'xrp')).toBe(true);
    expect(isValidDerivationPath("m/44'/60'/0'", 'xrp')).toBe(false);
  });

  it('validates doge coin codes', () => {
    expect(isValidDerivationPath("m/44'/3'/0'", 'doge')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'doge')).toBe(true);
    expect(isValidDerivationPath("m/44'/0'/0'", 'doge')).toBe(false);
  });

  it('validates ltc coin codes', () => {
    expect(isValidDerivationPath("m/44'/2'/0'", 'ltc')).toBe(true);
    expect(isValidDerivationPath("m/44'/1'/0'", 'ltc')).toBe(true);
    expect(isValidDerivationPath("m/44'/0'/0'", 'ltc')).toBe(false);
  });

  it('returns false for unknown chain', () => {
    expect(isValidDerivationPath("m/44'/0'/0'", 'unknown')).toBe(false);
  });
});

describe('keyExtractor', () => {
  it('returns the id property', () => {
    expect(keyExtractor({id: 'abc123'})).toBe('abc123');
    expect(keyExtractor({id: 'wallet-1'})).toBe('wallet-1');
  });
});

describe('getSignificantDigits', () => {
  it('returns 4 for listed high-decimal currencies', () => {
    expect(getSignificantDigits('doge')).toBe(4);
    expect(getSignificantDigits('xrp')).toBe(4);
    expect(getSignificantDigits('shib')).toBe(4);
    expect(getSignificantDigits('elon')).toBe(4);
    expect(getSignificantDigits('prt')).toBe(4);
    expect(getSignificantDigits('rfox')).toBe(4);
    expect(getSignificantDigits('rfuel')).toBe(4);
    expect(getSignificantDigits('xyo')).toBe(4);
  });

  it('is case-insensitive', () => {
    expect(getSignificantDigits('DOGE')).toBe(4);
    expect(getSignificantDigits('XRP')).toBe(4);
  });

  it('returns undefined for other currencies', () => {
    expect(getSignificantDigits('btc')).toBeUndefined();
    expect(getSignificantDigits('eth')).toBeUndefined();
  });

  it('returns undefined when called with undefined', () => {
    expect(getSignificantDigits(undefined)).toBeUndefined();
  });
});

describe('formatFiatAmount', () => {
  it('formats with symbol by default (USD)', () => {
    const result = formatFiatAmount(100, 'USD');
    expect(result).toContain('100');
    expect(result).toContain('$');
  });

  it('formats with code display', () => {
    const result = formatFiatAmount(100, 'USD', {currencyDisplay: 'code'});
    expect(result).toContain('100');
    expect(result).toContain('USD');
  });

  it('formats zero', () => {
    const result = formatFiatAmount(0, 'USD');
    expect(result).toContain('0');
  });

  it('applies customPrecision minimal for integers', () => {
    const result = formatFiatAmount(100, 'USD', {customPrecision: 'minimal'});
    // should format without decimal fraction
    expect(result).toContain('100');
  });

  it('includes significant digits for doge', () => {
    const result = formatFiatAmount(1.23456, 'USD', {
      currencyAbbreviation: 'doge',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatFiat', () => {
  it('delegates to formatFiatAmount with correct arguments', () => {
    const result = formatFiat({
      fiatAmount: 42,
      defaultAltCurrencyIsoCode: 'USD',
    });
    expect(result).toContain('42');
  });

  it('passes through currencyDisplay code', () => {
    const result = formatFiat({
      fiatAmount: 50,
      defaultAltCurrencyIsoCode: 'EUR',
      currencyDisplay: 'code',
    });
    expect(result).toContain('EUR');
  });
});

describe('findContact', () => {
  const contacts = [
    {name: 'Alice', address: '0xabc', coin: 'eth', network: 'livenet', chain: 'eth'},
    {name: 'Bob', address: '0xdef', coin: 'btc', network: 'livenet', chain: 'btc'},
  ];

  it('returns true when contact address is found', () => {
    expect(findContact(contacts as any, '0xabc')).toBe(true);
  });

  it('returns false when address is not found', () => {
    expect(findContact(contacts as any, '0x999')).toBe(false);
  });

  it('returns false for empty contact list', () => {
    expect(findContact([], '0xabc')).toBe(false);
  });
});

describe('getContactObj', () => {
  const contacts = [
    {name: 'Alice', address: '0xabc', coin: 'eth', network: 'livenet', chain: 'eth'},
    {name: 'Bob', address: '0xdef', coin: 'btc', network: 'livenet', chain: 'btc'},
  ];

  it('finds and returns matching contact object', () => {
    const result = getContactObj(
      contacts as any,
      '0xabc',
      'eth',
      'livenet',
      'eth',
    );
    expect(result).toBeDefined();
    expect((result as any).name).toBe('Alice');
  });

  it('returns undefined when no match found', () => {
    const result = getContactObj(
      contacts as any,
      '0xabc',
      'btc', // wrong coin
      'livenet',
      'eth',
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty list', () => {
    expect(getContactObj([], '0xabc', 'eth', 'livenet', 'eth')).toBeUndefined();
  });
});

describe('shouldScale', () => {
  it('returns false for falsy values', () => {
    expect(shouldScale(null)).toBe(false);
    expect(shouldScale(undefined)).toBe(false);
    expect(shouldScale('')).toBe(false);
    expect(shouldScale(0)).toBe(false);
  });

  it('returns false when value length <= threshold', () => {
    expect(shouldScale('hello', 10)).toBe(false); // 5 chars, threshold 10
    expect(shouldScale('1234567890', 10)).toBe(false); // exactly 10
  });

  it('returns true when string length exceeds threshold', () => {
    expect(shouldScale('12345678901', 10)).toBe(true); // 11 chars > 10
  });

  it('converts number to fixed(2) string before comparing', () => {
    // 12345.67 → "12345.67" which is 8 chars; default threshold 10 → false
    expect(shouldScale(12345.67)).toBe(false);
    // 123456789.99 → "123456789.99" which is 12 chars > 10 → true
    expect(shouldScale(123456789.99)).toBe(true);
  });

  it('uses default threshold of 10', () => {
    expect(shouldScale('12345678901')).toBe(true);
    expect(shouldScale('1234567890')).toBe(false);
  });
});

describe('formatCryptoAddress', () => {
  it('returns "--" for empty address', () => {
    expect(formatCryptoAddress('')).toBe('--');
    expect(formatCryptoAddress(null as any)).toBe('--');
    expect(formatCryptoAddress(undefined as any)).toBe('--');
  });

  it('formats address with first 6 and last 6 chars', () => {
    const addr = '0x1234567890abcdef1234567890abcdef12345678';
    const result = formatCryptoAddress(addr);
    expect(result).toBe('0x1234....345678');
  });

  it('handles short addresses gracefully', () => {
    const addr = '0x1234567890ab';
    const result = formatCryptoAddress(addr);
    expect(typeof result).toBe('string');
    expect(result).toContain('....');
  });
});

describe('calculatePercentageDifference', () => {
  it('calculates positive percentage difference', () => {
    expect(calculatePercentageDifference(110, 100)).toBe(10);
  });

  it('calculates negative percentage difference', () => {
    expect(calculatePercentageDifference(90, 100)).toBe(-10);
  });

  it('returns 0 when balances are equal', () => {
    expect(calculatePercentageDifference(100, 100)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculatePercentageDifference(101, 300)).toBe(-66.33);
  });
});

describe('getLastDayTimestampStartOfHourMs', () => {
  it('returns a number', () => {
    const result = getLastDayTimestampStartOfHourMs();
    expect(typeof result).toBe('number');
  });

  it('is exactly 24 hours before the current hour start', () => {
    const now = Date.now();
    const result = getLastDayTimestampStartOfHourMs(now);
    const MS_PER_HOUR = 60 * 60 * 1000;
    const MS_PER_DAY = 24 * MS_PER_HOUR;
    const lastDay = now - MS_PER_DAY;
    const expected = Math.floor(lastDay / MS_PER_HOUR) * MS_PER_HOUR;
    expect(result).toBe(expected);
  });

  it('is aligned to the hour (divisible by 3600000)', () => {
    const result = getLastDayTimestampStartOfHourMs(Date.now());
    expect(result % (60 * 60 * 1000)).toBe(0);
  });
});

describe('formatFiatAmountObj', () => {
  it('returns amount with symbol by default', () => {
    const result = formatFiatAmountObj(100, 'USD');
    expect(result.amount).toContain('100');
    expect(result.code).toBeUndefined();
  });

  it('returns amount and code when currencyDisplay is code', () => {
    const result = formatFiatAmountObj(100, 'USD', {currencyDisplay: 'code'});
    expect(result.amount).toContain('100');
    expect(result.code).toBe('USD');
  });

  it('handles zero amount', () => {
    const result = formatFiatAmountObj(0, 'USD');
    expect(result.amount).toContain('0');
  });
});

describe('convertToFiat', () => {
  it('returns fiat value on mainnet when both hide flags are falsy', () => {
    expect(convertToFiat(500, false, false, Network.mainnet)).toBe(500);
  });

  it('returns 0 when hideWallet is true', () => {
    expect(convertToFiat(500, true, false, Network.mainnet)).toBe(0);
  });

  it('returns 0 when hideWalletByAccount is true', () => {
    expect(convertToFiat(500, false, true, Network.mainnet)).toBe(0);
  });

  it('returns 0 on testnet even when flags are false', () => {
    expect(convertToFiat(500, false, false, Network.testnet)).toBe(0);
  });

  it('returns 0 on testnet with both flags false', () => {
    expect(convertToFiat(100, undefined, undefined, Network.testnet)).toBe(0);
  });
});

describe('getErrorString', () => {
  it('returns message for Error instances', () => {
    expect(getErrorString(new Error('boom'))).toBe('boom');
  });

  it('returns the string itself for string errors', () => {
    expect(getErrorString('something went wrong')).toBe('something went wrong');
  });

  it('returns JSON-stringified form for plain objects', () => {
    const err = {code: 42, reason: 'test'};
    const result = getErrorString(err);
    expect(result).toBe(JSON.stringify(err));
  });

  it('handles null gracefully', () => {
    const result = getErrorString(null);
    expect(typeof result).toBe('string');
  });

  it('handles numbers', () => {
    const result = getErrorString(404);
    expect(typeof result).toBe('string');
  });
});

describe('addTokenChainSuffix', () => {
  it('lowercases name for non-SVM chains', () => {
    expect(addTokenChainSuffix('USDC', 'eth')).toBe('usdc_e');
    expect(addTokenChainSuffix('DAI', 'matic')).toBe('dai_m');
    expect(addTokenChainSuffix('TOKEN', 'arb')).toBe('token_arb');
    expect(addTokenChainSuffix('TOKEN', 'base')).toBe('token_base');
    expect(addTokenChainSuffix('TOKEN', 'op')).toBe('token_op');
  });

  it('preserves casing for SVM chains (sol)', () => {
    // IsSVMChain('sol') is true, so name is NOT lowercased
    expect(addTokenChainSuffix('USDC', 'sol')).toBe('USDC_sol');
  });
});

describe('formatCurrencyAbbreviation', () => {
  it('returns upper-cased string when no dot is present', () => {
    expect(formatCurrencyAbbreviation('usdc')).toBe('USDC');
    expect(formatCurrencyAbbreviation('BTC')).toBe('BTC');
  });

  it('formats dot-separated abbreviations (e.g. SOL.USDC)', () => {
    expect(formatCurrencyAbbreviation('SOL.USDC')).toBe('SOL.usdc');
    expect(formatCurrencyAbbreviation('eth.dai')).toBe('ETH.dai');
  });
});

describe('getCurrencyAbbreviation', () => {
  it('lower-cases name for native chains', () => {
    expect(getCurrencyAbbreviation('ETH', 'eth')).toBe('eth');
    expect(getCurrencyAbbreviation('BTC', 'btc')).toBe('btc');
  });

  it('adds token chain suffix for ERC token (contract address)', () => {
    // A contract address like '0xabc...' on eth is treated as an ERC token
    const addr = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT address
    const result = getCurrencyAbbreviation(addr, 'eth');
    expect(result).toBe(`${addr}_e`);
  });
});

describe('getProtocolName', () => {
  it('returns chain-specific protocol name for known chain+network', () => {
    expect(getProtocolName('eth', 'livenet')).toBe('Ethereum Mainnet');
    expect(getProtocolName('sol', 'livenet')).toBe('Solana');
    expect(getProtocolName('matic', 'livenet')).toBe('Polygon');
    expect(getProtocolName('arb', 'livenet')).toBe('Arbitrum');
    expect(getProtocolName('base', 'livenet')).toBe('Base');
    expect(getProtocolName('op', 'livenet')).toBe('Optimism');
  });

  it('falls back to default for unknown chain', () => {
    expect(getProtocolName('doge', 'livenet')).toBe('Mainnet');
  });

  it('is case-insensitive', () => {
    expect(getProtocolName('ETH', 'LIVENET')).toBe('Ethereum Mainnet');
  });
});

describe('getEVMFeeCurrency', () => {
  it('returns eth for eth chain', () => {
    expect(getEVMFeeCurrency('eth')).toBe('eth');
  });

  it('returns matic for matic chain', () => {
    expect(getEVMFeeCurrency('matic')).toBe('matic');
  });

  it('returns eth for arb chain', () => {
    expect(getEVMFeeCurrency('arb')).toBe('eth');
  });

  it('returns eth for base chain', () => {
    expect(getEVMFeeCurrency('base')).toBe('eth');
  });

  it('returns eth for op chain', () => {
    expect(getEVMFeeCurrency('op')).toBe('eth');
  });

  it('returns sol for sol chain', () => {
    expect(getEVMFeeCurrency('sol')).toBe('sol');
  });

  it('returns eth for unknown chain (default)', () => {
    expect(getEVMFeeCurrency('unknown')).toBe('eth');
  });

  it('is case-insensitive', () => {
    expect(getEVMFeeCurrency('ETH')).toBe('eth');
    expect(getEVMFeeCurrency('MATIC')).toBe('matic');
  });
});

describe('getCWCChain', () => {
  it('returns ETHERC20 for eth', () => {
    expect(getCWCChain('eth')).toBe('ETHERC20');
  });

  it('returns MATICERC20 for matic', () => {
    expect(getCWCChain('matic')).toBe('MATICERC20');
  });

  it('returns ARBERC20 for arb', () => {
    expect(getCWCChain('arb')).toBe('ARBERC20');
  });

  it('returns BASEERC20 for base', () => {
    expect(getCWCChain('base')).toBe('BASEERC20');
  });

  it('returns OPERC20 for op', () => {
    expect(getCWCChain('op')).toBe('OPERC20');
  });

  it('returns SOLSPL for sol', () => {
    expect(getCWCChain('sol')).toBe('SOLSPL');
  });

  it('returns ETHERC20 for unknown chain (default)', () => {
    expect(getCWCChain('unknown')).toBe('ETHERC20');
  });

  it('is case-insensitive', () => {
    expect(getCWCChain('ETH')).toBe('ETHERC20');
    expect(getCWCChain('SOL')).toBe('SOLSPL');
  });
});

describe('getChainUsingSuffix', () => {
  it('returns eth for suffix "e"', () => {
    expect(getChainUsingSuffix('e')).toBe('eth');
  });

  it('returns matic for suffix "m"', () => {
    expect(getChainUsingSuffix('m')).toBe('matic');
  });

  it('returns base for suffix "base"', () => {
    expect(getChainUsingSuffix('base')).toBe('base');
  });

  it('returns arb for suffix "arb"', () => {
    expect(getChainUsingSuffix('arb')).toBe('arb');
  });

  it('returns op for suffix "op"', () => {
    expect(getChainUsingSuffix('op')).toBe('op');
  });

  it('returns sol for suffix "sol"', () => {
    expect(getChainUsingSuffix('sol')).toBe('sol');
  });

  it('returns eth for unknown suffix (default)', () => {
    expect(getChainUsingSuffix('xyz')).toBe('eth');
  });
});

describe('isL2NoSideChainNetwork', () => {
  it('returns true for arb', () => {
    expect(isL2NoSideChainNetwork('arb')).toBe(true);
  });

  it('returns true for base', () => {
    expect(isL2NoSideChainNetwork('base')).toBe(true);
  });

  it('returns true for op', () => {
    expect(isL2NoSideChainNetwork('op')).toBe(true);
  });

  it('returns false for eth', () => {
    expect(isL2NoSideChainNetwork('eth')).toBe(false);
  });

  it('returns false for matic', () => {
    expect(isL2NoSideChainNetwork('matic')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isL2NoSideChainNetwork('ARB')).toBe(true);
    expect(isL2NoSideChainNetwork('BASE')).toBe(true);
  });
});

describe('camelCaseToUpperWords', () => {
  it('splits camelCase into upper-cased words', () => {
    expect(camelCaseToUpperWords('transferFrom')).toBe('TRANSFER FROM');
    expect(camelCaseToUpperWords('approve')).toBe('APPROVE');
  });

  it('replaces underscores with spaces', () => {
    expect(camelCaseToUpperWords('some_function_name')).toBe(
      'SOME FUNCTION NAME',
    );
  });

  it('handles already-uppercase or mixed input', () => {
    expect(camelCaseToUpperWords('execute')).toBe('EXECUTE');
    expect(camelCaseToUpperWords('swapExactTokensForTokens')).toBe(
      'SWAP EXACT TOKENS FOR TOKENS',
    );
  });

  it('handles empty string', () => {
    expect(camelCaseToUpperWords('')).toBe('');
  });
});

describe('removeTrailingZeros', () => {
  it('removes trailing zeros from hex string', () => {
    expect(removeTrailingZeros('abc000')).toBe('abc');
    expect(removeTrailingZeros('abc123000')).toBe('abc123');
  });

  it('leaves strings with no trailing zeros unchanged', () => {
    expect(removeTrailingZeros('abc123')).toBe('abc123');
  });

  it('returns empty string when all chars are zeros', () => {
    expect(removeTrailingZeros('000')).toBe('');
  });
});

describe('extractAddresses', () => {
  it('extracts sender contract and recipient addresses from hex chunk', () => {
    // Build a 86-char hex string
    // senderContractAddress: chars 0-39  → 40 chars → '1'.repeat(40)
    // chars 40-45 are skipped (6 chars)
    // recipientAddress: chars 46-85 → 40 chars → '2'.repeat(40)
    const senderPart = '1'.repeat(40);
    const skip = '0'.repeat(6);
    const recipientPart = '2'.repeat(40);
    const hex = senderPart + skip + recipientPart;

    const {senderContractAddress, recipientAddress} = extractAddresses(hex);

    expect(senderContractAddress).toBe('0x' + senderPart);
    expect(recipientAddress).toBe('0x' + recipientPart);
  });
});

describe('splitInputsToChunks', () => {
  it('splits hex inputs (with 0x prefix) into 64-char chunks', () => {
    const input = '0x' + 'a'.repeat(128); // 128 hex chars → 2 chunks of 64
    const result = splitInputsToChunks([input]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toBe('a'.repeat(64));
    expect(result[0][1]).toBe('a'.repeat(64));
  });

  it('splits hex inputs without 0x prefix', () => {
    const input = 'b'.repeat(64);
    const result = splitInputsToChunks([input]);
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('b'.repeat(64));
  });

  it('handles multiple inputs', () => {
    const a = '0x' + 'a'.repeat(64);
    const b = '0x' + 'b'.repeat(128);
    const result = splitInputsToChunks([a, b]);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(1);
    expect(result[1]).toHaveLength(2);
  });
});

describe('toggleTSSModal', () => {
  it('calls setter and waits when setShowTSSProgressModal is provided', async () => {
    jest.useFakeTimers();
    const mockSetter = jest.fn();
    const promise = toggleTSSModal(mockSetter, true, 100);
    expect(mockSetter).toHaveBeenCalledWith(true);
    jest.advanceTimersByTime(100);
    await promise;
    jest.useRealTimers();
  });

  it('does nothing when setShowTSSProgressModal is undefined', async () => {
    // Should resolve without error
    await toggleTSSModal(undefined, true);
  });

  it('does not sleep when delayMs is 0', async () => {
    const mockSetter = jest.fn();
    await toggleTSSModal(mockSetter, false, 0);
    expect(mockSetter).toHaveBeenCalledWith(false);
  });
});

describe('sleep', () => {
  it('resolves after the given duration', async () => {
    jest.useFakeTimers();
    const p = sleep(500);
    jest.advanceTimersByTime(500);
    await p; // should not hang
    jest.useRealTimers();
  });
});

describe('suffixChainMap', () => {
  it('contains expected chain suffixes', () => {
    expect(suffixChainMap.eth).toBe('e');
    expect(suffixChainMap.matic).toBe('m');
    expect(suffixChainMap.arb).toBe('arb');
    expect(suffixChainMap.base).toBe('base');
    expect(suffixChainMap.op).toBe('op');
    expect(suffixChainMap.sol).toBe('sol');
  });
});

describe('getNetworkName (additional coin codes)', () => {
  it('returns livenet for XRP coin code 144', () => {
    expect(getNetworkName("m/44'/144'/0'")).toBe('livenet');
  });

  it('returns livenet for DOGE coin code 3', () => {
    expect(getNetworkName("m/44'/3'/0'")).toBe('livenet');
  });

  it('returns livenet for LTC coin code 2', () => {
    expect(getNetworkName("m/44'/2'/0'")).toBe('livenet');
  });

  it('returns livenet for SOL coin code 501', () => {
    expect(getNetworkName("m/44'/501'/0'")).toBe('livenet');
  });

  it('returns empty string for unknown coin code', () => {
    expect(getNetworkName("m/44'/999'/0'")).toBe('');
  });
});
