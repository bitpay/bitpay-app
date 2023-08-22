import Moralis from 'moralis';
import {EvmChain} from '@moralisweb3/common-evm-utils';
import {LogActions} from '../log';
import {Effect} from '..';
import axios from 'axios';
import {MORALIS_API_KEY} from '@env';

const MORALIS_EVM_CHAIN: {[key in string]: any} = {
  eth: EvmChain.ETHEREUM,
  matic: EvmChain.POLYGON,
};

// ------- MORALIS API ------- //

// ------- INIT ------- //

export const moralisInit = (): Effect<Promise<void>> => async dispatch => {
  try {
    await Moralis.start({
      apiKey: MORALIS_API_KEY,
    });
    dispatch(
      LogActions.info('[moralis/init]: client initialized successfully'),
    );
    return;
  } catch (e) {
    let errorStr;
    if (e instanceof Error) {
      errorStr = e.message;
    } else {
      errorStr = JSON.stringify(e);
    }
    dispatch(
      LogActions.error(
        `[moralis/init]: an error occurred while initializing client: ${errorStr}`,
      ),
    );
    throw e;
  }
};

// ------- BALANCE API ------- //

export const getNativeBalanceByAddress =
  ({address, chain}: {address: string; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.balance.getNativeBalance({
        address,
        chain: MORALIS_EVM_CHAIN[chain],
      });
      dispatch(
        LogActions.info(
          '[moralis/getNativeBalanceByAddress]: get balance successfully',
        ),
      );
      return response;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getNativeBalanceByAddress]: an error occurred while getting balance: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getNativeBalanceByAddresses =
  ({
    addresses,
    chain,
  }: {
    addresses: string[];
    chain: string;
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      const headers = {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY,
      };
      const {data} = await axios.get(
        `https://deep-index.moralis.io/api/v2/wallets/balances?chain=${chain}&${addresses
          .map((address, index) => `wallet_addresses[${index}]=${address}`)
          .join('&')}`,
        {headers},
      );
      dispatch(
        LogActions.info(
          '[moralis/getNativeBalanceByAddresses]: get balances successfully',
        ),
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getNativeBalanceByAddresses]: an error occurred while getting balances: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

// ------- TRANSACTION API ------- //

export const getNativeTransactionsByWallet =
  ({address, chain}: {address: string; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {result} = await Moralis.EvmApi.transaction.getWalletTransactions({
        address,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getNativeTransactionsByWallet]: get transactions successfully',
        ),
      );
      return result;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getNativeTransactionsByWallet]: an error occurred while getting transactions: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getDecodedTransactionsByWallet =
  ({address, chain}: {address: string; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {result} =
        await Moralis.EvmApi.transaction.getWalletTransactionsVerbose({
          address,
          chain: MORALIS_EVM_CHAIN[chain],
        });

      dispatch(
        LogActions.info(
          '[moralis/getDecodedTransactionsByWallet]: get transactions successfully',
        ),
      );
      return result;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getDecodedTransactionsByWallet]: an error occurred while getting transactions: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getInternalTransactionsByHash =
  ({
    transactionHash,
    chain,
  }: {
    transactionHash: string;
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const headers = {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY,
      };
      const {data} = await axios.get(
        `https://deep-index.moralis.io/api/v2/transaction/${transactionHash}/internal-transactions?chain=${chain}`,
        {headers},
      );
      dispatch(
        LogActions.info(
          '[moralis/getInternalTransactionsByHash]: get transactions successfully',
        ),
      );

      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getInternalTransactionsByHash]: an error occurred while getting transactions: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getTransactionsByHash =
  ({
    transactionHash,
    chain,
  }: {
    transactionHash: string;
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.transaction.getTransaction({
        transactionHash,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getTransactionsByHash]: get transactions successfully',
        ),
      );
      return response?.toJSON();
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getTransactionsByHash]: an error occurred while getting transactions: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getDecodedTransactionsByHash =
  ({
    transactionHash,
    chain,
  }: {
    transactionHash: string;
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const headers = {
        accept: 'application/json',
        'X-API-Key': MORALIS_API_KEY,
      };
      const {data} = await axios.get(
        `https://deep-index.moralis.io/api/v2/transaction/${transactionHash}/verbose?chain=${chain}`,
        {headers},
      );
      dispatch(
        LogActions.info(
          '[moralis/getDecodedTransactionsByHash]: get transactions successfully',
        ),
      );
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getDecodedTransactionsByHash]: an error occurred while getting transactions: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

// ------- BLOCK API ------- //

export const getBlockByHash =
  ({
    blockNumberOrHash,
    chain,
  }: {
    blockNumberOrHash: string;
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.block.getBlock({
        blockNumberOrHash,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info('[moralis/getBlockByHash]: get block successfully'),
      );
      return response?.toJSON();
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getBlockByHash]: an error occurred while getting block: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getBlockByDate =
  ({date, chain}: {date: any; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.block.getDateToBlock({
        date, // Unix date in milliseconds or a datestring (any format that is accepted by momentjs)
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info('[moralis/getBlockByDate]: get block successfully'),
      );
      return response?.result;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getBlockByDate]: an error occurred while getting block: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

// ------- TOKEN API ------- //

export const getERC20TokenPrice =
  ({address, chain}: {address: string; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {raw} = await Moralis.EvmApi.token.getTokenPrice({
        address,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getERC20TokenPrice]: get ERC20 token price successfully',
        ),
      );
      return raw;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getERC20TokenPrice]: an error occurred while getting ERC20 token price: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getERC20TokenBalanceByWallet =
  ({address, chain}: {address: string; chain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {raw} = await Moralis.EvmApi.token.getWalletTokenBalances({
        address,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getERC20TokenBalanceByWallet]: get ERC20 token balance successfully',
        ),
      );
      return raw;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getERC20TokenBalanceByWallet]: an error occurred while getting ERC20 token balance: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getERC20TokenMetadataByContract =
  ({
    addresses,
    chain,
  }: {
    addresses: string[];
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {raw} = await Moralis.EvmApi.token.getTokenMetadata({
        addresses,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getERC20TokenMetadataByContract]: get ERC20 token metadata successfully',
        ),
      );

      return raw;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getERC20TokenMetadataByContract]: an error occurred while getting ERC20 token metadata: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getERC20TokenMetadataBySymbol =
  ({
    symbols,
    chain,
  }: {
    symbols: string[];
    chain: string;
  }): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const {raw} = await Moralis.EvmApi.token.getTokenMetadataBySymbol({
        symbols,
        chain: MORALIS_EVM_CHAIN[chain],
      });

      dispatch(
        LogActions.info(
          '[moralis/getERC20TokenMetadataBySymbol]: get ERC20 token metadata successfully',
        ),
      );
      return raw;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getERC20TokenMetadataBySymbol]: an error occurred while getting ERC20 token metadata: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

// ------- RESOLVE API ------- //

export const getAddressByENSDomain =
  ({domain}: {domain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.resolve.resolveENSDomain({
        domain,
      });

      dispatch(
        LogActions.info(
          '[moralis/getAddressByENSDomain]: get address by ENS domain successfully',
        ),
      );
      return response?.raw.address;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getAddressByENSDomain]: an error occurred while getting address by ENS domain: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getAddressByUnstoppableDomain =
  ({domain}: {domain: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.resolve.resolveDomain({
        domain,
      });

      dispatch(
        LogActions.info(
          '[moralis/getAddressByUnstoppableDomain]: get address by Unstoppable domain successfully',
        ),
      );
      return response?.raw.address;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getAddressByUnstoppableDomain]: an error occurred while getting address by Unstoppable domain: ${errorStr}`,
        ),
      );
      throw e;
    }
  };

export const getENSDomainByAddress =
  ({address}: {address: string}): Effect<Promise<any>> =>
  async dispatch => {
    try {
      const response = await Moralis.EvmApi.resolve.resolveAddress({
        address,
      });

      dispatch(
        LogActions.info(
          '[moralis/getENSDomainByAddress]: get ENS domain by address successfully',
        ),
      );

      return response?.raw.name;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(
        LogActions.error(
          `[moralis/getENSDomainByAddress]: an error occurred while getting ENS domain by address: ${errorStr}`,
        ),
      );
      throw e;
    }
  };
