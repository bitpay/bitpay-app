import React, {ReactElement} from 'react';
import BtcIcon from '../../assets/img/currencies/btc.svg';
import BchIcon from '../../assets/img/currencies/bch.svg';
import EthIcon from '../../assets/img/currencies/eth.svg';
import RbtcIcon from '../../assets/img/currencies/rbtc.svg';
import XUSDIcon from '../../assets/img/currencies/xusd.svg';
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
import {ImageSourcePropType} from 'react-native';

export interface SupportedCurrencyOption {
  id: string;
  img: string | ((props?: any) => ReactElement);
  currencyName: string;
  hasMultisig?: boolean;
  currencyAbbreviation: string;
  isToken?: boolean;
  imgSrc: ImageSourcePropType;
}

export const CurrencyListIcons: {
  [key in string]: (props: any) => ReactElement;
} = {
  btc: props => <BtcIcon {...props} />,
  bch: props => <BchIcon {...props} />,
  eth: props => <EthIcon {...props} />,
  rbtc: props => <RbtcIcon {...props} />,
  xusd: props => <XUSDIcon {...props} />,
  doge: props => <DogeIcon {...props} />,
  ltc: props => <LtcIcon {...props} />,
  xrp: props => <XrpIcon {...props} />,
  usdc: props => <UsdcIcon {...props} />,
  gusd: props => <GusdIcon {...props} />,
  busd: props => <BusdIcon {...props} />,
  dai: props => <DaiIcon {...props} />,
  usdp: props => <UsdpIcon {...props} />,
  wbtc: props => <WbtcIcon {...props} />,
  shib: props => <ShibIcon {...props} />,
  ape: props => <ApeIcon {...props} />,
  euroc: props => <EurocIcon {...props} />,
};

export const SupportedCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: 'btc',
    img: CurrencyListIcons.btc,
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'BTC',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/BTC.png'),
  },
  {
    id: 'bch',
    img: CurrencyListIcons.bch,
    currencyName: 'Bitcoin Cash',
    currencyAbbreviation: 'BCH',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/BCH.png'),
  },
  {
    id: 'eth',
    img: CurrencyListIcons.eth,
    currencyName: 'Ethereum',
    currencyAbbreviation: 'ETH',
    hasMultisig: false, // TODO
    imgSrc: require('../../assets/img/currencies/png/ETH.png'),
  },
  {
    id: 'rbtc',
    img: CurrencyListIcons.rbtc,
    currencyName: 'RSK',
    currencyAbbreviation: 'RBTC',
    hasMultisig: false, // TODO
    imgSrc: require('../../assets/img/currencies/png/RBTC.png'),
  },
  {
    id: 'doge',
    img: CurrencyListIcons.doge,
    currencyName: 'Dogecoin',
    currencyAbbreviation: 'DOGE',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/DOGE.png'),
  },
  {
    id: 'ltc',
    img: CurrencyListIcons.ltc,
    currencyName: 'Litecoin',
    currencyAbbreviation: 'LTC',
    hasMultisig: true,
    imgSrc: require('../../assets/img/currencies/png/LTC.png'),
  },
  {
    id: 'xrp',
    img: CurrencyListIcons.xrp,
    currencyName: 'XRP',
    currencyAbbreviation: 'XRP',
    imgSrc: require('../../assets/img/currencies/png/XRP.png'),
  },
  {
    id: 'usdc',
    img: CurrencyListIcons.usdc,
    currencyName: 'USD Coin',
    currencyAbbreviation: 'USDC',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/USDC.png'),
  },
  {
    id: 'ape',
    img: CurrencyListIcons.ape,
    currencyName: 'ApeCoin',
    currencyAbbreviation: 'APE',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/APE.png'),
  },
  {
    id: 'euroc',
    img: CurrencyListIcons.euroc,
    currencyName: 'Euro Coin',
    currencyAbbreviation: 'EUROC',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/EUROC.png'),
  },
  {
    id: 'shib',
    img: CurrencyListIcons.shib,
    currencyName: 'Shiba Inu',
    currencyAbbreviation: 'SHIB',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/SHIB.png'),
  },
  {
    id: 'gusd',
    img: CurrencyListIcons.gusd,
    currencyName: 'Gemini Dollar',
    currencyAbbreviation: 'GUSD',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/GUSD.png'),
  },
  {
    id: 'busd',
    img: CurrencyListIcons.busd,
    currencyName: 'Binance USD Coin',
    currencyAbbreviation: 'BUSD',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/BUSD.png'),
  },
  {
    id: 'xusd',
    img: CurrencyListIcons.xusd,
    currencyName: 'Sovryn XUSD',
    currencyAbbreviation: 'XUSD',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/xusd.png'),
  },
  {
    id: 'dai',
    img: CurrencyListIcons.dai,
    currencyName: 'Dai',
    currencyAbbreviation: 'DAI',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/DAI.png'),
  },
  {
    id: 'usdp',
    img: CurrencyListIcons.usdp,
    currencyName: 'Pax Dollar',
    currencyAbbreviation: 'USDP',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/USDP.png'),
  },
  {
    id: 'wbtc',
    img: CurrencyListIcons.wbtc,
    currencyName: 'Wrapped Bitcoin',
    currencyAbbreviation: 'WBTC',
    isToken: true,
    imgSrc: require('../../assets/img/currencies/png/WBTC.png'),
  },
];
