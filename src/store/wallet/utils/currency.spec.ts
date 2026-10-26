import {GetBlockExplorerLink} from './currency';

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
