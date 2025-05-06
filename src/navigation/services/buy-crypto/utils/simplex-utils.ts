import UserAgent from 'react-native-user-agent';
import {APP_NAME, APP_VERSION} from '../../../../constants/config';
import {getCurrencyAbbreviation} from '../../../../utils/helper-methods';
import {externalServicesCoinMapping} from '../../utils/external-services-utils';

const PASSTHROUGH_URI_DEV = 'https://cmgustavo.github.io/website/simplex/';
const PASSTHROUGH_URI_PROD = 'https://bws.bitpay.com/static/simplex/';

export const simplexEnv = __DEV__ ? 'sandbox' : 'production';

const appName = APP_NAME;

export const simplexSupportedFiatCurrencies = [
  'AED',
  'ARS',
  'AUD',
  'AZN',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CRC',
  'CZK',
  'DKK',
  'DOP',
  'EUR',
  'GBP',
  'GEL',
  'HKD',
  'HUF',
  'ILS',
  'INR',
  'JPY',
  'KRW',
  'KZT',
  'MAD',
  'MDL',
  'MXN',
  'MYR',
  'NAD',
  'NGN',
  'NOK',
  'NZD',
  'PEN',
  'PHP',
  'PLN',
  'QAR',
  'RON',
  'RUB',
  'SEK',
  'SGD',
  'TRY',
  'TWD',
  'UAH',
  'USD',
  'UYU',
  'UZS',
  'VND',
  'ZAR',
];
export const simplexSupportedCoins = [
  'btc',
  'bch',
  'eth',
  'eth_arb', // ETH-ARBITRUM
  'eth_base', // ETH-BASE
  'eth_op', // ETH-OPTIMISM
  'doge',
  'ltc',
  'matic', // POL // backward compatibility
  'pol',
  'sol',
  'xrp',
];

export const simplexSupportedErc20Tokens = [
  '1earth',
  '1inch',
  'aag', // AAG-ERC20
  'aave',
  'aevo',
  'agix',
  'ape',
  'arkm',
  'axs', // AXS-ERC20
  'bat',
  'busd',
  'bmx',
  'cel',
  'chz',
  'comp',
  'coti', // COTI-ERC20
  'cro', // CRO-ERC20
  'dai',
  'dep',
  'dft',
  'elon',
  'ena',
  'ens',
  'enj',
  'eqx',
  'euroc',
  'ftt',
  'ftn',
  'gala',
  'ghx',
  'gmt', // GMT-ERC20
  'govi',
  'grt',
  'hedg',
  'hex',
  'hgold',
  'ht',
  'husd',
  'hzm',
  'kcs',
  'ldo',
  'link',
  'ltx',
  'mana',
  'matic', // POL-ERC20 // backward compatibility
  'meme',
  'mkr',
  'pax', // backward compatibility
  'paxg',
  'pepe',
  'pkr',
  'pla', // PLA-ERC20
  'pol', // POL-ERC20 // former matic
  'prt',
  'pyusd',
  'qnt',
  'revv',
  'rfox',
  'rfuel',
  'rndr',
  'rpl',
  'sand',
  'satt', // SATT-ERC20
  'shib',
  'skl',
  'sushi',
  'tlos', // TLOS-ERC20
  'tru',
  'tusd',
  'uni',
  'uos', // UOS-ERC20
  'usdc',
  'usdp',
  'usdt',
  'verse', // VERSE-ERC20
  'wbtc',
  'wld',
  'xyo',
  'yoshi', // YOSHI-ERC20
];

export const simplexSupportedMaticTokens = [
  'eth', // WETH-POL
  'gmee',
  'pla', // PLA-POL
  'usdc', // USDC-POL
  'usdt', // USDT-POL
  'weth', // WETH-POL
];

export const simplexSupportedArbitrumTokens = [
  'arb',
  'gmx',
  'usdt', // USDT-ARBITRUM
];

export const simplexSupportedBaseTokens = [
  'usdc', // USDT-BASE
];

