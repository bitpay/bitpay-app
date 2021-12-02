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

import {ItemProps} from '../components/list/CurrencySelectorList';

export const CurrencyList: Array<ItemProps> = [
  {
    id: 'btc',
    img: <BtcIcon />,
    roundIcon: <BtcRoundIcon />,
    mainLabel: 'Bitcoin',
    secondaryLabel: 'BTC',
  },
  {
    id: 'bch',
    img: <BchIcon />,
    roundIcon: <BchRoundIcon />,
    mainLabel: 'Bitcoin Cash',
    secondaryLabel: 'BCH',
  },
  {
    id: 'eth',
    img: <EthIcon />,
    roundIcon: <EthRoundIcon />,
    mainLabel: 'Ethereum',
    secondaryLabel: 'ETH',
  },
  {
    id: 'doge',
    img: <DogeIcon />,
    roundIcon: <DogeRoundIcon />,
    mainLabel: 'Dogecoin',
    secondaryLabel: 'DOGE',
  },
  {
    id: 'ltc',
    img: <LtcIcon />,
    roundIcon: <LtcRoundIcon />,
    mainLabel: 'Litecoin',
    secondaryLabel: 'LTC',
  },
  {
    id: 'xrp',
    img: <XrpIcon />,
    roundIcon: <XrpRoundIcon />,
    mainLabel: 'Xrp',
    secondaryLabel: 'XRP',
  },
  {
    id: 'usdc',
    img: <UsdcIcon />,
    roundIcon: <UsdcRoundIcon />,
    mainLabel: 'Usdc',
    secondaryLabel: 'USDC',
  },
  {
    id: 'gusd',
    img: <GusdIcon />,
    roundIcon: <GusdRoundIcon />,
    mainLabel: 'Gusd',
    secondaryLabel: 'GUSD',
  },
  {
    id: 'busd',
    img: <BusdIcon />,
    roundIcon: <BusdRoundIcon />,
    mainLabel: 'Busd',
    secondaryLabel: 'BUSD',
  },
  {
    id: 'dai',
    img: <DaiIcon />,
    roundIcon: <DaiRoundIcon />,
    mainLabel: 'Dai',
    secondaryLabel: 'DAI',
  },
  {
    id: 'pax',
    img: <PaxIcon />,
    roundIcon: <PaxRoundIcon />,
    mainLabel: 'Pax',
    secondaryLabel: 'PAX',
  },
  {
    id: 'wbtc',
    img: <WbtcIcon />,
    roundIcon: <WbtcRoundIcon />,
    mainLabel: 'Wbtc',
    secondaryLabel: 'WBTC',
  },
];
