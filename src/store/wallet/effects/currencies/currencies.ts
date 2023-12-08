import {Effect} from '../../../index';
import axios from 'axios';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetCustomTokenOptions,
  successGetTokenOptions,
} from '../../wallet.actions';
import {
  BitpaySupportedTokens,
  CurrencyOpts,
  SUPPORTED_EVM_COINS,
} from '../../../../constants/currencies';
import {LogActions} from '../../../log';
import {
  BASE_BWS_URL,
  EVM_BLOCKCHAIN_EXPLORERS,
} from '../../../../constants/config';
import {
  addTokenChainSuffix,
  getCurrencyAbbreviation,
} from '../../../../utils/helper-methods';

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      dispatch(LogActions.info('starting [startGetTokenOptions]'));
      let tokenOptionsByAddress: {[key in string]: Token} = {};
      let tokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      for await (const chain of SUPPORTED_EVM_COINS) {
        let {data: tokens} = await axios.get<{[key in string]: Token}>(
          `${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain}`,
        );
        Object.values(tokens).forEach(token => {
          if (
            BitpaySupportedTokens[getCurrencyAbbreviation(token.address, chain)]
          ) {
            return;
          } // remove bitpay supported tokens and currencies
          populateTokenInfo({
            chain,
            token,
            tokenOptionsByAddress,
            tokenDataByAddress,
          });
        });
      }
      dispatch(
        successGetTokenOptions({
          tokenOptionsByAddress,
          tokenDataByAddress,
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
      const customTokenOptionsByAddress: {[key in string]: Token} = {};
      const customTokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      if (
        BitpaySupportedTokens[getCurrencyAbbreviation(token.address, chain)]
      ) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
        chain,
        token,
        tokenOptionsByAddress: customTokenOptionsByAddress,
        tokenDataByAddress: customTokenDataByAddress,
      });
      dispatch(
        successGetCustomTokenOptions({
          customTokenOptionsByAddress,
          customTokenDataByAddress,
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
  tokenOptionsByAddress,
  tokenDataByAddress,
}: {
  chain: string;
  token: Token;
  tokenOptionsByAddress: {[key in string]: Token};
  tokenDataByAddress: {[key in string]: CurrencyOpts};
}) => {
  const tokenAddressWithSuffix = addTokenChainSuffix(token.address, chain);
  const tokenData = {
    name: token.name.replace('(PoS)', '').trim(),
    chain,
    coin: token.symbol.toLowerCase(),
    logoURI: token.logoURI,
    address: token.address,
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
  tokenOptionsByAddress[tokenAddressWithSuffix] = token;
  tokenDataByAddress[tokenAddressWithSuffix] = tokenData;
};

export const startCustomTokensMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      dispatch(LogActions.info('[startCustomTokensMigration] - starting...'));
      const {customTokenOptions, customTokenData} = getState().WALLET;
      Object.values(customTokenOptions || {}).forEach(token => {
        dispatch(LogActions.info(`Migrating: ${JSON.stringify(token)}`));
        const chain =
          customTokenData[token.symbol.toLowerCase()]?.chain || 'eth';
        let customToken: Token = {
          name: token.name,
          symbol: token.symbol?.toLowerCase(),
          decimals: Number(token.decimals),
          address: token.address?.toLowerCase(),
        };
        addCustomTokenOption(customToken, chain);
      });
      dispatch(LogActions.info('success [startCustomTokensMigration]}'));
      return resolve();
    });
  };
