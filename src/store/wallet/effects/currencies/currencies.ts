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
  BASE_BWS_URL,
  EVM_BLOCKCHAIN_EXPLORERS,
} from '../../../../constants/config';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      dispatch(LogActions.info('starting [startGetTokenOptions]'));
      let tokenOptions: {[key in string]: Token} = {};
      let tokenOptionsByAddress: {[key in string]: Token} = {};
      let tokenData: {[key in string]: CurrencyOpts} = {};
      for await (const chain of SUPPORTED_EVM_COINS) {
        let {data: tokens} = await axios.get<{[key in string]: Token}>(
          `${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain}`,
        );
        Object.values(tokens).forEach(token => {
          if (
            BitpaySupportedCurrencies[
              getCurrencyAbbreviation(token.symbol, chain)
            ]
          ) {
            return;
          } // remove bitpay supported tokens and currencies
          populateTokenInfo({
            chain,
            token,
            tokenOptions,
            tokenData,
            tokenOptionsByAddress,
          });
        });
      }
      dispatch(
        successGetTokenOptions({
          tokenOptions,
          tokenData,
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
      if (
        BitpaySupportedCurrencies[getCurrencyAbbreviation(token.symbol, chain)]
      ) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
        chain,
        token,
        tokenOptions: customTokenOptions,
        tokenData: customTokenData,
        tokenOptionsByAddress: customTokenOptionsByAddress,
      });
      dispatch(
        successGetCustomTokenOptions({
          customTokenOptions,
          customTokenData,
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
  tokenOptionsByAddress,
}: {
  chain: string;
  token: Token;
  tokenOptions: {[key in string]: Token};
  tokenData: {[key in string]: CurrencyOpts};
  tokenOptionsByAddress: {[key in string]: Token};
}) => {
  tokenOptions[getCurrencyAbbreviation(token.symbol, chain)] = token;
  tokenOptionsByAddress[getCurrencyAbbreviation(token.address, chain)] = token;
  tokenData[getCurrencyAbbreviation(token.symbol, chain)] = {
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
  };
};
