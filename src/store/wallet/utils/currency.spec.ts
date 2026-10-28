import {GetBlockExplorerLink, GetName, GetPrecision} from './currency';
import {BitpaySupportedTokens} from '../../../constants/currencies';

const mockTokenDataByAddress: {[key: string]: any} = {};
jest.mock('../../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: () => ({
      tokenOptionsByAddress: {},
      tokenDataByAddress: mockTokenDataByAddress,
    }),
  },
}));

const unit = (unitDecimals: number) => ({
  unitName: 'X',
  unitToSatoshi: 10 ** unitDecimals,
  unitDecimals,
  unitCode: 'x',
});

const run = (effect: any, customTokenDataByAddress: any = {}) =>
  effect(jest.fn(), () => ({WALLET: {customTokenDataByAddress}}));

// GetPrecision/GetName used to build {...1inch, ...custom, ...BitPay}[key];
// these pin that precedence now that they look the key up directly.
describe('token lookups in GetPrecision / GetName', () => {
  const [supportedKey] = Object.keys(BitpaySupportedTokens).filter(k =>
    k.endsWith('_e'),
  );
  const supportedAddress = supportedKey.replace(/_e$/, '');

  beforeEach(() => {
    Object.keys(mockTokenDataByAddress).forEach(
      k => delete mockTokenDataByAddress[k],
    );
  });

  it('reads 1inch token options when nothing else has the token', () => {
    mockTokenDataByAddress['0xabc_e'] = {name: 'One Inch', unitInfo: unit(6)};
    expect(run(GetPrecision('x', 'eth', '0xABC'))).toEqual(unit(6));
    expect(run(GetName('x', 'eth', '0xABC'))).toBe('One Inch');
  });

  it("prefers the user's custom token over 1inch options", () => {
    mockTokenDataByAddress['0xabc_e'] = {name: 'One Inch', unitInfo: unit(6)};
    const custom = {'0xabc_e': {name: 'Custom', unitInfo: unit(8)}};
    expect(run(GetPrecision('x', 'eth', '0xABC'), custom)).toEqual(unit(8));
    expect(run(GetName('x', 'eth', '0xABC'), custom)).toBe('Custom');
  });

  it('prefers BitPay-supported tokens over custom and 1inch entries', () => {
    mockTokenDataByAddress[supportedKey] = {
      name: 'One Inch',
      unitInfo: unit(1),
    };
    const custom = {[supportedKey]: {name: 'Custom', unitInfo: unit(2)}};
    const expected = (BitpaySupportedTokens as any)[supportedKey];
    expect(run(GetPrecision('x', 'eth', supportedAddress), custom)).toEqual(
      expected.unitInfo,
    );
    expect(run(GetName('x', 'eth', supportedAddress), custom)).toBe(
      expected.name,
    );
  });

  it('returns undefined for an unknown token and never reads inherited keys', () => {
    expect(run(GetPrecision('x', 'eth', '0xnope'))).toBeUndefined();
    expect(run(GetName('x', 'eth', 'constructor'))).toBeUndefined();
  });

  it('uses the chain coin when there is no token address', () => {
    expect(run(GetPrecision('eth', 'eth', undefined))?.unitCode).toBe('eth');
  });
});

describe('GetBlockExplorerLink', () => {
  it('points Solana devnet links at the devnet cluster', () => {
    expect(GetBlockExplorerLink('testnet', 'sol', 'tx/abc')).toBe(
      'https://solscan.io/tx/abc?cluster=devnet',
    );
    expect(GetBlockExplorerLink('testnet', 'sol', 'token/mint')).toBe(
      'https://solscan.io/token/mint?cluster=devnet',
    );
  });

  it('leaves Solana mainnet links alone', () => {
    expect(GetBlockExplorerLink('livenet', 'sol', 'tx/abc')).toBe(
      'https://solscan.io/tx/abc',
    );
  });

  it('uses the testnet explorer domain for EVM chains', () => {
    expect(GetBlockExplorerLink('testnet', 'eth', 'tx/0x1')).toBe(
      'https://sepolia.etherscan.io/tx/0x1',
    );
    expect(GetBlockExplorerLink('livenet', 'matic', 'address/0x2')).toBe(
      'https://polygonscan.com/address/0x2',
    );
  });

  it('puts the fragment after the cluster param', () => {
    expect(
      GetBlockExplorerLink('testnet', 'sol', 'address/addr', '#tokentxns'),
    ).toBe('https://solscan.io/address/addr?cluster=devnet#tokentxns');
  });
});
