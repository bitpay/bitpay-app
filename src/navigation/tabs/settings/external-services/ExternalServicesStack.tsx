import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import ExternalServicesRoot from './screens/ExternalServicesRoot';
import SimplexSettings from './screens/SimplexSettings';
import SimplexDetails from './screens/SimplexDetails';
import WyreSettings from './screens/WyreSettings';
import WyreDetails from './screens/WyreDetails';
import ChangellySettings from './screens/ChangellySettings';
import ChangellyDetails from './screens/ChangellyDetails';
import {
  simplexPaymentData,
  wyrePaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';

export type ExternalServicesSettingsStackParamList = {
  Root: undefined;
  SimplexSettings: undefined;
  SimplexDetails: {
    paymentRequest: simplexPaymentData;
  };
  WyreSettings: undefined;
  WyreDetails: {
    paymentRequest: wyrePaymentData;
  };
  ChangellySettings: undefined;
  ChangellyDetails: {
    swapTx: changellyTxData;
  };
};

export enum ExternalServicesSettingsScreens {
  ROOT = 'Root',
  SIMPLEX_SETTINGS = 'SimplexSettings',
  SIMPLEX_DETAILS = 'SimplexDetails',
  WYRE_SETTINGS = 'WyreSettings',
  WYRE_DETAILS = 'WyreDetails',
  CHANGELLY_SETTINGS = 'ChangellySettings',
  CHANGELLY_DETAILS = 'ChangellyDetails',
}

const ExternalServicesSettings =
  createStackNavigator<ExternalServicesSettingsStackParamList>();

const ExternalServicesSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <ExternalServicesSettings.Navigator
      initialRouteName={ExternalServicesSettingsScreens.ROOT}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.ROOT}
        component={ExternalServicesRoot}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('External Services')}</HeaderTitle>
          ),
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.SIMPLEX_SETTINGS}
        component={SimplexSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Simplex Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.SIMPLEX_DETAILS}
        component={SimplexDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.WYRE_SETTINGS}
        component={WyreSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Wyre Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.WYRE_DETAILS}
        component={WyreDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.CHANGELLY_SETTINGS}
        component={ChangellySettings}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Changelly Settings')}</HeaderTitle>
          ),
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.CHANGELLY_DETAILS}
        component={ChangellyDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
    </ExternalServicesSettings.Navigator>
  );
};

export default ExternalServicesSettingsStack;
