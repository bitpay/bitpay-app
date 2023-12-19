import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderTitle} from '../../../../components/styled/Text';
import BanxaDetails from './screens/BanxaDetails';
import BanxaSettings from './screens/BanxaSettings';
import MoonpaySettings from './screens/MoonpaySettings';
import MoonpayDetails from './screens/MoonpayDetails';
import RampSettings from './screens/RampSettings';
import RampDetails from './screens/RampDetails';
import SardineSettings from './screens/SardineSettings';
import SardineDetails from './screens/SardineDetails';
import SimplexSettings from './screens/SimplexSettings';
import SimplexDetails from './screens/SimplexDetails';
import WyreSettings from './screens/WyreSettings';
import WyreDetails from './screens/WyreDetails';
import ChangellySettings from './screens/ChangellySettings';
import ChangellyDetails from './screens/ChangellyDetails';
import {
  BanxaIncomingData,
  BanxaPaymentData,
  MoonpayIncomingData,
  MoonpayPaymentData,
  RampIncomingData,
  RampPaymentData,
  SardineIncomingData,
  SardinePaymentData,
  SimplexIncomingData,
  SimplexPaymentData,
  WyrePaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {HeaderBackButton} from '@react-navigation/elements';

export type ExternalServicesSettingsStackParamList = {
  BanxaSettings:
    | {
        incomingPaymentRequest?: BanxaIncomingData;
      }
    | undefined;
  BanxaDetails: {
    paymentRequest: BanxaPaymentData;
  };
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
  SardineSettings:
    | {
        incomingPaymentRequest?: SardineIncomingData;
      }
    | undefined;
  SardineDetails: {
    paymentRequest: SardinePaymentData;
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
  BANXA_SETTINGS = 'BanxaSettings',
  BANXA_DETAILS = 'BanxaDetails',
  MOONPAY_SETTINGS = 'MoonpaySettings',
  MOONPAY_DETAILS = 'MoonpayDetails',
  RAMP_SETTINGS = 'RampSettings',
  RAMP_DETAILS = 'RampDetails',
  SARDINE_SETTINGS = 'SardineSettings',
  SARDINE_DETAILS = 'SardineDetails',
  SIMPLEX_SETTINGS = 'SimplexSettings',
  SIMPLEX_DETAILS = 'SimplexDetails',
  WYRE_SETTINGS = 'WyreSettings',
  WYRE_DETAILS = 'WyreDetails',
  CHANGELLY_SETTINGS = 'ChangellySettings',
  CHANGELLY_DETAILS = 'ChangellyDetails',
}

const ExternalServicesSettings =
  createNativeStackNavigator<ExternalServicesSettingsStackParamList>();

const ExternalServicesSettingsStack = () => {
  const {t} = useTranslation();
  return (
    <ExternalServicesSettings.Navigator
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
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.BANXA_SETTINGS}
        component={BanxaSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Banxa Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.BANXA_DETAILS}
        component={BanxaDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
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
        name={ExternalServicesSettingsScreens.SARDINE_SETTINGS}
        component={SardineSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sardine Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.SARDINE_DETAILS}
        component={SardineDetails}
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
