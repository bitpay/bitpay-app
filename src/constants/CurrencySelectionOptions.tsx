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

import BtcRoundIcon from '../../assets/img/currencies/round/btc.svg';
import BchRoundIcon from '../../assets/img/currencies/round/bch.svg';
import EthRoundIcon from '../../assets/img/currencies/round/eth.svg';
import DogeRoundIcon from '../../assets/img/currencies/round/doge.svg';
import LtcRoundIcon from '../../assets/img/currencies/round/ltc.svg';
import XrpRoundIcon from '../../assets/img/currencies/round/xrp.svg';
import UsdcRoundIcon from '../../assets/img/currencies/round/usdc.svg';
import GusdRoundIcon from '../../assets/img/currencies/round/gusd.svg';
import BusdRoundIcon from '../../assets/img/currencies/round/busd.svg';
import DaiRoundIcon from '../../assets/img/currencies/round/dai.svg';
import PaxRoundIcon from '../../assets/img/currencies/round/pax.svg';
import WbtcRoundIcon from '../../assets/img/currencies/round/wbtc.svg';

import {ItemProps} from '../components/list/CurrencySelectionRow';

export const CurrencySelectionOptions: Array<ItemProps> = [
  {
    id: 'btc',
    img: <BtcIcon />,
    roundIcon: (size: number = 30) => (
      <BtcRoundIcon width={size} height={size} />
    ),
    currencyName: 'Bitcoin',
    currencyAbbreviation: 'BTC',
  },
  {
    id: 'bch',
    img: <BchIcon />,
    roundIcon: (size: number = 30) => (
      <BchRoundIcon width={size} height={size} />
    ),
    currencyName: 'Bitcoin Cash',
    currencyAbbreviation: 'BCH',
  },
  {
    id: 'eth',
    img: <EthIcon />,
    roundIcon: (size: number = 30) => (
      <EthRoundIcon width={size} height={size} />
    ),
    currencyName: 'Ethereum',
    currencyAbbreviation: 'ETH',
  },
  {
    id: 'doge',
    img: <DogeIcon />,
    roundIcon: (size: number = 30) => (
      <DogeRoundIcon width={size} height={size} />
    ),
    currencyName: 'Dogecoin',
    currencyAbbreviation: 'DOGE',
  },
  {
    id: 'ltc',
    img: <LtcIcon />,
    roundIcon: (size: number = 30) => (
      <LtcRoundIcon width={size} height={size} />
    ),
    currencyName: 'Litecoin',
    currencyAbbreviation: 'LTC',
  },
  {
    id: 'xrp',
    img: <XrpIcon />,
    roundIcon: (size: number = 30) => (
      <XrpRoundIcon width={size} height={size} />
    ),
    currencyName: 'Xrp',
    currencyAbbreviation: 'XRP',
  },
  {
    id: 'usdc',
    img: <UsdcIcon />,
    roundIcon: (size: number = 30) => (
      <UsdcRoundIcon width={size} height={size} />
    ),
    currencyName: 'Usdc',
    currencyAbbreviation: 'USDC',
  },
  {
    id: 'gusd',
    img: <GusdIcon />,
    roundIcon: (size: number = 30) => (
      <GusdRoundIcon width={size} height={size} />
    ),
    currencyName: 'Gusd',
    currencyAbbreviation: 'GUSD',
  },
  {
    id: 'busd',
    img: <BusdIcon />,
    roundIcon: (size: number = 30) => (
      <BusdRoundIcon width={size} height={size} />
    ),
    currencyName: 'Busd',
    currencyAbbreviation: 'BUSD',
  },
  {
    id: 'dai',
    img: <DaiIcon />,
    roundIcon: (size: number = 30) => (
      <DaiRoundIcon width={size} height={size} />
    ),
    currencyName: 'Dai',
    currencyAbbreviation: 'DAI',
  },
  {
    id: 'pax',
    img: <PaxIcon />,
    roundIcon: (size: number = 30) => (
      <PaxRoundIcon width={size} height={size} />
    ),
    currencyName: 'Pax',
    currencyAbbreviation: 'PAX',
  },
  {
    id: 'wbtc',
    img: <WbtcIcon />,
    roundIcon: (size: number = 30) => (
      <WbtcRoundIcon width={size} height={size} />
    ),
    currencyName: 'Wbtc',
    currencyAbbreviation: 'WBTC',
  },
];
