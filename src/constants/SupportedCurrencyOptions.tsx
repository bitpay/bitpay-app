import React, {ReactElement} from 'react';
import BtcIcon from '../../assets/img/currencies/btc.svg';
import BchIcon from '../../assets/img/currencies/bch.svg';
import EthIcon from '../../assets/img/currencies/eth.svg';
import DogeIcon from '../../assets/img/currencies/doge.svg';
import LtcIcon from '../../assets/img/currencies/ltc.svg';
import XrpIcon from '../../assets/img/currencies/xrp.svg';
import UsdcIcon from '../../assets/img/currencies/usdc.svg';
import GusdIcon from '../../assets/img/currencies/gusd.svg';
import BusdIcon from '../../assets/img/currencies/busd.svg';
import DaiIcon from '../../assets/img/currencies/dai.svg';
import UsdpIcon from '../../assets/img/currencies/usdp.svg';
import WbtcIcon from '../../assets/img/currencies/wbtc.svg';
import ShibIcon from '../../assets/img/currencies/shib.svg';
import ApeIcon from '../../assets/img/currencies/ape.svg';
import EurocIcon from '../../assets/img/currencies/euroc.svg';
import MaticIcon from '../../assets/img/currencies/matic.svg';
import PyusdIcon from '../../assets/img/currencies/pyusd.svg';
import {ImageSourcePropType} from 'react-native';
import {orderBy} from 'lodash';

export interface SupportedCurrencyOption {
  id: string;
  img: string | ((props?: any) => ReactElement);
  currencyName: string;
  hasMultisig?: boolean;
  currencyAbbreviation: string;
  chain?: string;
  isToken?: boolean;
  imgSrc?: ImageSourcePropType;
  badgeUri?: string | ((props?: any) => ReactElement);
  badgeSrc?: ImageSourcePropType;
  priority?: number;
}

export const CurrencyListIcons: {
  [key in string]: (props: any) => ReactElement;
} = {
  btc: props => <BtcIcon {...props} />,
  bch: props => <BchIcon {...props} />,
  eth: props => <EthIcon {...props} />,
  matic: props => <MaticIcon {...props} />,
  doge: props => <DogeIcon {...props} />,
  ltc: props => <LtcIcon {...props} />,
  xrp: props => <XrpIcon {...props} />,
  usdc_e: props => <UsdcIcon {...props} />,
  gusd_e: props => <GusdIcon {...props} />,
  busd_e: props => <BusdIcon {...props} />,
  dai_e: props => <DaiIcon {...props} />,
  usdp_e: props => <UsdpIcon {...props} />,
  wbtc_e: props => <WbtcIcon {...props} />,
  shib_e: props => <ShibIcon {...props} />,
  ape_e: props => <ApeIcon {...props} />,
  euroc_e: props => <EurocIcon {...props} />,
  matic_e: props => <MaticIcon {...props} />,
  pyusd_e: props => <PyusdIcon {...props} />,
  usdc_m: props => <UsdcIcon {...props} />,
  busd_m: props => <BusdIcon {...props} />,
  dai_m: props => <DaiIcon {...props} />,
  wbtc_m: props => <WbtcIcon {...props} />,
  shib_m: props => <ShibIcon {...props} />,
  ape_m: props => <ApeIcon {...props} />,
  euroc_m: props => <EurocIcon {...props} />,
};

export const SupportedUtxoCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.btc,
    priority: 1,
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'btc',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/BTC.png'),
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.bch,
    priority: 2,
    currencyName: 'Bitcoin Cash',
    currencyAbbreviation: 'bch',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/BCH.png'),
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.doge,
    priority: 4,
    currencyName: 'Dogecoin',
    currencyAbbreviation: 'doge',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/DOGE.png'),
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.ltc,
    currencyName: 'Litecoin',
    priority: 6,
    currencyAbbreviation: 'ltc',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/LTC.png'),
  },
];

