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

export interface SupportedCurrencyOption {
  id: string;
  img: string | ((props?: any) => ReactElement);
  currencyName: string;
  currencyAbbreviation: string;
  isToken?: boolean;
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
  shib: props => <ShibIcon {...props} />,
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
    currencyName: 'XRP',
    currencyAbbreviation: 'XRP',
  },
  {
    id: 'shib',
    img: CurrencyListIcons.shib,
    currencyName: 'Shiba Inu',
    currencyAbbreviation: 'SHIB',
    isToken: true,
  },
  {
    id: 'usdc',
    img: CurrencyListIcons.usdc,
    currencyName: 'USD Coin',
    currencyAbbreviation: 'USDC',
    isToken: true,
  },
  {
    id: 'gusd',
    img: CurrencyListIcons.gusd,
    currencyName: 'Gemini Dollar',
    currencyAbbreviation: 'GUSD',
    isToken: true,
  },
  {
    id: 'busd',
    img: CurrencyListIcons.busd,
    currencyName: 'Binance USD Coin',
    currencyAbbreviation: 'BUSD',
    isToken: true,
  },
  {
    id: 'dai',
    img: CurrencyListIcons.dai,
    currencyName: 'Dai',
    currencyAbbreviation: 'DAI',
    isToken: true,
  },
  {
    id: 'usdp',
    img: CurrencyListIcons.usdp,
    currencyName: 'Pax Dollar',
    currencyAbbreviation: 'USDP',
    isToken: true,
  },
  {
    id: 'wbtc',
    img: CurrencyListIcons.wbtc,
    currencyName: 'Wrapped Bitcoin',
    currencyAbbreviation: 'WBTC',
    isToken: true,
  },
];
