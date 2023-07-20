import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {RootStacks} from '../../../../../Root';
import {TabsScreens} from '../../../TabsStack';
import LinkCard from './LinkCard';

export const GetMastercard: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  return (
    <LinkCard
      description={t('Get the BitPay prepaid Mastercard®')}
      onPress={() =>
        navigation.navigate(RootStacks.TABS, {
          screen: TabsScreens.CARD,
        })
      }
    />
  );
};
