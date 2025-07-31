import React from 'react';
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../../components/styled/Text';
import BuyCryptoRoot, {
  BuyCryptoRootScreenParams,
} from './screens/BuyCryptoRoot';
import BuyCryptoOffers, {
  BuyCryptoOffersScreenParams,
} from './screens/BuyCryptoOffers';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../Root';
import {useStackScreenOptions} from '../../utils/headerHelpers';

interface BuyCryptoProps {
  BuyCrypto: typeof Root;
  theme: Theme;
}

export type BuyCryptoGroupParamList = {
  BuyCryptoRoot: BuyCryptoRootScreenParams;
  BuyCryptoOffers: BuyCryptoOffersScreenParams;
};

export enum BuyCryptoScreens {
  ROOT = 'BuyCryptoRoot',
  OFFERS = 'BuyCryptoOffers',
}

const BuyCryptoGroup: React.FC<BuyCryptoProps> = ({BuyCrypto, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <BuyCrypto.Group screenOptions={commonOptions}>
      <BuyCrypto.Screen
        name={BuyCryptoScreens.ROOT}
        component={BuyCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Summary')}</HeaderTitle>,
        }}
      />
      <BuyCrypto.Screen
        name={BuyCryptoScreens.OFFERS}
        component={BuyCryptoOffers}
        options={{
          headerTitle: () => <HeaderTitle>{t('Offers')}</HeaderTitle>,
        }}
      />
    </BuyCrypto.Group>
  );
};

export default BuyCryptoGroup;
