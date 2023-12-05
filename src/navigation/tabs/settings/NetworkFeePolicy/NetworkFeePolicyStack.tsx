import React from 'react';
import {useTranslation} from 'react-i18next';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import NetworkFeePolicy from './screens/NewtorkFeePolicy';
import {HeaderBackButton} from '@react-navigation/elements';

export type NetworkFeePolicySettingsStackParamsList = {
  NetworkFeePolicy: undefined;
};

export enum NetworkFeePolicySettingsScreens {
  NETWORK_FEE_POLICY = 'NetworkFeePolicy',
}
const Notifications =
  createNativeStackNavigator<NetworkFeePolicySettingsStackParamsList>();

const NetworkFeePolicySettingsStack = () => {
  const {t} = useTranslation();

  return (
    <Notifications.Navigator
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
      <Notifications.Screen
        name={NetworkFeePolicySettingsScreens.NETWORK_FEE_POLICY}
        component={NetworkFeePolicy}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Network Fee Policies')}</HeaderTitle>
          ),
        }}
      />
    </Notifications.Navigator>
  );
};
export default NetworkFeePolicySettingsStack;
