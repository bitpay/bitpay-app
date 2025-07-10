import {Effect} from '../../../index';
import axios from 'axios';
import {Token} from '../../wallet.models';
import {
  failedGetTokenOptions,
  successGetCustomTokenOptions,
  successGetTokenOptions,
  successImport,
} from '../../wallet.actions';
import {
  BitpaySupportedTokens,
  CurrencyOpts,
  SUPPORTED_VM_TOKENS,
} from '../../../../constants/currencies';
import {LogActions} from '../../../log';
import {BASE_BWS_URL, BLOCKCHAIN_EXPLORERS} from '../../../../constants/config';
import {
  addTokenChainSuffix,
  getCurrencyAbbreviation,
  getEVMFeeCurrency,
} from '../../../../utils/helper-methods';
import {GetProtocolPrefix} from '../../utils/currency';
import {AppActions} from '../../../app';
import {buildWalletObj, mapAbbreviationAndName} from '../../utils/wallet';
import merge from 'lodash.merge';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';

export const startGetTokenOptions =
  (): Effect<Promise<void>> => async dispatch => {
    try {
      dispatch(LogActions.info('starting [startGetTokenOptions]'));
      let tokenOptionsByAddress: {[key in string]: Token} = {};
      let tokenDataByAddress: {[key in string]: CurrencyOpts} = {};
      for await (const chain of SUPPORTED_VM_TOKENS) {
        let tokens = {} as {[key in string]: Token};
        try {
          const {data} = await axios.get<{[key in string]: Token}>(
            `${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain}`,
          );
          tokens = data;
        } catch (error) {
          dispatch(
            LogActions.info(
              `request: ${BASE_BWS_URL}/v1/service/oneInch/getTokens/${chain} failed - continue anyway [startGetTokenOptions]`,
            ),
          );
        }
        if (!Array.isArray(tokens)) {
          dispatch(
            LogActions.error(
              `Unexpected response [startGetTokenOptions]: ${tokens}`,
            ),
          );
          return;
        }

        tokens.forEach(token => {
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
      dispatch(AppActions.appTokensDataLoaded());
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(failedGetTokenOptions());
      dispatch(LogActions.error(`failed [startGetTokenOptions]: ${errorStr}`));
      dispatch(AppActions.appTokensDataLoaded());
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
    feeCurrency: getEVMFeeCurrency(chain),
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
      protocolPrefix: {
        livenet: GetProtocolPrefix('livenet', chain),
        testnet: GetProtocolPrefix('testnet', chain),
        regtest: GetProtocolPrefix('regtest', chain),
      },
      ratesApi: '',
      blockExplorerUrls: BLOCKCHAIN_EXPLORERS[chain].livenet,
      blockExplorerUrlsTestnet: BLOCKCHAIN_EXPLORERS[chain].testnet,
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

export const startPolMigration =
  (): Effect<Promise<void>> =>
  async (dispatch, getState): Promise<void> => {
    return new Promise(async resolve => {
      dispatch(LogActions.info('[startPolMigration] - starting...'));
      const {keys, tokenOptionsByAddress, customTokenOptionsByAddress} =
        getState().WALLET;
      const tokenOpts = {
        ...BitpaySupportedTokenOptsByAddress,
        ...tokenOptionsByAddress,
        ...customTokenOptionsByAddress,
      };
      Object.values(keys).forEach(key => {
        key.wallets = key.wallets.map(wallet => {
          const {currencyAbbreviation, currencyName} = dispatch(
            mapAbbreviationAndName(
              wallet.credentials.coin,
              wallet.credentials.chain,
              wallet.credentials?.token?.address,
            ),
          );
          return merge(
            wallet,
            buildWalletObj({
              ...wallet.credentials,
              ...wallet,
              currencyAbbreviation,
              currencyName,
            }),
          );
        });
        dispatch(
          successImport({
            key,
          }),
        );
      });
      dispatch(LogActions.info('success [startPolMigration]}'));
      return resolve();
    });
  };
