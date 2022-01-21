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

export const CurrencyListIcons: {
  [key in string]: {square: ReactElement; round: ReactElement};
} = {
  btc: {
    square: <BtcIcon />,
    round: <BtcRoundIcon />,
  },
  bch: {
    square: <BchIcon />,
    round: <BchRoundIcon />,
  },
  eth: {
    square: <EthIcon />,
    round: <EthRoundIcon />,
  },
  doge: {
    square: <DogeIcon />,
    round: <DogeRoundIcon />,
  },
  ltc: {
    square: <LtcIcon />,
    round: <LtcRoundIcon />,
  },
  xrp: {
    square: <XrpIcon />,
    round: <XrpRoundIcon />,
  },
  usdc: {
    square: <UsdcIcon />,
    round: <UsdcRoundIcon />,
  },
  gusd: {
    square: <GusdIcon />,
    round: <GusdRoundIcon />,
  },
  busd: {
    square: <BusdIcon />,
    round: <BusdRoundIcon />,
  },
  dai: {
    square: <DaiIcon />,
    round: <DaiRoundIcon />,
  },
  pax: {
    square: <PaxIcon />,
    round: <PaxRoundIcon />,
  },
  wbtc: {
    square: <WbtcIcon />,
    round: <WbtcRoundIcon />,
  },
};
