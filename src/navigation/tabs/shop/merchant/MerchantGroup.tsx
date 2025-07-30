import React from 'react';
import {Theme} from '@react-navigation/native';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import MerchantDetails from './screens/MerchantDetails';
import MerchantCategory from './screens/MerchantCategory';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';

interface MerchantProps {
  Merchant: typeof Root;
  theme: Theme;
}

export type MerchantGroupParamList = {
  MerchantCategory: {
    category: Category;
    integrations: DirectIntegrationApiObject[];
  };
  MerchantDetails: {directIntegration: DirectIntegrationApiObject};
};

export enum MerchantScreens {
  MERCHANT_CATEGORY = 'MerchantCategory',
  MERCHANT_DETAILS = 'MerchantDetails',
}

const MerchantGroup: React.FC<MerchantProps> = ({Merchant, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <Merchant.Group screenOptions={commonOptions}>
      <Merchant.Screen
        name={MerchantScreens.MERCHANT_CATEGORY}
        component={MerchantCategory}
      />
      <Merchant.Screen
        name={MerchantScreens.MERCHANT_DETAILS}
        component={MerchantDetails}
      />
    </Merchant.Group>
  );
};

export default MerchantGroup;
