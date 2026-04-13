// Mock heavy wallet/crypto dependencies that are imported at module level
// but not needed for the pure utility functions under test.
jest.mock('../store/wallet/effects/address/address', () => ({createWalletAddress: jest.fn()}));
jest.mock('../store/wallet/effects', () => ({createMultipleWallets: jest.fn()}));
jest.mock('../store/wallet/utils/wallet', () => ({checkEncryptPassword: jest.fn(), toFiat: jest.fn()}));
jest.mock('../store/wallet/effects/amount/amount', () => ({FormatAmount: jest.fn()}));
jest.mock('../store/moralis/moralis.effects', () => ({getERC20TokenPrice: jest.fn()}));
jest.mock('../api/etherscan', () => ({default: {}}));
jest.mock('../managers/TokenManager', () => ({tokenManager: {}}));
jest.mock('../managers/LogManager', () => ({logManager: {log: jest.fn()}}));

import {
  titleCasing,
  unitStringToAtomicBigInt,
  atomicToUnitString,
  changeOpacity,
  parsePath,
  getDerivationStrategy,
  getNetworkName,
  getAccount,
} from './helper-methods';

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
