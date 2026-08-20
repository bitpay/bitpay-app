import configureTestStore from '@test/store';
import {
  getDecodedTransactionsByHash,
  getERC20TokenAllowance,
  getERC20TokenBalanceByWallet,
  getERC20TokenPrice,
  getMultipleEvmTokenPrices,
  getMultipleSolanaTokenPrices,
  getMultipleTokenPrices,
  getSVMTokenBalanceByWallet,
} from './moralis.effects';
import {logManager} from '../../managers/LogManager';

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const buildMockWallet = () => ({
  id: 'wallet-1',
  moralisGetTransactionVerbose: jest.fn(),
  moralisGetTokenPrice: jest.fn(),
  moralisGetMultipleERC20TokenPrices: jest.fn(),
  moralisGetMultipleSolTokenPrices: jest.fn(),
  moralisGetSolWalletPortfolio: jest.fn(),
  moralisGetWalletTokenBalances: jest.fn(),
  moralisGetTokenAllowance: jest.fn(),
});

const buildStoreWithWallet = (wallet: ReturnType<typeof buildMockWallet>) =>
  configureTestStore({
    WALLET: {
      keys: {
        key1: {isReadOnly: false, wallets: [wallet]},
      },
      customTokenOptionsByAddress: {},
    },
  } as any);

