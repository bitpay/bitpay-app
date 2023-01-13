import {Effect} from '../../../index';
import axios from 'axios';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetCustomTokenOptions,
  successGetTokenOptions,
} from '../../wallet.actions';
import {
  BitpaySupportedCurrencies,
  CurrencyOpts,
  SUPPORTED_EVM_COINS,
} from '../../../../constants/currencies';
import {LogActions} from '../../../log';
import {
  EVM_BLOCKCHAIN_EXPLORERS,
  EVM_BLOCKCHAIN_ID,
} from '../../../../constants/config';
import {
  addTokenChainSuffix,
  getCurrencyAbbreviation,
} from '../../../../utils/helper-methods';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      dispatch(LogActions.info('starting [startGetTokenOptions]'));
      let tokenOptions: {[key in string]: Token} = {};
      let tokenOptionsByAddress: {[key in string]: Token} = {};
      let tokenData: {[key in string]: CurrencyOpts} = {};
      let tokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      for await (const chain of SUPPORTED_EVM_COINS) {
        let {
          data: {tokens},
        } = await axios.get<{
          tokens: {[key in string]: Token};
        }>(`https://api.1inch.io/v4.0/${EVM_BLOCKCHAIN_ID[chain]}/tokens`);
        Object.values(tokens).forEach(token => {
          if (
            BitpaySupportedCurrencies[addTokenChainSuffix(token.address, chain)]
          ) {
            return;
          } // remove bitpay supported tokens and currencies
          populateTokenInfo({
            chain,
            token,
            tokenOptions,
            tokenData,
            tokenDataByAddress,
            tokenOptionsByAddress,
          });
        });
      }
      dispatch(
        successGetTokenOptions({
          tokenOptions,
          tokenData,
          tokenDataByAddress,
          tokenOptionsByAddress,
        }),
      );
      dispatch(LogActions.info('successful [startGetTokenOptions]'));
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(failedGetTokenOptions());
      dispatch(LogActions.error(`failed [startGetTokenOptions]: ${errorStr}`));
    }
  };

export const addCustomTokenOption =
  (token: Token, chain: string): Effect =>
  async dispatch => {
    try {
      const customTokenOptions: {[key in string]: Token} = {};
      const customTokenOptionsByAddress: {[key in string]: Token} = {};
      const customTokenData: {[key in string]: CurrencyOpts} = {};
      const customTokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      if (
        BitpaySupportedTokenOptsByAddress[
          addTokenChainSuffix(token.address, chain)
        ]
      ) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
        chain,
        token,
        tokenOptions: customTokenOptions,
        tokenData: customTokenData,
        tokenDataByAddress: customTokenDataByAddress,
        tokenOptionsByAddress: customTokenOptionsByAddress,
      });
      dispatch(
        successGetCustomTokenOptions({
          customTokenOptions,
          customTokenData,
          customTokenDataByAddress,
          customTokenOptionsByAddress,
        }),
      );
    } catch (e) {
      const errString = e instanceof Error ? e.message : JSON.stringify(e);
      dispatch(LogActions.error(`Add custom options: ${errString}`));
      dispatch(failedGetTokenOptions());
    }
  };

const populateTokenInfo = ({
  chain,
  token,
  tokenOptions,
  tokenData,
  tokenDataByAddress,
  tokenOptionsByAddress,
}: {
  chain: string;
  token: Token;
  tokenOptions: {[key in string]: Token};
  tokenData: {[key in string]: CurrencyOpts};
  tokenDataByAddress: {[key in string]: CurrencyOpts};
  tokenOptionsByAddress: {[key in string]: Token};
}) => {
  const tokenAddress = addTokenChainSuffix(token.address, chain);
  const tokenOpts = {
    name: token.name.replace('(PoS)', '').trim(),
    chain,
    coin: token.symbol,
    logoURI: token.logoURI,
    unitInfo: {
      unitName: token.symbol.toUpperCase(),
      unitToSatoshi: 10 ** token.decimals,
      unitDecimals: token.decimals,
      unitCode: token.symbol,
    },
    properties: {
      hasMultiSig: false,
      hasMultiSend: false,
      isUtxo: false,
      isERCToken: true,
      isStableCoin: false,
      singleAddress: true,
      isCustom: true,
    },
    paymentInfo: {
      paymentCode: 'EIP681b',
      protocolPrefix: {livenet: chain, testnet: chain},
      ratesApi: '',
      blockExplorerUrls: EVM_BLOCKCHAIN_EXPLORERS[chain].livenet,
      blockExplorerUrlsTestnet: EVM_BLOCKCHAIN_EXPLORERS[chain].testnet,
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    tokenAddress,
  };
  tokenOptions[getCurrencyAbbreviation(token.symbol, chain)] = token;
  tokenOptionsByAddress[tokenAddress] = token;
  tokenData[getCurrencyAbbreviation(token.symbol, chain)] = tokenOpts;
  tokenDataByAddress[tokenAddress] = tokenOpts;
};
