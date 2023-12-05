import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {
  Category,
  DirectIntegrationApiObject,
} from '../../../../store/shop/shop.models';
import MerchantDetails from './screens/MerchantDetails';
import MerchantCategory from './screens/MerchantCategory';
import {HeaderBackButton} from '@react-navigation/elements';

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

const Merchant = createNativeStackNavigator<MerchantStackParamList>();

const MerchantStack = () => {
  return (
    <Merchant.Navigator
      initialRouteName={MerchantScreens.MERCHANT_DETAILS}
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
    </Merchant.Navigator>
  );
};

export default MerchantStack;