describe('moralis.effects (BWS proxy, wallet-signed)', () => {
  let wallet: ReturnType<typeof buildMockWallet>;
  let store: ReturnType<typeof configureTestStore>;

  beforeEach(() => {
    wallet = buildMockWallet();
    store = buildStoreWithWallet(wallet);
  });

  describe('getERC20TokenPrice', () => {
    it('calls moralisGetTokenPrice with the hex chain', async () => {
      const raw = {usdPrice: 123};
      wallet.moralisGetTokenPrice.mockResolvedValueOnce(raw);

      const result = await store.dispatch(
        getERC20TokenPrice({address: '0xabc', chain: 'eth'}),
      );

      expect(wallet.moralisGetTokenPrice).toHaveBeenCalledWith({
        address: '0xabc',
        chain: '0x1',
      });
      expect(result).toEqual(raw);
    });
  });

  describe('getDecodedTransactionsByHash', () => {
    it('calls moralisGetTransactionVerbose', async () => {
      const raw = {logs: [], to_address_label: 'Contract'};
      wallet.moralisGetTransactionVerbose.mockResolvedValueOnce(raw);

      const result = await store.dispatch(
        getDecodedTransactionsByHash({
          transactionHash: '0xhash',
          chain: 'matic',
        }),
      );

      expect(wallet.moralisGetTransactionVerbose).toHaveBeenCalledWith({
        transactionHash: '0xhash',
        chain: '0x89',
      });
      expect(result).toEqual(raw);
    });
  });

  describe('getMultipleEvmTokenPrices', () => {
    it('sends tokens as [{tokenAddress}] (Moralis SDK input shape)', async () => {
      wallet.moralisGetMultipleERC20TokenPrices.mockResolvedValueOnce([]);

      await getMultipleEvmTokenPrices(wallet as any, ['0xaaa', '0xbbb'], '0x1');

      expect(wallet.moralisGetMultipleERC20TokenPrices).toHaveBeenCalledWith({
        chain: '0x1',
        include: 'percent_change',
        tokens: [{tokenAddress: '0xaaa'}, {tokenAddress: '0xbbb'}],
      });
    });
  });

  describe('getMultipleSolanaTokenPrices', () => {
    it('calls moralisGetMultipleSolTokenPrices', async () => {
      wallet.moralisGetMultipleSolTokenPrices.mockResolvedValueOnce([]);

      await getMultipleSolanaTokenPrices(wallet as any, ['solAddr1']);

      expect(wallet.moralisGetMultipleSolTokenPrices).toHaveBeenCalledWith({
        addresses: ['solAddr1'],
        network: 'mainnet',
      });
    });
  });

  describe('getMultipleTokenPrices', () => {
    it('maps EVM prices to the unified shape', async () => {
      wallet.moralisGetMultipleERC20TokenPrices.mockResolvedValueOnce([
        {tokenAddress: '0xaaa', usdPrice: 2, usdPrice24hrPercentChange: -1.5},
      ]);

      const result = await store.dispatch(
        getMultipleTokenPrices({addresses: ['0xaaa'], chain: 'eth'}),
      );

      expect(result).toEqual([
        {tokenAddress: '0xaaa', usdPrice: 2, '24hrPercentChange': -1.5},
      ]);
    });

    it('uses the SOL prices endpoint for SVM chains', async () => {
      wallet.moralisGetMultipleSolTokenPrices.mockResolvedValueOnce([
        {tokenAddress: 'solAddr', usdPrice: 3, usdPrice24hrPercentChange: 1},
      ]);

      const result = await store.dispatch(
        getMultipleTokenPrices({addresses: ['solAddr'], chain: 'sol'}),
      );

      expect(wallet.moralisGetMultipleSolTokenPrices).toHaveBeenCalledWith({
        addresses: ['solAddr'],
        network: 'mainnet',
      });
      expect(result).toEqual([
        {tokenAddress: 'solAddr', usdPrice: 3, '24hrPercentChange': 1},
      ]);
    });
  });

  describe('getERC20TokenBalanceByWallet', () => {
    it('returns [] without calling BWS for unsupported chains', async () => {
      const result = await store.dispatch(
        getERC20TokenBalanceByWallet({address: '0xabc', chain: 'btc'}),
      );

      expect(result).toEqual([]);
      expect(wallet.moralisGetWalletTokenBalances).not.toHaveBeenCalled();
    });

    it('calls moralisGetWalletTokenBalances', async () => {
      const raw = [{token_address: '0xaaa', balance: '1'}];
      wallet.moralisGetWalletTokenBalances.mockResolvedValueOnce(raw);

      const result = await store.dispatch(
        getERC20TokenBalanceByWallet({address: '0xabc', chain: 'arb'}),
      );

      expect(wallet.moralisGetWalletTokenBalances).toHaveBeenCalledWith({
        address: '0xabc',
        chain: '0xa4b1',
      });
      expect(result).toEqual(raw);
    });
  });

  describe('getSVMTokenBalanceByWallet', () => {
    it('returns the tokens from the moralisGetSolWalletPortfolio response', async () => {
      const tokens = [{mint: 'solAddr', amount: '1'}];
      wallet.moralisGetSolWalletPortfolio.mockResolvedValueOnce({tokens});

      const result = await store.dispatch(
        getSVMTokenBalanceByWallet({
          address: 'solWallet',
          chain: 'sol',
          network: 'mainnet',
        }),
      );

      expect(wallet.moralisGetSolWalletPortfolio).toHaveBeenCalledWith({
        address: 'solWallet',
        network: 'mainnet',
      });
      expect(result).toEqual(tokens);
    });

    it('throws for non-SVM chains without calling BWS', async () => {
      await expect(
        store.dispatch(
          getSVMTokenBalanceByWallet({
            address: '0xabc',
            chain: 'eth',
            network: 'mainnet',
          }),
        ),
      ).rejects.toThrow('Unsupported chain for SVM token balance');
      expect(wallet.moralisGetSolWalletPortfolio).not.toHaveBeenCalled();
    });
  });

  describe('getERC20TokenAllowance', () => {
    it('sends owner address and hex chain to moralisGetTokenAllowance', async () => {
      const raw = {result: []};
      wallet.moralisGetTokenAllowance.mockResolvedValueOnce(raw);

      const result = await store.dispatch(
        getERC20TokenAllowance({chain: 'op', ownerAddress: '0xowner'}),
      );

      expect(wallet.moralisGetTokenAllowance).toHaveBeenCalledWith({
        ownerAddress: '0xowner',
        chain: '0xa',
      });
      expect(result).toEqual(raw);
    });

    it('includes limit and cursor when provided', async () => {
      wallet.moralisGetTokenAllowance.mockResolvedValueOnce({result: []});

      await store.dispatch(
        getERC20TokenAllowance({
          chain: 'eth',
          ownerAddress: '0xowner',
          limit: 50,
          cursor: 'abc',
        }),
      );

      expect(wallet.moralisGetTokenAllowance).toHaveBeenCalledWith({
        ownerAddress: '0xowner',
        chain: '0x1',
        limit: 50,
        cursor: 'abc',
      });
    });
  });

  describe('getSigningWallet resolution (no wallets yet, e.g. fresh install)', () => {
    const emptyStore = () =>
      configureTestStore({
        WALLET: {keys: {}, customTokenOptionsByAddress: {}},
      } as any);

    beforeEach(() => {
      (logManager.error as jest.Mock).mockClear();
    });

    it('getMultipleTokenPrices returns [] without logging an error', async () => {
      const result = await emptyStore().dispatch(
        getMultipleTokenPrices({addresses: ['0xaaa'], chain: 'eth'}),
      );

      expect(result).toEqual([]);
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getSVMTokenBalanceByWallet returns [] without logging an error', async () => {
      const result = await emptyStore().dispatch(
        getSVMTokenBalanceByWallet({
          address: 'solWallet',
          chain: 'sol',
          network: 'mainnet',
        }),
      );

      expect(result).toEqual([]);
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getERC20TokenBalanceByWallet returns [] without logging an error', async () => {
      const result = await emptyStore().dispatch(
        getERC20TokenBalanceByWallet({address: '0xabc', chain: 'eth'}),
      );

      expect(result).toEqual([]);
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getERC20TokenPrice rejects without logging an error', async () => {
      await expect(
        emptyStore().dispatch(
          getERC20TokenPrice({address: '0xabc', chain: 'eth'}),
        ),
      ).rejects.toThrow('No wallet available to sign the Moralis request');
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getDecodedTransactionsByHash rejects without logging an error', async () => {
      await expect(
        emptyStore().dispatch(
          getDecodedTransactionsByHash({
            transactionHash: '0xhash',
            chain: 'eth',
          }),
        ),
      ).rejects.toThrow('No wallet available to sign the Moralis request');
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getERC20TokenAllowance rejects without logging an error', async () => {
      await expect(
        emptyStore().dispatch(
          getERC20TokenAllowance({chain: 'eth', ownerAddress: '0xowner'}),
        ),
      ).rejects.toThrow('No wallet available to sign the Moralis request');
      expect(logManager.error).not.toHaveBeenCalled();
    });
  });

  describe('BWC {body, header} response wrapper', () => {
    beforeEach(() => {
      (logManager.error as jest.Mock).mockClear();
    });

    it('getMultipleTokenPrices unwraps the wrapper for EVM chains', async () => {
      wallet.moralisGetMultipleERC20TokenPrices.mockResolvedValueOnce({
        body: [
          {tokenAddress: '0xaaa', usdPrice: 2, usdPrice24hrPercentChange: -1.5},
        ],
        header: {'content-type': 'application/json'},
      });

      const result = await store.dispatch(
        getMultipleTokenPrices({addresses: ['0xaaa'], chain: 'eth'}),
      );

      expect(result).toEqual([
        {tokenAddress: '0xaaa', usdPrice: 2, '24hrPercentChange': -1.5},
      ]);
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getMultipleTokenPrices unwraps the wrapper for SVM chains', async () => {
      wallet.moralisGetMultipleSolTokenPrices.mockResolvedValueOnce({
        body: [
          {tokenAddress: 'solAddr1', usdPrice: 5, usdPrice24hrPercentChange: 3},
        ],
        header: {},
      });

      const result = await store.dispatch(
        getMultipleTokenPrices({addresses: ['solAddr1'], chain: 'sol'}),
      );

      expect(result).toEqual([
        {tokenAddress: 'solAddr1', usdPrice: 5, '24hrPercentChange': 3},
      ]);
      expect(logManager.error).not.toHaveBeenCalled();
    });

    it('getERC20TokenPrice unwraps the wrapper', async () => {
      wallet.moralisGetTokenPrice.mockResolvedValueOnce({
        body: {usdPrice: 123},
        header: {},
      });

      const result = await store.dispatch(
        getERC20TokenPrice({address: '0xabc', chain: 'eth'}),
      );

      expect(result).toEqual({usdPrice: 123});
    });

    it('getDecodedTransactionsByHash unwraps the wrapper', async () => {
      wallet.moralisGetTransactionVerbose.mockResolvedValueOnce({
        body: {logs: [], to_address_label: 'Contract'},
        header: {},
      });

      const result = await store.dispatch(
        getDecodedTransactionsByHash({
          transactionHash: '0xhash',
          chain: 'eth',
        }),
      );

      expect(result).toEqual({logs: [], to_address_label: 'Contract'});
    });

    it('getERC20TokenBalanceByWallet unwraps the wrapper', async () => {
      wallet.moralisGetWalletTokenBalances.mockResolvedValueOnce({
        body: [{token_address: '0xaaa', balance: '10'}],
        header: {},
      });

      const result = await store.dispatch(
        getERC20TokenBalanceByWallet({address: '0xabc', chain: 'eth'}),
      );

      expect(result).toEqual([{token_address: '0xaaa', balance: '10'}]);
    });

    it('getSVMTokenBalanceByWallet unwraps the wrapper before reading tokens', async () => {
      wallet.moralisGetSolWalletPortfolio.mockResolvedValueOnce({
        body: {tokens: [{mint: 'mint1', amount: '3'}]},
        header: {},
      });

      const result = await store.dispatch(
        getSVMTokenBalanceByWallet({
          address: 'solWallet',
          chain: 'sol',
          network: 'mainnet',
        }),
      );

      expect(result).toEqual([{mint: 'mint1', amount: '3'}]);
    });

    it('getERC20TokenAllowance unwraps the wrapper', async () => {
      wallet.moralisGetTokenAllowance.mockResolvedValueOnce({
        body: {result: [{spender: {address: '0xspender'}}], cursor: null},
        header: {},
      });

      const result = await store.dispatch(
        getERC20TokenAllowance({chain: 'eth', ownerAddress: '0xowner'}),
      );

      expect(result).toEqual({
        result: [{spender: {address: '0xspender'}}],
        cursor: null,
      });
    });
  });
});
