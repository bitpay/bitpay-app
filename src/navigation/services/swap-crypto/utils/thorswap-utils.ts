import {t} from 'i18next';
import {capitalize, cloneDeep} from 'lodash';
import {
  ThorswapProvider,
  ThorswapProviderNames,
  ThorswapQuoteRoute,
  ThorswapRouteTimeEstimates,
  ThorswapTrackingStatus,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';
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
  'acx',
  'adx',
  'aergo',
  'ageur',
  'agld',
  'aioz',
  'akro',
  'alcx',
  'aleph',
  'aleth',
  'alpa',
  'alpha',
  'alusd',
  'amaticc',
  'amp',
  'ampl',
  'angle',
  'ankr',
  'ankreth',
  'ant',
  'any',
  'ape',
  'api3',
  'apw',
  'arb',
  'arch',
  'arcx',
  'armor',
  'arnxm',
  'assy',
  'astrafer',
  'attr',
  'auction',
  'audio',
  'axl',
  'axltia',
  'axs',
  'bab',
  'bac',
  'bacon',
  'badger',
  'bal',
  'banana',
  'band',
  'bank',
  'bao',
  'base',
  'bask',
  'bat',
  'bbadger',
  'bcp',
  'bdi',
  'bdigg',
  'bent',
  'bfc',
  'bgld',
  'bico',
  'bifi',
  'bios',
  'bit',
  'block',
  'blocks',
  'blur',
  'bmi',
  'bnpl',
  'bnt',
  'bob',
  'bond',
  'bonk',
  'bor',
  'bpt',
  'bsgg',
  'btc2x-fli',
  'btm',
  'btrfly',
  'busd',
  'bzrx',
  'c98',
  'cake',
  'canto',
  'caps',
  'cbeth',
  'cel',
  'celo',
  'cgg',
  'cheese',
  'cig',
  'clny',
  'cmk',
  'cndl',
  'combo',
  'comp',
  'cool',
  'cover',
  'cow',
  'cqt',
  'crd',
  'cre8',
  'cream',
  'creth2',
  'cro',
  'crpx',
  'crv',
  'ctx',
  'cvp',
  'cvx',
  'cvxcrv',
  'cyber',
  'dai',
  'dam',
  'dao',
  'daox',
  'ddx',
  'defi+l',
  'degen',
  'delta',
  'deri',
  'dextf',
  'dfd',
  'dfx',
  'dg',
  'dia',
  'digg',
  'diver',
  'divine',
  'dnt',
  'dog',
  'dola',
  'dough',
  'dpi',
  'drc',
  'dsd',
  'dseth',
  'duck',
  'dusd',
  'dvf',
  'dydx',
  'eden',
  'egt',
  'emt',
  'enj',
  'ens',
  'entr',
  'esd',
  'eth',
  'ethc',
  'ethx',
  'euroe',
  'farm',
  'fcl',
  'fei',
  'ffrax',
  'flex',
  'float',
  'floki',
  'flux',
  'fnc',
  'fnx',
  'fodl',
  'fold',
  'font',
  'fox',
  'frax',
  'front',
  'frxeth',
  'ftm',
  'ftt',
  'fusdc',
  'fusdt',
  'fuse',
  'fxs',
  'fyz',
  'g$',
  'gala',
  'gang',
  'gas',
  'gene',
  'get',
  'gfarm2',
  'glm',
  'gm',
  'gmee',
  'gmi',
  'gno',
  'gods',
  'gog',
  'grt',
  'gtceth',
  'gton',
  'hbtc',
  'hegic',
  'hex',
  'hez',
  'hnd',
  'hop',
  'hopr',
  'hpo',
  'husd',
  'ibbtc',
  'ibethv2',
  'iby',
  'ice',
  'ichi',
  'id',
  'idle',
  'ilsi',
  'ilv',
  'imx',
  'index',
  'inj',
  'insp',
  'insur',
  'inv',
  'iost',
  'iq',
  'itp',
  'jchf',
  'jelly',
  'jeur',
  'jim',
  'jpeg',
  'jpyc',
  'jrt',
  'kae',
  'kira',
  'kko',
  'knc',
  'kp3r',
  'ldn',
  'ldo',
  'leag',
  'lend',
  'lev',
  'levx',
  'lina',
  'link',
  'lobi',
  'lon',
  'lrc',
  'lsd',
  'lusd',
  'lyra',
  'mai',
  'maid',
  'mamzn',
  'mana',
  'mars',
  'mars4',
  'mask',
  'masq',
  'matic', // backward compatibility
  'mbbased',
  'mbtc',
  'media',
  'meme',
  'memecoin',
  'meow',
  'metacat',
  'mfb',
  'mgoogl',
  'mic',
  'mim',
  'mis',
  'mist',
  'mkr',
  'mln',
  'mm',
  'mm/million',
  'mmsft',
  'moda',
  'mph',
  'mqqq',
  'mslv',
  'mta',
  'mtsla',
  'multi',
  'mush',
  'muso',
  'must',
  'mvixy',
  'naos',
  'ncr',
  'nct',
  'ndx',
  'near',
  'newo',
  'news',
  'nexo',
  'nfd',
  'nfp',
  'nfte',
  'nftl',
  'nftx',
  'nil',
  'npm',
  'nsbt',
  'nst',
  'nu',
  'num',
  'ocean',
  'oeth',
  'ogn',
  'oh-geez',
  'ohm',
  'ohmv1',
  'omg',
  'omni',
  'one',
  'onebtc',
  'onewing',
  'onx',
  'ooki',
  'opium',
  'ords',
  'orn',
  'osak',
  'ousd',
  'pad',
  'pax', // backward compatibility
  'peco',
  'pendle',
  'pepe',
  'perc',
  'perp',
  'phtr',
  'pickle',
  'pipt',
  'pixel',
  'play',
  'pmon',
  'pnk',
  'pol',
  'poly',
  'pond',
  'pont',
  'pool',
  'pre',
  'premia',
  'primate',
  'pros',
  'psp',
  'pundix',
  'punk',
  'pwing',
  'pxeth',
  'pyusd',
  'quad',
  'quartz',
  'radar',
  'rai',
  'rail',
  'rare',
  'rari',
  'ray',
  'remio',
  'ren',
  'renbch',
  'renbtc',
  'rendgb',
  'rendoge',
  'renluna',
  'rep',
  'repv2',
  'reth',
  'revv',
  'rfd',
  'rgt',
  'rlc',
  'roci',
  'rook',
  'route',
  'rpl',
  'ruler',
  'rune',
  'safe',
  'sak3',
  'scex',
  'sdao',
  'sdefi',
  'sdl',
  'sdt',
  'seen',
  'sfi',
  'shping',
  'shx',
  'si',
  'silv2',
  'skyrim',
  'snx',
  'sos',
  'source',
  'spank',
  'spell',
  'sps',
  'sqgl',
  'squid',
  'srm',
  'stake',
  'standard',
  'star',
  'stg',
  'stkatom',
  'stkxprt',
  'stmx',
  'stnd',
  'strk',
  'strp',
  'stz',
  'stzen',
  'sudo',
  'sunder',
  'susd',
  'sush',
  'sushi',
  'swag',
  'swap',
  'sweth',
  'sx',
  'sxp',
  'sxrp',
  'syn',
  'tbtc',
  'tbtcv1',
  'tcap',
  'tcr',
  'temple',
  'tgbp',
  'tgt',
  'thor',
  'tlos',
  'toke',
  'tomo',
  'torn',
  'tower',
  'trdl',
  'tribe',
  'tru',
  'trx',
  'try',
  'tusd',
  'two',
  'txl',
  'ubt',
  'ubxt',
  'uma',
  'umb',
  'uni',
  'unibot',
  'unieth',
  'unsheth',
  'uop',
  'uos',
  'usdc',
  'usdn',
  'usdp',
  'usdt',
  'ush',
  'ust',
  'usv',
  'uwu',
  'vbtc',
  'vega',
  'verse',
  'vite',
  'vol',
  'vrn',
  'vsp',
  'vusd',
  'wasabi',
  'waves',
  'wbeth',
  'wbtc',
  'wcelo',
  'wcusd',
  'weth',
  'wever',
  'wfil',
  'wkda',
  'wld',
  'wmatic',
  'wncg',
  'wnxm',
  'woeth',
  'wom',
  'woo',
  'woofy',
  'wow',
  'wscrt',
  'wsteth',
  'wxmr',
  'wxrp',
  'wzec',
  'x',
  'xai',
  'xbe',
  'xcad',
  'xcrmrk',
  'xdefi',
  'xft',
  'xor',
  'xrune',
  'xsushi',
  'xyo',
  'xyz',
  'yam',
  'yel',
  'yeti',
  'yfi',
  'yfii',
  'ygg',
  'yla',
  'yld',
  'yop',
  'ypie',
  'yusd',
  'yvboost',
  'yvecrv-dao',
  'zero',
  'zlot',
  'zrx',
];

