import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import MoonpaySettings from './screens/MoonpaySettings';
import MoonpayDetails from './screens/MoonpayDetails';
import RampSettings from './screens/RampSettings';
import RampDetails from './screens/RampDetails';
import SimplexSettings from './screens/SimplexSettings';
import SimplexDetails from './screens/SimplexDetails';
import WyreSettings from './screens/WyreSettings';
import WyreDetails from './screens/WyreDetails';
import ChangellySettings from './screens/ChangellySettings';
import ChangellyDetails from './screens/ChangellyDetails';
import {
  MoonpayIncomingData,
  MoonpayPaymentData,
  RampIncomingData,
  RampPaymentData,
  SimplexIncomingData,
  SimplexPaymentData,
  WyrePaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';

export type ExternalServicesSettingsStackParamList = {
  MoonpaySettings:
    | {
        incomingPaymentRequest?: MoonpayIncomingData;
      }
    | undefined;
  MoonpayDetails: {
    paymentRequest: MoonpayPaymentData;
  };
  RampSettings:
    | {
        incomingPaymentRequest?: RampIncomingData;
      }
    | undefined;
  RampDetails: {
    paymentRequest: RampPaymentData;
  };
  SimplexSettings:
    | {
        incomingPaymentRequest?: SimplexIncomingData;
      }
    | undefined;
  SimplexDetails: {
    paymentRequest: SimplexPaymentData;
  };
  WyreSettings:
    | {
        incomingPaymentRequest?: WyrePaymentData;
        paymentRequestError?: boolean;
      }
    | undefined;
  WyreDetails: {
    paymentRequest: WyrePaymentData;
  };
  ChangellySettings: undefined;
  ChangellyDetails: {
    swapTx: changellyTxData;
  };
};

export enum ExternalServicesSettingsScreens {
  MOONPAY_SETTINGS = 'MoonpaySettings',
  MOONPAY_DETAILS = 'MoonpayDetails',
  RAMP_SETTINGS = 'RampSettings',
  RAMP_DETAILS = 'RampDetails',
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
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.MOONPAY_SETTINGS}
        component={MoonpaySettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Moonpay Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.MOONPAY_DETAILS}
        component={MoonpayDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.RAMP_SETTINGS}
        component={RampSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Ramp Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.RAMP_DETAILS}
        component={RampDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
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