export const OtherSupportedCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.xrp,
    priority: 7,
    currencyName: 'XRP',
    currencyAbbreviation: 'xrp',
    imgSrc: require('../../assets/img/currencies/png/XRP.png'),
  },
];

export const SupportedEvmCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: Math.random().toString(),
    priority: 3,
    img: CurrencyListIcons.eth,
    currencyName: 'Ethereum',
    currencyAbbreviation: 'eth',
    hasMultisig: false,
    imgSrc: require('../../assets/img/currencies/png/ETH.png'),
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.matic,
    priority: 5,
    currencyName: 'Polygon',
    currencyAbbreviation: 'matic',
    hasMultisig: false,
    imgSrc: require('../../assets/img/currencies/png/MATIC.png'),
  },
];

export const SupportedTokenOptions: Array<SupportedCurrencyOption> = [
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.usdc_e,
    currencyName: 'USD Coin',
    currencyAbbreviation: 'usdc',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/USDC.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.busd_e,
    currencyName: 'Binance USD',
    currencyAbbreviation: 'busd',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/BUSD.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.ape_e,
    currencyName: 'ApeCoin',
    currencyAbbreviation: 'ape',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/APE.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.dai_e,
    currencyName: 'DAI',
    currencyAbbreviation: 'dai',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/DAI.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.gusd_e,
    currencyName: 'Gemini Dollar',
    currencyAbbreviation: 'gusd',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/GUSD.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.usdp_e,
    currencyName: 'Pax Dollar',
    currencyAbbreviation: 'usdp',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/USDP.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.euroc_e,
    currencyName: 'Euro Coin',
    currencyAbbreviation: 'euroc',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/EUROC.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.shib_e,
    currencyName: 'Shiba Inu',
    currencyAbbreviation: 'shib',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/SHIB.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.wbtc_e,
    currencyName: 'Wrapped Bitcoin',
    currencyAbbreviation: 'wbtc',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/WBTC.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.pyusd_e,
    currencyName: 'PayPal USD',
    currencyAbbreviation: 'pyusd',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/PYUSD.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.eth,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.usdc_m,
    currencyName: 'USD Coin',
    currencyAbbreviation: 'usdc',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/USDC.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.ape_m,
    currencyName: 'ApeCoin',
    currencyAbbreviation: 'ape',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/APE.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.euroc_m,
    currencyName: 'Euro Coin',
    currencyAbbreviation: 'euroc',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/EUROC.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.shib_m,
    currencyName: 'Shiba Inu',
    currencyAbbreviation: 'shib',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/SHIB.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.gusd_m,
    currencyName: 'Gemini Dollar',
    currencyAbbreviation: 'gusd',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/GUSD.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.busd_m,
    currencyName: 'Binance USD',
    currencyAbbreviation: 'busd',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/BUSD.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.dai_m,
    currencyName: 'DAI',
    currencyAbbreviation: 'dai',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/DAI.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.wbtc_m,
    currencyName: 'Wrapped Bitcoin',
    currencyAbbreviation: 'wbtc',
    chain: 'matic',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/WBTC.png'),
    badgeSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeUri: CurrencyListIcons.matic,
  },
  {
    id: Math.random().toString(),
    img: CurrencyListIcons.matic_e,
    currencyName: 'Matic Token',
    currencyAbbreviation: 'matic',
    chain: 'eth',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/MATIC.png'),
    badgeSrc: require('../../assets/img/currencies/png/ETH.png'),
    badgeUri: CurrencyListIcons.matic,
  },
];

export const SupportedCoinsOptions: Array<SupportedCurrencyOption> = orderBy(
  [
    ...SupportedUtxoCurrencyOptions,
    ...SupportedEvmCurrencyOptions,
    ...OtherSupportedCurrencyOptions,
  ],
  'priority',
);

export const SupportedCurrencyOptions: Array<SupportedCurrencyOption> = [
  ...SupportedCoinsOptions,
  ...SupportedTokenOptions,
];