export const isCoinSupportedByThorswap = (
  coin: string,
  chain: string,
): boolean => {
  if (!chain) {
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

export const getProvidersPathFromRoute = (
  route: ThorswapQuoteRoute,
): string | undefined => {
  let path: string | undefined;

  if (typeof route.providers === 'string') {
    path = ThorswapProviderNames[route.providers[0]] || 'Unknown';
  } else if (Array.isArray(route.providers)) {
    route.providers.forEach((p, index) => {
      const provider = ThorswapProviderNames[p] || 'Unknown';
      if (index === 0) {
        path = provider;
      } else {
        path = path + ' > ' + provider;
      }
    });
  } else {
    path = 'Unknown';
  }

  return path;
};

export const getNameFromThorswapFullName = (
  thorswapFullName: string,
): string | undefined => {
  let name: string | undefined;
  if (typeof thorswapFullName === 'string' && thorswapFullName.length >= 42) {
    const firstDotIndex = thorswapFullName.indexOf('.');
    const lastDashIndex = thorswapFullName.lastIndexOf('-');
    if (firstDotIndex > 0 && lastDashIndex > 0) {
      name = thorswapFullName.slice(firstDotIndex + 1, lastDashIndex);
      name = capitalize(name);
    }
  }

  return name;
};

export const getThorswapFixedCoin = (
  currency: string,
  chain: string,
  tokenAddress?: string,
): string => {
  currency = externalServicesCoinMapping(currency);
  chain = externalServicesCoinMapping(chain);
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
    // unknown
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
        gasLimit = 250000;
      }
      break;
    case 'THORCHAIN':
      if (abiFnName === 'depositWithExpiry') {
        // Max: 75000
        gasLimit = 250000;
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
    case ThorswapTrackingStatus.pending:
      statusTitle = t('Pending transaction');
      statusDescription = t(
        'The transaction process has been initiated. Pending confirmation to start the swap.',
      );
      break;
    case ThorswapTrackingStatus.outbound:
      statusTitle = t('Processing transaction');
      statusDescription = t('The outgoing transaction has been initiated.');
      break;
    case ThorswapTrackingStatus.parsing_error:
      statusTitle = t('Failed');
      statusDescription = t('There was an error parsing the transaction data.');
      break;
    case ThorswapTrackingStatus.error:
      statusTitle = t('Error');
      statusDescription = t(
        'There was an error processing the transaction or executing the contract, or the previously set slippage was exceeded.',
      );
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
    case ThorswapTrackingStatus.error:
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
