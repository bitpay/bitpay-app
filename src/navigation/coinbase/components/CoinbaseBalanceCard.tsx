import React from 'react';
import HomeCard from '../../../components/home-card/HomeCard';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import styled from 'styled-components/native';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {useAppSelector} from '../../../utils/hooks';

const HeaderImg = styled.View`
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
`;

const HeaderComponent = (
  <HeaderImg>
    <CoinbaseSvg />
  </HeaderImg>
);

const CoinbaseBalanceCard = () => {
  const navigation = useNavigation();
  const onCTAPress = () => {
    navigation.navigate('Coinbase', {screen: 'CoinbaseRoot'});
  };
  const balance =
    useAppSelector(({COINBASE}) => COINBASE.balance[COINBASE_ENV]) || 0.0;

  const body = {
    title: 'Coinbase',
    value: formatFiatAmount(balance, 'USD'),
  };

  return (
    <HomeCard header={HeaderComponent} body={body} onCTAPress={onCTAPress} />
  );
};

export default CoinbaseBalanceCard;
