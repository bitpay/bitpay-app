import React from 'react';
import {useTranslation} from 'react-i18next';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import NetworkFeePolicy from './screens/NewtorkFeePolicy';

export type NetworkFeePolicySettingsStackParamsList = {
  NetworkFeePolicy: undefined;
};

export enum NetworkFeePolicySettingsScreens {
  NETWORK_FEE_POLICY = 'NetworkFeePolicy',
}
const Notifications =
  createStackNavigator<NetworkFeePolicySettingsStackParamsList>();

const NetworkFeePolicySettingsStack = () => {
  const {t} = useTranslation();

  return (
    <Notifications.Navigator
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
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