export const simplexSupportedOptimismTokens = [
  'op',
  'usdt', // USDT-OPTIMISM
];

export const simplexSupportedSolanaTokens = [
  'bonk',
  'bome',
  'drift',
  'jup',
  'kin',
  'melania',
  'mew',
  'mog',
  'pnut',
  'popcat',
  'trump',
  'usdc', // USDC-SOL
  'usdt', // USDT-SOL
  'wif',
];

export const simplexErc20TokensWithSuffix = [
  'aag', // AAG-ERC20
  'axs', // AXS-ERC20
  'coti', // COTI-ERC20
  'cro', // CRO-ERC20
  'gmt', // GMT-ERC20
  'matic', // POL-ERC20 // backward compatibility
  'pla', // PLA-ERC20
  'pol', // POL-ERC20
  'satt', // SATT-ERC20
  'tlos', // TLOS-ERC20
  'uos', // UOS-ERC20
  'verse', // VERSE-ERC20
  'yoshi', // YOSHI-ERC20
];

export const simplexMaticTokensWithSuffix = [
  'eth', // WETH-POL
  'pla', // PLA-POL
  'usdc', // USDC-POL
  'usdt', // USDT-POL
  'weth', // WETH-POL
];

export const simplexArbitrumTokensWithSuffix = [
  'eth', // ETH-ARBITRUM
  'usdt', // USDT-ARBITRUM
];

export const simplexBaseTokensWithSuffix = [
  'eth', // ETH-BASE
  'usdc', // USDT-BASE
];

export const simplexOptimismTokensWithSuffix = [
  'eth', // ETH-OPTIMISM
  'usdt', // USDT-OPTIMISM
];

export const simplexSolanaTokensWithSuffix = [
  'usdc', // USDC-SOL
  'usdt', // USDT-SOL
];

export const getSimplexSupportedCurrencies = (): string[] => {
  const simplexSupportedCurrencies = [
    ...simplexSupportedCoins,
    ...simplexSupportedErc20Tokens.flatMap(ethToken =>
      getCurrencyAbbreviation(ethToken, 'eth'),
    ),
    ...simplexSupportedMaticTokens.flatMap(maticToken =>
      getCurrencyAbbreviation(maticToken, 'matic'),
    ),
    ...simplexSupportedArbitrumTokens.flatMap(arbitrumToken =>
      getCurrencyAbbreviation(arbitrumToken, 'arb'),
    ),
    ...simplexSupportedBaseTokens.flatMap(baseToken =>
      getCurrencyAbbreviation(baseToken, 'base'),
    ),
    ...simplexSupportedOptimismTokens.flatMap(optimismToken =>
      getCurrencyAbbreviation(optimismToken, 'op'),
    ),
    ...simplexSupportedSolanaTokens.flatMap(solanaToken =>
      getCurrencyAbbreviation(solanaToken, 'sol'),
    ),
  ];

  return simplexSupportedCurrencies;
};

export const getSimplexCoinFormat = (coin: string, chain: string): string => {
  coin = externalServicesCoinMapping(coin);
  let formattedCoin: string = coin.toUpperCase();
  switch (chain) {
    case 'eth':
      if (simplexErc20TokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-ERC20`;
      }
      break;
    case 'matic':
      if (simplexMaticTokensWithSuffix.includes(coin.toLowerCase())) {
        switch (coin.toLowerCase()) {
          case 'eth':
            formattedCoin = 'WETH-POL';
            break;
          default:
            formattedCoin = `${coin.toUpperCase()}-POL`;
            break;
        }
      }
      break;
    case 'arb':
      if (simplexArbitrumTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-ARBITRUM`;
      }
      break;
    case 'base':
      if (simplexBaseTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-BASE`;
      }
      break;
    case 'op':
      if (simplexOptimismTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-OPTIMISM`;
      }
      break;
    case 'sol':
      if (simplexSolanaTokensWithSuffix.includes(coin.toLowerCase())) {
        formattedCoin = `${coin.toUpperCase()}-SOL`;
      }
      break;
    default:
      formattedCoin = coin.toUpperCase();
  }
  return formattedCoin;
};

