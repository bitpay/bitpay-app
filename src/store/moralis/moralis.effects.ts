import {Effect} from '..';
import {
  MoralisErc20TokenBalanceByWalletData,
  MoralisSVMTokenBalanceByWalletData,
  MoralisTokenPriceData,
  MoralisWalletApprovalsData,
} from './moralis.types';
import {IsSVMChain} from '../../store/wallet/utils/currency';
import {logManager} from '../../managers/LogManager';
import type {Key, Wallet} from '../wallet/wallet.models';

const MORALIS_EVM_CHAIN: {[key in string]: string} = {
  arb: '0xa4b1',
  base: '0x2105',
  eth: '0x1',
  matic: '0x89',
  op: '0xa',
};

// ------- MORALIS API ------- //

const getSigningWallet = (keys: {[id: string]: Key}): Wallet | undefined => {
  for (const key of Object.values(keys)) {
    const wallet = key.wallets?.[0];
    if (wallet) {
      return wallet;
    }
  }
  return undefined;
};

const unwrapMoralisResponse = <T>(response: any): T =>
  response &&
  typeof response === 'object' &&
  'body' in response &&
  'header' in response
    ? response.body
    : response;

// ------- TRANSACTION API ------- //

export const getDecodedTransactionsByHash =
  ({
    transactionHash,
    chain,
  }: {
    transactionHash: string;
    chain: string;
  }): Effect<Promise<any>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      throw new Error('No wallet available to sign the Moralis request');
    }
    try {
      const data = unwrapMoralisResponse<any>(
        await wallet.moralisGetTransactionVerbose({
          transactionHash,
          chain: MORALIS_EVM_CHAIN[chain],
        }),
      );

      logManager.info(
        '[moralis/getDecodedTransactionsByHash]: get transactions successfully',
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getDecodedTransactionsByHash]: an error occurred while getting transactions: ${errorStr}`,
      );
      throw e;
    }
  };

// ------- TOKEN API ------- //

export const getERC20TokenPrice =
  ({
    address,
    chain,
  }: {
    address: string;
    chain: string;
  }): Effect<Promise<MoralisTokenPriceData>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      throw new Error('No wallet available to sign the Moralis request');
    }
    try {
      const data = unwrapMoralisResponse<MoralisTokenPriceData>(
        await wallet.moralisGetTokenPrice({
          address,
          chain: MORALIS_EVM_CHAIN[chain],
        }),
      );

      logManager.info(
        '[moralis/getERC20TokenPrice]: get ERC20 token price successfully',
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getERC20TokenPrice]: an error occurred while getting ERC20 token price: ${errorStr}`,
      );
      throw e;
    }
  };

export type UnifiedTokenPriceObj = {
  tokenAddress: string;
  usdPrice: number;
  '24hrPercentChange': number;
};

export const getMultipleSolanaTokenPrices = async (
  wallet: Wallet,
  addresses: string[],
): Promise<UnifiedTokenPriceObj[]> => {
  try {
    return unwrapMoralisResponse<UnifiedTokenPriceObj[]>(
      await wallet.moralisGetMultipleSolTokenPrices({
        addresses,
        network: 'mainnet',
      }),
    );
  } catch (e: any) {
    throw e.response?.data || e;
  }
};

export const getMultipleEvmTokenPrices = async (
  wallet: Wallet,
  addresses: string[],
  chain: string,
): Promise<UnifiedTokenPriceObj[]> => {
  try {
    return unwrapMoralisResponse<UnifiedTokenPriceObj[]>(
      await wallet.moralisGetMultipleERC20TokenPrices({
        chain,
        include: 'percent_change',
        tokens: addresses.map(addr => ({tokenAddress: addr})),
      }),
    );
  } catch (e: any) {
    throw e.response?.data || e;
  }
};

