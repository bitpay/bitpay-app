import React from 'react';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import LinkCard from './LinkCard';
import CoinbaseSmall from '../../../../../../assets/img/logos/coinbase-small.svg';
import {useAppDispatch} from '../../../../../utils/hooks';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

const ConnectCoinbase = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const goToCoinbase = () => {
    dispatch(
      Analytics.track('Clicked Connect Coinbase', {
        context: 'ExpandPortfolioCarousel',
      }),
    );
    navigation.navigate('CoinbaseRoot');
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
