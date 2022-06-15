import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import LinkCard from './LinkCard';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import {logSegmentEvent} from '../../../../../store/app/app.effects';
import {useAppDispatch} from '../../../../../utils/hooks';

const ConnectCoinbase = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const goToCoinbase = () => {
    dispatch(
      logSegmentEvent('track', 'Clicked Connect Coinbase', {
        context: 'ExpandPortfolioCarousel',
      }),
    );
    navigation.navigate('Coinbase', {screen: 'CoinbaseRoot'});
  };
  return (
    <LinkCard
      image={() => <CoinbaseSmall />}
      description={t('Connect your Coinbase account')}
      onPress={goToCoinbase}
    />
  );
};

export default ConnectCoinbase;
