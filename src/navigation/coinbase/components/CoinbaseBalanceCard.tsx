import React from 'react';
import HomeCard from '../../../components/home-card/HomeCard';
import {formatFiatAmount} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import CoinbaseSvg from '../../../../assets/img/logos/coinbase.svg';
import styled from 'styled-components/native';
import {useAppDispatch} from '../../../utils/hooks';
import {CoinbaseEffects} from '../../../store/coinbase';
import {RootState} from '../../../store';
import {useSelector} from 'react-redux';

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
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const onCTAPress = () => {
    navigation.navigate('Coinbase', {screen: 'CoinbaseRoot'});
    dispatch(CoinbaseEffects.getAccountsAndBalance());
  };
  const balance =
    useSelector(({COINBASE}: RootState) => COINBASE.balance) || 0.0;

  const body = {
    title: 'Coinbase',
    value: formatFiatAmount(balance, 'USD'),
  };

  return (
    <HomeCard header={HeaderComponent} body={body} onCTAPress={onCTAPress} />
  );
};

export default CoinbaseBalanceCard;
