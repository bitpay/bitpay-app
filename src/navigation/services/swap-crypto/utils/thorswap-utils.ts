import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {
  ThorswapCurrency,
  ThorswapGetSwapQuoteData,
  ThorswapProvider,
  thorswapQuoteRoute,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {
  ONE_INCH_ABI,
  SUSHISWAP_ABI,
  THORCHAIN_ABI,
  UNISWAP_V2_ABI,
  UNISWAP_V3_ABI,
} from '../constants/SwapCryptoConstants';
import {THORSWAP_DEFAULT_GAS_LIMIT} from '../constants/ThorswapConstants';

export const thorswapEnv = __DEV__ ? 'sandbox' : 'production';

export const getThorswapCurrenciesFixedProps = (
  thorswapCurrenciesData: ThorswapCurrency[],
): ThorswapCurrency[] => {
  // thorswapCurrenciesData.forEach((currency: ThorswapCurrency) => {
  //   if (
  //     currency.name.toLowerCase() === 'usdt20' &&
  //     currency.protocol?.toLowerCase() === 'erc20' &&
  //     currency.contractAddress === '0xdac17f958d2ee523a2206206994597c13d831ec7'
  //   ) {
  //     currency.name = 'usdt';
  //     currency.fullName = 'Tether USD';
  //   } else if (
  //     currency.name.toLowerCase() === 'maticpolygon' &&
  //     currency.protocol?.toLowerCase() === 'matic'
  //   ) {
  //     currency.name = 'matic';
  //   } else if (
  //     currency.name.toLowerCase() === 'usdcmatic' &&
  //     currency.protocol?.toLowerCase() === 'matic'
  //   ) {
  //     currency.name = 'usdc';
  //   }
  // });
  return thorswapCurrenciesData;
};

export const getThorswapFixedCoin = (
  currency: string,
  chain: string,
  tokenAddress?: string,
): string => {
  const _currency = cloneDeep(currency).toUpperCase();
  const _chain = cloneDeep(chain).toUpperCase();
  return `${_chain}.${_currency}${
    tokenAddress && tokenAddress !== '' ? '-' + tokenAddress : ''
  }`;
};

export const getThorswapSpenderDataFromRoute = (
  route: thorswapQuoteRoute,
): {address: string | undefined; key: ThorswapProvider | undefined} => {
  let address;
  let key;
  if (!route) {
    return {address, key};
  }

  if (route.approvalTarget && route.approvalTarget !== '') {
    address = route.approvalTarget;
  } else if (route.contract && route.contract !== '') {
    address = route.contract;
  } else if (route.targetAddress && route.targetAddress !== '') {
    address = route.targetAddress;
  } else {
    address = undefined;
  }

  if (route.providers && route.providers[0]) {
    key = route.providers[0];
  }

  return {address, key};
};

export const getThorswapBestRoute = (quoteRouteData: thorswapQuoteRoute[]) => {
  let bestRoute: thorswapQuoteRoute | undefined;
  if (quoteRouteData) {
    bestRoute = quoteRouteData.find(({optimal}) => optimal);
  }
  return bestRoute;
};

export const getThorswapRouteBySpenderKey = (
  quoteRouteData: thorswapQuoteRoute[],
  spenderKey: ThorswapProvider,
) => {
  if (!spenderKey) {
    return getThorswapBestRoute(quoteRouteData);
  }
  let route: thorswapQuoteRoute | undefined;
  if (quoteRouteData) {
    route = quoteRouteData.find(
      ({providers}) =>
        providers[0] &&
        cloneDeep(providers[0]).toLowerCase() ===
          cloneDeep(spenderKey).toLowerCase(),
    );
  }
  return route;
};

export const getGasLimitFromThorswapTransaction = (
  gas: string | number,
): number | undefined => {
  let gasLimit: number | undefined;
  if (typeof gas === 'number' && gas > 0) {
    gasLimit = gas;
  } else if (typeof gas === 'string') {
    if (gas === '' || gas === '0x0' || gas === '0x00') {
      gasLimit = undefined;
    } else if (/^0[xX][0-9a-fA-F]+$/.test(gas)) {
      // Hexa string
      gasLimit = parseInt(gas, 16) > 0 ? parseInt(gas, 16) : undefined;
    } else {
      // Dec string
      gasLimit = parseInt(gas, 10) > 0 ? parseInt(gas, 10) : undefined;
    }
  } else {
    // unknow
    gasLimit = undefined;
  }
  return gasLimit;
};

export const estimateThorswapTxGasLimit = (
  spenderKey: ThorswapProvider,
  abiFnName: string,
): number | undefined => {
  let gasLimit: number | undefined;
  switch (spenderKey) {
    case 'UNISWAPV2':
      if (abiFnName === 'swapExactTokensForTokens') {
        // Max: 217000
        gasLimit = 400000;
      }
      break;
    case 'UNISWAPV3':
      if (abiFnName === 'multicall') {
        gasLimit = 210000;
      }
      break;
    case 'THORCHAIN':
      if (abiFnName === 'depositWithExpiry') {
        // Max: 75000
        gasLimit = 150000;
      }
      break;
    case 'ZEROX':
      gasLimit = THORSWAP_DEFAULT_GAS_LIMIT;
      break;
    case 'ONEINCH':
      if (abiFnName === 'uniswapV3Swap') {
        gasLimit = 400000;
      }
      break;
    case 'SUSHISWAP':
      if (abiFnName === 'swapExactTokensForTokens') {
        // TODO: review this one
        // Max: 217000
        gasLimit = 400000;
      }
      break;

    default:
      gasLimit = THORSWAP_DEFAULT_GAS_LIMIT;
      break;
  }
  return gasLimit ?? THORSWAP_DEFAULT_GAS_LIMIT;
};

export const getExchangeAbiByContractAddress = (
  contractAddress: string,
): any[] | undefined => {
  if (!contractAddress || contractAddress === '') {
    return undefined;
  }

  switch (cloneDeep(contractAddress).toLowerCase()) {
    case '0x1111111254fb6c44bac0bed2854e76f90643097d':
      return ONE_INCH_ABI;
    case '0x7a250d5630b4cf539739df2c5dacb4c659f2488d':
      return UNISWAP_V2_ABI;
    case '0xe592427a0aece92de3edee1f18e0157c05861564':
      return UNISWAP_V3_ABI;
    case '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f':
      return SUSHISWAP_ABI;
    case '0xd37bbe5744d730a1d98d8dc97c42f0ca46ad7146':
      return THORCHAIN_ABI;
    default:
      return undefined;
  }
};

export interface Status {
  statusTitle?: string;
  statusDescription?: string;
}

export const thorswapGetStatusDetails = (status: string): Status => {
  // TODO: review this
  let statusDescription, statusTitle;
  switch (status) {
    case 'new':
      statusTitle = t('New');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'waiting':
      statusTitle = t('Waiting');
      statusDescription = t('Transaction is waiting for an incoming payment.');
      break;
    case 'confirming':
      statusTitle = t('Confirming');
      statusDescription = t(
        'THORSwap has received payin and is waiting for certain amount of confirmations depending of incoming currency.',
      );
      break;
    case 'exchanging':
      statusTitle = t('Exchanging');
      statusDescription = t('Payment was confirmed and is being exchanged.');
      break;
    case 'sending':
      statusTitle = t('Sending');
      statusDescription = t('Coins are being sent to the recipient address.');
      break;
    case 'finished':
      statusTitle = t('Finished');
      statusDescription = t(
        'Coins were successfully sent to the recipient address.',
      );
      break;
    case 'failed':
      statusTitle = t('Failed');
      statusDescription = t(
        'Transaction has failed. In most cases, the amount was less than the minimum.',
      );
      break;
    case 'refunded':
      statusTitle = t('Failed');
      statusDescription = t(
        "Exchange failed and coins were refunded to user's wallet.",
      );
      break;
    case 'hold':
      statusTitle = t('Hold');
      statusDescription = t(
        'Due to AML/KYC procedure, exchange may be delayed.',
      );
      break;
    case 'expired':
      statusTitle = t('Expired');
      statusDescription = t(
        'Payin was not sent within the indicated timeframe.',
      );
      break;
    default:
      statusTitle = undefined;
      statusDescription = undefined;
      break;
  }
  return {
    statusTitle,
    statusDescription,
  };
};

export const thorswapGetStatusColor = (status: string): string => {
  // TODO: review this
  switch (status) {
    case 'finished':
    case 'refunded':
      return '#01d1a2';
    case 'failed':
    case 'expired':
      return '#df5264';
    case 'waiting':
    case 'confirming':
    case 'exchanging':
    case 'sending':
    case 'hold':
      return '#fdb455';
    default:
      return '#666677';
  }
};
