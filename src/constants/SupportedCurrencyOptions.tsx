import React, {ReactElement} from 'react';
import FastImage from 'react-native-fast-image';
import DefaultImage from '../../assets/img/currencies/default.svg';
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
import PaxIcon from '../../assets/img/currencies/pax.svg';
import WbtcIcon from '../../assets/img/currencies/wbtc.svg';

export interface SupportedCurrencyOption {
  id: string;
  img: string | ((props?: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
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
  pax: props => <PaxIcon {...props} />,
  wbtc: props => <WbtcIcon {...props} />,
};

export const SupportedCurrencyOptions: Array<SupportedCurrencyOption> = [
  {
    id: 'btc',
    img: CurrencyListIcons.btc,
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'BTC',
  },
  {
    id: 'bch',
    img: CurrencyListIcons.bch,
    currencyName: 'Bitcoin Cash',
    currencyAbbreviation: 'BCH',
  },
  {
    id: 'eth',
    img: CurrencyListIcons.eth,
    currencyName: 'Ethereum',
    currencyAbbreviation: 'ETH',
  },
  {
    id: 'doge',
    img: CurrencyListIcons.doge,
    currencyName: 'Dogecoin',
    currencyAbbreviation: 'DOGE',
  },
  {
    id: 'ltc',
    img: CurrencyListIcons.ltc,
    currencyName: 'Litecoin',
    currencyAbbreviation: 'LTC',
  },
  {
    id: 'xrp',
    img: CurrencyListIcons.xrp,
    currencyName: 'Xrp',
    currencyAbbreviation: 'XRP',
  },
  {
    id: 'usdc',
    img: CurrencyListIcons.usdc,
    currencyName: 'Usdc',
    currencyAbbreviation: 'USDC',
  },
  {
    id: 'gusd',
    img: CurrencyListIcons.gusd,
    currencyName: 'Gusd',
    currencyAbbreviation: 'GUSD',
  },
  {
    id: 'busd',
    img: CurrencyListIcons.busd,
    currencyName: 'Busd',
    currencyAbbreviation: 'BUSD',
  },
  {
    id: 'dai',
    img: CurrencyListIcons.dai,
    currencyName: 'Dai',
    currencyAbbreviation: 'DAI',
  },
  {
    id: 'pax',
    img: CurrencyListIcons.pax,
    currencyName: 'Pax',
    currencyAbbreviation: 'PAX',
  },
  {
    id: 'wbtc',
    img: CurrencyListIcons.wbtc,
    currencyName: 'Wbtc',
    currencyAbbreviation: 'WBTC',
  },
];

// renders svg if supported currency or cached png if custom token
export const renderCurrencyImage = (
  img: string | ((props?: any) => ReactElement),
  size = 40,
) => {
  const style = {width: size, height: size};

  if (!img) {
    return <DefaultImage style={style} />;
  }

  if (typeof img === 'string') {
    return (
      <FastImage
        style={style}
        source={{
          uri: img,
          priority: FastImage.priority.normal,
        }}
        resizeMode={FastImage.resizeMode.contain}
      />
    );
  }

  return img(style);
};
