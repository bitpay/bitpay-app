import React from 'react';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import MerchantDetails from './screens/MerchantDetails';
import MerchantCategory from './screens/MerchantCategory';
import {Root} from '../../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface MerchantProps {
  Merchant: typeof Root;
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

const MerchantGroup: React.FC<MerchantProps> = ({Merchant}) => {
  return (
    <Merchant.Group
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
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