export const getSimplexFiatAmountLimits = () => {
  return {
    min: 50,
    max: 20000,
  };
};

export const getCheckoutUrl = (): string => {
  return __DEV__
    ? 'https://sandbox.test-simplexcc.com'
    : 'https://checkout.simplexcc.com';
};

export const getPassthroughUri = (): string => {
  return __DEV__ ? PASSTHROUGH_URI_DEV : PASSTHROUGH_URI_PROD;
};

const paymentRequest = (wallet: any, data: any): Promise<any> => {
  data.env = simplexEnv;
  return wallet.simplexPaymentRequest(data);
};

const getUserAgent = (): string => {
  // Example: 'application-name/1.6.4.176 CFNetwork/897.15 Darwin/17.5.0 (iPhone/6s iOS/11.3)';
  return UserAgent.getUserAgent(); //synchronous
};

const getAppVersion = (): string => {
  return APP_VERSION;
};

const checkSimplexCoin = (coin: string): string => {
  if (coin === 'PAX') {
    return 'USDP';
  }
  return coin;
};

export const simplexPaymentRequest = (
  wallet: any,
  address: string,
  quoteData: any,
  createdOn: number,
): Promise<any> => {
  const installDate = createdOn
    ? new Date(createdOn).toISOString()
    : new Date().toISOString();

  const userAgent = getUserAgent();
  const data = {
    account_details: {
      app_version_id: getAppVersion(),
      app_install_date: installDate,
      app_end_user_id: wallet.id,
      signup_login: {
        user_agent: userAgent, // Format: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0'
        timestamp: new Date().toISOString(),
      },
    },
    transaction_details: {
      payment_details: {
        quote_id: quoteData.quoteId,
        fiat_total_amount: {
          currency: quoteData.currency,
          amount: quoteData.fiatTotalAmount,
        },
        requested_digital_amount: {
          currency: checkSimplexCoin(
            getSimplexCoinFormat(wallet.currencyAbbreviation, wallet.chain),
          ),
          amount: quoteData.cryptoAmount,
        },
        destination_wallet: {
          currency: checkSimplexCoin(
            getSimplexCoinFormat(wallet.currencyAbbreviation, wallet.chain),
          ),
          address,
          tag: '',
        },
        original_http_ref_url: 'https://' + getPassthroughUri(),
      },
    },
  };

  return paymentRequest(wallet, data);
};

export const getPaymentUrl = (
  wallet: any,
  quoteData: any,
  remoteData: any,
  chain: string,
): string => {
  const dataSrc: any = {
    version: '1',
    partner: remoteData.app_provider_id,
    payment_flow_type: 'wallet',
    return_url_success:
      getPassthroughUri() +
      'end.html?success=true&paymentId=' +
      remoteData.payment_id +
      '&quoteId=' +
      quoteData.quoteId +
      '&userId=' +
      wallet.id +
      '&returnApp=' +
      appName,
    return_url_fail:
      getPassthroughUri() +
      'end.html?success=false&paymentId=' +
      remoteData.payment_id +
      '&quoteId=' +
      quoteData.quoteId +
      '&userId=' +
      wallet.id +
      '&returnApp=' +
      appName,
    quote_id: quoteData.quoteId,
    payment_id: remoteData.payment_id,
    user_id: wallet.id,
    'destination_wallet[address]': remoteData.address,
    'destination_wallet[currency]': chain,
    'fiat_total_amount[amount]': quoteData.fiatTotalAmount,
    'fiat_total_amount[currency]': quoteData.currency,
    'digital_total_amount[amount]': quoteData.cryptoAmount,
    'digital_total_amount[currency]': chain,
  };

  let str = '';
  for (let key in dataSrc) {
    if (str !== '') {
      str += '&';
    }
    str += key + '=' + encodeURIComponent(dataSrc[key]);
  }

  const api_host = getCheckoutUrl();

  const url =
    getPassthroughUri() + '?api_host=' + api_host + '/payments/new/&' + str;

  return url;
};
