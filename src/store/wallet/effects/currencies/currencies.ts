import {Effect} from '../../../index';
import axios from 'axios';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetCustomTokenOptions,
  successGetTokenOptions,
} from '../../wallet.actions';
import {Currencies, CurrencyOpts} from '../../../../constants/currencies';
import {useLogger} from '../../../../utils/hooks';

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    const logger = useLogger();
    try {
      logger.info('startGetTokenOptions: starting...');
      const {
        data: {tokens},
      } = await axios.get<{
        tokens: {[key in string]: Token};
      }>('https://api.1inch.io/v4.0/1/tokens');

      const tokenOptions: {[key in string]: Token} = {};
      const tokenOptionsByAddress: {[key in string]: Token} = {};
      const tokenData: {[key in string]: CurrencyOpts} = {};
      Object.values(tokens).forEach(token => {
        if (Currencies[token.symbol.toLowerCase()]) {
          return;
        } // remove bitpay supported tokens and currencies
        populateTokenInfo({
          token,
          tokenOptions,
          tokenData,
          tokenOptionsByAddress,
        });
      });

      dispatch(
        successGetTokenOptions({
          tokenOptions,
          tokenData,
          tokenOptionsByAddress,
        }),
      );
      logger.info('startGetTokenOptions: successful');
    } catch (e) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      dispatch(failedGetTokenOptions());
      logger.error(`startGetTokenOptions: ${errorStr}`);
    }
  };

export const addCustomTokenOption =
  (token: Token): Effect =>
  async dispatch => {
    const logger = useLogger();
    try {
      const customTokenOptions: {[key in string]: Token} = {};
      const customTokenOptionsByAddress: {[key in string]: Token} = {};
      const customTokenData: {[key in string]: CurrencyOpts} = {};
      if (Currencies[token.symbol.toLowerCase()]) {
        return;
      } // remove bitpay supported tokens and currencies
      populateTokenInfo({
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
      logger.error(`AddCustomTokenOption: ${errString}`);
      dispatch(failedGetTokenOptions());
    }
  };

const populateTokenInfo = ({
  token,
  tokenOptions,
  tokenData,
  tokenOptionsByAddress,
}: {
  token: Token;
  tokenOptions: {[key in string]: Token};
  tokenData: {[key in string]: CurrencyOpts};
  tokenOptionsByAddress: {[key in string]: Token};
}) => {
  tokenOptions[token.symbol.toLowerCase()] = token;
  tokenOptionsByAddress[token.address.toLowerCase()] = token;
  tokenData[token.symbol.toLowerCase()] = {
    name: token.name,
    chain: 'ETH',
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
      protocolPrefix: {livenet: 'ethereum', testnet: 'ethereum'},
      ratesApi: '',
      blockExplorerUrls: 'etherscan.io/',
      blockExplorerUrlsTestnet: 'kovan.etherscan.io/',
    },
    feeInfo: {
      feeUnit: 'Gwei',
      feeUnitAmount: 1e9,
      blockTime: 0.2,
      maxMerchantFee: 'urgent',
    },
    theme: {
      coinColor: '#2775ca',
      backgroundColor: '#2775c9',
      gradientBackgroundColor: '#2775c9',
    },
  };
};
