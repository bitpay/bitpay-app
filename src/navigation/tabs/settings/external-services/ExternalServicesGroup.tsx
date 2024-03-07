import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../../../components/styled/Text';
import BanxaDetails from './screens/BanxaDetails';
import BanxaSettings from './screens/BanxaSettings';
import MoonpaySettings from './screens/MoonpaySettings';
import MoonpayDetails from './screens/MoonpayDetails';
import MoonpaySellDetails from './screens/MoonpaySellDetails';
import RampSettings from './screens/RampSettings';
import RampDetails from './screens/RampDetails';
import SardineSettings from './screens/SardineSettings';
import SardineDetails from './screens/SardineDetails';
import SimplexSettings from './screens/SimplexSettings';
import SimplexDetails from './screens/SimplexDetails';
import TransakSettings from './screens/TransakSettings';
import TransakDetails from './screens/TransakDetails';
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
  TransakIncomingData,
  TransakPaymentData,
  WyrePaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {MoonpaySellOrderData} from '../../../../store/sell-crypto/sell-crypto.models';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {Root} from '../../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface ExternalServicesSettingsProps {
  ExternalServicesSettings: typeof Root;
}

export type ExternalServicesSettingsGroupParamList = {
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
  MoonpaySellDetails: {
    sellOrder: MoonpaySellOrderData;
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
  TransakSettings:
    | {
        incomingPaymentRequest?: TransakIncomingData;
      }
    | undefined;
  TransakDetails: {
    paymentRequest: TransakPaymentData;
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
  MOONPAY_SELL_DETAILS = 'MoonpaySellDetails',
  RAMP_SETTINGS = 'RampSettings',
  RAMP_DETAILS = 'RampDetails',
  SARDINE_SETTINGS = 'SardineSettings',
  SARDINE_DETAILS = 'SardineDetails',
  SIMPLEX_SETTINGS = 'SimplexSettings',
  SIMPLEX_DETAILS = 'SimplexDetails',
  TRANSAK_SETTINGS = 'TransakSettings',
  TRANSAK_DETAILS = 'TransakDetails',
  WYRE_SETTINGS = 'WyreSettings',
  WYRE_DETAILS = 'WyreDetails',
  CHANGELLY_SETTINGS = 'ChangellySettings',
  CHANGELLY_DETAILS = 'ChangellyDetails',
}

const ExternalServicesSettingsGroup: React.FC<
  ExternalServicesSettingsProps
> = ({ExternalServicesSettings}) => {
  const {t} = useTranslation();
  return (
    <ExternalServicesSettings.Group
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
        name={ExternalServicesSettingsScreens.MOONPAY_SELL_DETAILS}
        component={MoonpaySellDetails}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Sell Order Details')}</HeaderTitle>
          ),
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
        name={ExternalServicesSettingsScreens.TRANSAK_SETTINGS}
        component={TransakSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Transak Settings')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.TRANSAK_DETAILS}
        component={TransakDetails}
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
    </ExternalServicesSettings.Group>
  );
};

export default ExternalServicesSettingsGroup;
