import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import MerchantDetails from './screens/MerchantDetails';
import MerchantCategory from './screens/MerchantCategory';

export type MerchantStackParamList = {
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

const Merchant = createStackNavigator<MerchantStackParamList>();

const MerchantStack = () => {
  return (
    <Merchant.Navigator
      initialRouteName={MerchantScreens.MERCHANT_DETAILS}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <Merchant.Screen
        name={MerchantScreens.MERCHANT_CATEGORY}
        component={MerchantCategory}
      />
      <Merchant.Screen
        name={MerchantScreens.MERCHANT_DETAILS}
        component={MerchantDetails}
      />
    </Merchant.Navigator>
  );
};

export default MerchantStack;