export const getMultipleTokenPrices =
  ({
    addresses,
    chain,
  }: {
    addresses: string[];
    chain: string;
  }): Effect<Promise<UnifiedTokenPriceObj[]>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      return [];
    }
    try {
      let data: UnifiedTokenPriceObj[] = [];
      if (IsSVMChain(chain)) {
        const response = await getMultipleSolanaTokenPrices(wallet, addresses);
        logManager.info(
          '[moralis/getMultipleTokenPrices]: get SVM token prices successfully',
        );
        data = response.map((item: any) => ({
          tokenAddress: item.tokenAddress,
          usdPrice: item.usdPrice,
          '24hrPercentChange': item.usdPrice24hrPercentChange,
        }));
      } else {
        const response = await getMultipleEvmTokenPrices(
          wallet,
          addresses,
          MORALIS_EVM_CHAIN[chain] || chain,
        );
        logManager.info(
          '[moralis/getMultipleTokenPrices]: get EVM token prices successfully',
        );
        data = response.map((item: any) => ({
          tokenAddress: item.tokenAddress,
          usdPrice: item.usdPrice,
          '24hrPercentChange': item.usdPrice24hrPercentChange,
        }));
      }
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getMultipleTokenPrices]: an error occurred while getting ERC20/SOL token price: ${errorStr}`,
      );
      throw e;
    }
  };

export const getSVMTokenBalanceByWallet =
  ({
    address,
    chain,
    network,
  }: {
    address: string;
    chain: string;
    network: string;
  }): Effect<Promise<MoralisSVMTokenBalanceByWalletData[]>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      return [];
    }
    try {
      if (!IsSVMChain(chain)) {
        throw new Error('Unsupported chain for SVM token balance');
      }
      const data = unwrapMoralisResponse<{
        tokens: MoralisSVMTokenBalanceByWalletData[];
      }>(
        await wallet.moralisGetSolWalletPortfolio({
          address,
          network,
        }),
      );

      logManager.info(
        '[moralis/getSVMTokenBalanceByWallet]: get SVM token balance successfully',
      );
      return data.tokens;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getSVMTokenBalanceByWallet]: an error occurred while getting SVM token balance: ${errorStr}`,
      );
      throw e;
    }
  };

export const getERC20TokenBalanceByWallet =
  ({
    address,
    chain,
  }: {
    address: string;
    chain: string;
  }): Effect<Promise<MoralisErc20TokenBalanceByWalletData[]>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      return [];
    }
    try {
      if (!MORALIS_EVM_CHAIN[chain]) {
        return [];
      }
      const data = unwrapMoralisResponse<
        MoralisErc20TokenBalanceByWalletData[]
      >(
        await wallet.moralisGetWalletTokenBalances({
          address,
          chain: MORALIS_EVM_CHAIN[chain],
        }),
      );

      logManager.info(
        '[moralis/getERC20TokenBalanceByWallet]: get ERC20 token balance successfully',
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getERC20TokenBalanceByWallet]: an error occurred while getting ERC20 token balance: ${errorStr}`,
      );
      throw e;
    }
  };

export const getERC20TokenAllowance =
  ({
    chain,
    ownerAddress,
    limit,
    cursor,
  }: {
    chain: string;
    ownerAddress: string;
    limit?: number;
    cursor?: string | null;
  }): Effect<Promise<MoralisWalletApprovalsData>> =>
  async (dispatch, getState) => {
    const wallet = getSigningWallet(getState().WALLET.keys);
    if (!wallet) {
      throw new Error('No wallet available to sign the Moralis request');
    }
    try {
      const _chain = MORALIS_EVM_CHAIN[chain] || chain;

      const data = unwrapMoralisResponse<MoralisWalletApprovalsData>(
        await wallet.moralisGetTokenAllowance({
          ownerAddress,
          chain: _chain,
          ...(limit ? {limit} : {}),
          ...(cursor ? {cursor} : {}),
        }),
      );
      logManager.info(
        '[moralis/getERC20TokenAllowance]: get ERC20 token allowance successfully',
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      logManager.error(
        `[moralis/getERC20TokenAllowance]: an error occurred while getting ERC20 token allowance: ${errorStr}`,
      );
      throw e;
    }
  };
