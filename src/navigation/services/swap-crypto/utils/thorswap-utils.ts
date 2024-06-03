import {t} from 'i18next';
import cloneDeep from 'lodash.clonedeep';
import {
  ThorswapCurrency,
  ThorswapGetSwapQuoteData,
  ThorswapProvider,
  ThorswapQuoteRoute,
  ThorswapRouteTimeEstimates,
  ThorswapTrackingStatus,
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

export const thorswapSupportedCoins = ['btc', 'bch', 'eth', 'doge', 'ltc'];

export const thorswapSupportedEthErc20Tokens = [
  '1inch',
  'aave',
  'adx',
  'aioz',
  'akro',
  'alcx',
  'aleph',
  'aleth',
  'alpa',
  'alpha',
  'alusd',
  'ampl',
  'amp',
  'ankreth',
  'ankr',
  'ant',
  'api3',
  'apw',
  'arb',
  'arch',
  'arcx',
  'armor',
  'arnxm',
  'auction',
  'audio',
  'axs',
  'bac',
  'badger',
  'bal',
  'band',
  'bank',
  'bao',
  'base',
  'bask',
  'bat',
  'bfc',
  'bifi',
  'bit',
  'blocks',
  'blur',
  'bmi',
  'bnt',
  'bob',
  'bond',
  'btrfly',
  'busd',
  'caps',
  'cbeth',
  'cel',
  'cgg',
  'comp',
  'combo',
  'cow',
  'cqt',
  'cream',
  'cro',
  'crv',
  'ctx',
  'cvp',
  'cvx',
  'cvxcrv',
  'dai',
  'dao',
  'ddx',
  'deri',
  'dextf',
  'dfx',
  'dg',
  'dia',
  'digg',
  'diver',
  'dnt',
  'dola',
  'dough',
  'dpi',
  'duck',
  'dusd',
  'dvf',
  'dydx',
  'eden',
  'enj',
  'ens',
  'esd',
  'ethx',
  'farm',
  'fcl',
  'fei',
  'flex',
  'floki',
  'fnc',
  'fodl',
  'fold',
  'font',
  'frax',
  'front',
  'ftm',
  'fuse',
  'fxs',
  'gala',
  'get',
  'glm',
  'gmee',
  'gno',
  'gog',
  'grt',
  'hbtc',
  'hegic',
  'hex',
  'hez',
  'hop',
  'hopr',
  'ice',
  'ichi',
  'id',
  'idle',
  'ilv',
  'imx',
  'index',
  'inj',
  'insur',
  'inv',
  'iq',
  'jpeg',
  'jrt',
  'knc',
  'kp3r',
  'ldo',
  'lend',
  'lina',
  'link',
  'lon',
  'lrc',
  'lusd',
  'lyra',
  'mana',
  'mars',
  'masq',
  'matic',
  'meme',
  'mic',
  'mim',
  'mis',
  'mist',
  'mkr',
  'mln',
  'moda',
  'mph',
  'mta',
  'multi',
  'ncr',
  'nct',
  'ndx',
  'near',
  'newo',
  'nexo',
  'nfp',
  'nftx',
  'npm',
  'nu',
  'num',
  'ocean',
  'oeth',
  'ogn',
  'ohm',
  'omg',
  'omni',
  'onx',
  'opium',
  'orn',
  'ousd',
  'pad',
  'pendle',
  'pepe',
  'perp',
  'pickle',
  'pixel',
  'pipt',
  'pmon',
  'pnk',
  'poly',
  'pond',
  'pool',
  'premia',
  'pre',
  'pros',
  'psp',
  'punk',
  'quad',
  'quartz',
  'radar',
  'rai',
  'rail',
  'rare',
  'rari',
  'ren',
  'repv2',
  'revv',
  'rgt',
  'rlc',
  'rook',
  'route',
  'rpl',
  'rune',
  'safe',
  'sdao',
  'sdt',
  'sfi',
  'si',
  'snx',
  'sos',
  'spell',
  'srm',
  'stake',
  'stg',
  'stmx',
  'strk',
  'sushi',
  'swag',
  'swap',
  'sxp',
  'syn',
  'tcap',
  'thor',
  'tlos',
  'toke',
  'tower',
  'tribe',
  'tru',
  'tusd',
  'ubt',
  'uma',
  'umb',
  'uni',
  'usdc',
  'usdn',
  'usdp',
  'usdt',
  'ust',
  'uwu',
  'vega',
  'verse',
  'vsp',
  'vusd',
  'wbtc',
  'weth',
  'wncg',
  'woo',
  'wxrp',
  'xai',
  'xcad',
  'xdefi',
  'xft',
  'xor',
  'xyo',
  'xyz',
  'yam',
  'yel',
  'yfi',
  'yfii',
  'ygg',
  'zero',
  'zrx',
];

export const isCoinSupportedByThorswap = (
  coin: string,
  chain: string,
): boolean => {
  if (chain === undefined) {
    return [...thorswapSupportedCoins].includes(coin.toLowerCase());
  }
  if (coin.toLowerCase() === chain.toLowerCase()) {
    return thorswapSupportedCoins.includes(coin.toLowerCase());
  }
  switch (chain) {
    case 'eth':
      return thorswapSupportedEthErc20Tokens.includes(coin.toLowerCase());
    default:
      return thorswapSupportedCoins.includes(coin.toLowerCase());
  }
};

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
  route: ThorswapQuoteRoute,
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

export const getThorswapBestRoute = (quoteRouteData: ThorswapQuoteRoute[]) => {
  let bestRoute: ThorswapQuoteRoute | undefined;
  if (quoteRouteData) {
    bestRoute = quoteRouteData.find(({optimal}) => optimal);
  }
  return bestRoute;
};

export const getThorswapRouteBySpenderKey = (
  quoteRouteData: ThorswapQuoteRoute[],
  spenderKey: ThorswapProvider,
) => {
  if (!spenderKey) {
    return getThorswapBestRoute(quoteRouteData);
  }
  let route: ThorswapQuoteRoute | undefined;
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

export const getEstimatedTimeStrFromRoute = (
  routeTime: ThorswapRouteTimeEstimates,
) => {
  let totalTime: number = 0;
  if (routeTime.inboundMs) {
    totalTime += routeTime.inboundMs;
  }
  if (routeTime.outboundMs) {
    totalTime += routeTime.outboundMs;
  }
  if (routeTime.streamingMs) {
    totalTime += routeTime.streamingMs;
  }
  if (routeTime.swapMs) {
    totalTime += routeTime.swapMs;
  }

  const date = new Date(totalTime);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  return `${hours}h ${minutes}m ${seconds}s`;
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

export const thorswapGetStatusDetails = (
  status: ThorswapTrackingStatus,
): Status => {
  let statusDescription, statusTitle;
  switch (status) {
    case ThorswapTrackingStatus.bitpayTxSent:
      statusTitle = t('Swap order started');
      statusDescription = t(
        'Transaction sent from bitpay wallet. The swap process may take a few minutes, please wait.',
      );
      break;
    case ThorswapTrackingStatus.broadcasted:
      statusTitle = t('Broadcasted');
      statusDescription = t(
        'The transaction has been broadcast from to the network by the provider.',
      );
      break;
    case ThorswapTrackingStatus.completed:
    case ThorswapTrackingStatus.success:
      statusTitle = t('Completed');
      statusDescription = t(
        'The transaction has been successfully completed and confirmed.',
      );
      break;
    case ThorswapTrackingStatus.dropped:
      statusTitle = t('Dropped');
      statusDescription = t(
        'The transaction has been dropped and will not proceed.',
      );
      break;
    case ThorswapTrackingStatus.inbound:
      statusTitle = t('Processing transaction');
      statusDescription = t('The incoming transaction has been recognized.');
      break;
    case ThorswapTrackingStatus.mempool:
      statusTitle = t('Processing transaction');
      statusDescription = t(
        'The transaction is in the mempool or is being indexed.',
      );
      break;
    case ThorswapTrackingStatus.not_started:
      statusTitle = t('Processing transaction');
      statusDescription = t('The transaction process has not yet begun.');
      break;
    case ThorswapTrackingStatus.outbound:
      statusTitle = t('Processing transaction');
      statusDescription = t('The outgoing transaction has been initiated.');
      break;
    case ThorswapTrackingStatus.parsing_error:
      statusTitle = t('Failed');
      statusDescription = t('There was an error parsing the transaction data.');
      break;
    case ThorswapTrackingStatus.partially_refunded:
      statusTitle = t('Partially refunded');
      statusDescription = t(
        'Part of the transaction amount has been refunded.',
      );
      break;
    case ThorswapTrackingStatus.refunded:
      statusTitle = t('Refunded');
      statusDescription = t('The transaction amount has been refunded.');
      break;
    case ThorswapTrackingStatus.replaced:
      statusTitle = t('Replaced');
      statusDescription = t(
        'The transaction has been replaced by another transaction.',
      );
      break;
    case ThorswapTrackingStatus.retries_exceeded:
      statusTitle = t('Failed');
      statusDescription = t(
        'The transaction has failed and the number of retries has been exceeded.',
      );
      break;
    case ThorswapTrackingStatus.reverted:
      statusTitle = t('Reverted');
      statusDescription = t('The transaction has been reverted.');
      break;
    case ThorswapTrackingStatus.starting:
      statusTitle = t('Starting');
      statusDescription = t(
        'The transaction has been received and swapping process is about to begin.',
      );
      break;
    case ThorswapTrackingStatus.swapping:
      statusTitle = t('Swapping');
      statusDescription = t(
        'The transaction is currently in the swapping process. This may take a few minutes.',
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

export const thorswapGetStatusColor = (
  status: ThorswapTrackingStatus,
): string => {
  switch (status) {
    case ThorswapTrackingStatus.completed:
    case ThorswapTrackingStatus.success:
      return '#01d1a2';
    case ThorswapTrackingStatus.parsing_error:
    case ThorswapTrackingStatus.retries_exceeded:
      return '#df5264';
    case ThorswapTrackingStatus.partially_refunded:
    case ThorswapTrackingStatus.refunded:
    case ThorswapTrackingStatus.reverted:
    case ThorswapTrackingStatus.replaced:
    case ThorswapTrackingStatus.dropped:
      return '#fdb455';
    default:
      return '#666677';
  }
};
