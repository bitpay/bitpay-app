import React from 'react';

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

import {ItemProps} from '../components/list/CurrencySelectorList';

export const CurrencyList: Array<ItemProps> = [
  {
    id: 'btc',
    img: () => <BtcIcon />,
    mainLabel: 'Bitcoin',
    secondaryLabel: 'BTC',
  },
  {
    id: 'bch',
    img: () => <BchIcon />,
    mainLabel: 'Bitcoin Cash',
    secondaryLabel: 'BCH',
  },
  {
    id: 'eth',
    img: () => <EthIcon />,
    mainLabel: 'Ethereum',
    secondaryLabel: 'ETH',
  },
  {
    id: 'doge',
    img: () => <DogeIcon />,
    mainLabel: 'Dogecoin',
    secondaryLabel: 'DOGE',
  },
  {
    id: 'ltc',
    img: () => <LtcIcon />,
    mainLabel: 'Litecoin',
    secondaryLabel: 'LTC',
  },
  {
    id: 'xrp',
    img: () => <XrpIcon />,
    mainLabel: 'Xrp',
    secondaryLabel: 'XRP',
  },
  {
    id: 'usdc',
    img: () => <UsdcIcon />,
    mainLabel: 'Usdc',
    secondaryLabel: 'USDC',
  },
  {
    id: 'gusd',
    img: () => <GusdIcon />,
    mainLabel: 'Gusd',
    secondaryLabel: 'GUSD',
  },
  {
    id: 'busd',
    img: () => <BusdIcon />,
    mainLabel: 'Busd',
    secondaryLabel: 'BUSD',
  },
  {
    id: 'dai',
    img: () => <DaiIcon />,
    mainLabel: 'Dai',
    secondaryLabel: 'DAI',
  },
  {
    id: 'pax',
    img: () => <PaxIcon />,
    mainLabel: 'Pax',
    secondaryLabel: 'PAX',
  },
  {
    id: 'wbtc',
    img: () => <WbtcIcon />,
    mainLabel: 'Wbtc',
    secondaryLabel: 'WBTC',
  },
];
