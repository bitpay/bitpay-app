import React, {ReactElement} from 'react';
import BtcIcon from '../../../../../assets/img/currencies/round/btc.svg';
import BchIcon from '../../../../../assets/img/currencies/round/bch.svg';
import EthIcon from '../../../../../assets/img/currencies/round/eth.svg';
import DogeIcon from '../../../../../assets/img/currencies/round/doge.svg';
import LtcIcon from '../../../../../assets/img/currencies/round/ltc.svg';
import XrpIcon from '../../../../../assets/img/currencies/round/xrp.svg';
import UsdcIcon from '../../../../../assets/img/currencies/round/usdc.svg';
import GusdIcon from '../../../../../assets/img/currencies/round/gusd.svg';
import BusdIcon from '../../../../../assets/img/currencies/round/busd.svg';
import DaiIcon from '../../../../../assets/img/currencies/round/dai.svg';
import PaxIcon from '../../../../../assets/img/currencies/round/pax.svg';
import WbtcIcon from '../../../../../assets/img/currencies/round/wbtc.svg';

interface CurrencyListProps {
  id: string;
  img: () => ReactElement;
  mainLabel: string;
}

export const CurrencyInfoList: Array<CurrencyListProps> = [
  {
    id: 'btc',
    img: () => <BtcIcon />,
    mainLabel: 'Bitcoin',
  },
  {
    id: 'bch',
    img: () => <BchIcon />,
    mainLabel: 'Bitcoin Cash',
  },
  {
    id: 'eth',
    img: () => <EthIcon />,
    mainLabel: 'Ethereum',
  },
  {
    id: 'doge',
    img: () => <DogeIcon />,
    mainLabel: 'Dogecoin',
  },
  {
    id: 'ltc',
    img: () => <LtcIcon />,
    mainLabel: 'Litecoin',
  },
  {
    id: 'xrp',
    img: () => <XrpIcon />,
    mainLabel: 'Xrp',
  },
  {
    id: 'usdc',
    img: () => <UsdcIcon />,
    mainLabel: 'Usdc',
  },
  {
    id: 'gusd',
    img: () => <GusdIcon />,
    mainLabel: 'Gusd',
  },
  {
    id: 'busd',
    img: () => <BusdIcon />,
    mainLabel: 'Busd',
  },
  {
    id: 'dai',
    img: () => <DaiIcon />,
    mainLabel: 'Dai',
  },
  {
    id: 'pax',
    img: () => <PaxIcon />,
    mainLabel: 'Pax',
  },
  {
    id: 'wbtc',
    img: () => <WbtcIcon />,
    mainLabel: 'Wbtc',
  },
];
