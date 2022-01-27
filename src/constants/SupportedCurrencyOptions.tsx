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
import {ImageSourcePropType} from 'react-native';

export interface SupportedCurrencyOption {
  id: string;
  img: string | ((props?: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  imgSrc: ImageSourcePropType;
}

export const CurrencyListIcons: {
  [key in string]: (props: any) => ReactElement;
} = {
  btc: props => <BtcIcon {...props} />,
  bch: props => <BchIcon {...props} />,
  eth: props => <EthIcon {...props} />,
  doge: props => <DogeIcon {...props} />,
  ltc: props => <LtcIcon {...props} />,
  xrp: props => <XrpIcon {...props} />,
  usdc: props => <UsdcIcon {...props} />,
  gusd: props => <GusdIcon {...props} />,
  busd: props => <BusdIcon {...props} />,
  dai: props => <DaiIcon {...props} />,
  usdp: props => <UsdpIcon {...props} />,
  wbtc: props => <WbtcIcon {...props} />,
};

export const SupportedCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: 'btc',
    img: CurrencyListIcons.btc,
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'BTC',
    imgSrc: require('../../assets/img/currencies/png/BTC.png'),
  },
  {
    id: 'bch',
    img: CurrencyListIcons.bch,
    currencyName: 'Bitcoin Cash',
    currencyAbbreviation: 'BCH',
    imgSrc: require('../../assets/img/currencies/png/BCH.png'),
  },
  {
    id: 'eth',
    img: CurrencyListIcons.eth,
    currencyName: 'Ethereum',
    currencyAbbreviation: 'ETH',
    imgSrc: require('../../assets/img/currencies/png/ETH.png'),
  },
  {
    id: 'doge',
    img: CurrencyListIcons.doge,
    currencyName: 'Dogecoin',
    currencyAbbreviation: 'DOGE',
    imgSrc: require('../../assets/img/currencies/png/DOGE.png'),
  },
  {
    id: 'ltc',
    img: CurrencyListIcons.ltc,
    currencyName: 'Litecoin',
    currencyAbbreviation: 'LTC',
    imgSrc: require('../../assets/img/currencies/png/LTC.png'),
  },
  {
    id: 'xrp',
    img: CurrencyListIcons.xrp,
    currencyName: 'Xrp',
    currencyAbbreviation: 'XRP',
    imgSrc: require('../../assets/img/currencies/png/XRP.png'),
  },
  {
    id: 'usdc',
    img: CurrencyListIcons.usdc,
    currencyName: 'Usdc',
    currencyAbbreviation: 'USDC',
    imgSrc: require('../../assets/img/currencies/png/USDC.png'),
  },
  {
    id: 'gusd',
    img: CurrencyListIcons.gusd,
    currencyName: 'Gusd',
    currencyAbbreviation: 'GUSD',
    imgSrc: require('../../assets/img/currencies/png/GUSD.png'),
  },
  {
    id: 'busd',
    img: CurrencyListIcons.busd,
    currencyName: 'Busd',
    currencyAbbreviation: 'BUSD',
    imgSrc: require('../../assets/img/currencies/png/BUSD.png'),
  },
  {
    id: 'dai',
    img: CurrencyListIcons.dai,
    currencyName: 'Dai',
    currencyAbbreviation: 'DAI',
    imgSrc: require('../../assets/img/currencies/png/DAI.png'),
  },
  {
    id: 'usdp',
    img: CurrencyListIcons.usdp,
    currencyName: 'Pax Dollar',
    currencyAbbreviation: 'USDP',
    imgSrc: require('../../assets/img/currencies/png/USDP.png'),
  },
  {
    id: 'wbtc',
    img: CurrencyListIcons.wbtc,
    currencyName: 'Wbtc',
    currencyAbbreviation: 'WBTC',
    imgSrc: require('../../assets/img/currencies/png/WBTC.png'),
  },
];
