import React from 'react';
import {useTranslation} from 'react-i18next';
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../../../components/styled/Text';
import BanxaDetails from './screens/BanxaDetails';
import BanxaSettings from './screens/BanxaSettings';
import MoonpaySettings from './screens/MoonpaySettings';
import MoonpayDetails from './screens/MoonpayDetails';
import MoonpaySellDetails from './screens/MoonpaySellDetails';
import RampSettings from './screens/RampSettings';
import RampDetails from './screens/RampDetails';
import RampSellDetails from './screens/RampSellDetails';
import SardineSettings from './screens/SardineSettings';
import SardineDetails from './screens/SardineDetails';
import SimplexSettings from './screens/SimplexSettings';
import SimplexDetails from './screens/SimplexDetails';
import SimplexSellDetails from './screens/SimplexSellDetails';
import TransakSettings from './screens/TransakSettings';
import TransakDetails from './screens/TransakDetails';
import WyreSettings from './screens/WyreSettings';
import WyreDetails from './screens/WyreDetails';
import ChangellySettings from './screens/ChangellySettings';
import ChangellyDetails from './screens/ChangellyDetails';
import ThorswapSettings from './screens/ThorswapSettings';
import ThorswapDetails from './screens/ThorswapDetails';
import {
  BanxaIncomingData,
  BanxaPaymentData,
  MoonpayIncomingData,
  MoonpayPaymentData,
  SardineIncomingData,
  SardinePaymentData,
  SimplexIncomingData,
  SimplexPaymentData,
  TransakIncomingData,
  TransakPaymentData,
  WyrePaymentData,
} from '../../../../store/buy-crypto/buy-crypto.models';
import {MoonpaySellOrderData} from '../../../../store/sell-crypto/models/moonpay-sell.models';
import {RampSellOrderData} from '../../../../store/sell-crypto/models/ramp-sell.models';
import {SimplexSellOrderData} from '../../../../store/sell-crypto/models/simplex-sell.models';
import {changellyTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {thorswapTxData} from '../../../../store/swap-crypto/swap-crypto.models';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import SwapHistorySelector from './screens/SwapHistorySelector';
import {
  RampIncomingData,
  RampPaymentData,
} from '../../../../store/buy-crypto/models/ramp.models';

interface ExternalServicesSettingsProps {
  ExternalServicesSettings: typeof Root;
  theme: Theme;
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
  RampSellDetails: {
    sellOrder: RampSellOrderData;
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
  SimplexSellDetails: {
    sellOrder: SimplexSellOrderData;
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
  SwapHistorySelector: undefined;
  ChangellySettings: undefined;
  ChangellyDetails: {
    swapTx: changellyTxData;
  };
  ThorswapSettings: undefined;
  ThorswapDetails: {
    swapTx: thorswapTxData;
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
  RAMP_SELL_DETAILS = 'RampSellDetails',
  SARDINE_SETTINGS = 'SardineSettings',
  SARDINE_DETAILS = 'SardineDetails',
  SIMPLEX_SETTINGS = 'SimplexSettings',
  SIMPLEX_DETAILS = 'SimplexDetails',
  SIMPLEX_SELL_DETAILS = 'SimplexSellDetails',
  TRANSAK_SETTINGS = 'TransakSettings',
  TRANSAK_DETAILS = 'TransakDetails',
  WYRE_SETTINGS = 'WyreSettings',
  WYRE_DETAILS = 'WyreDetails',
  SWAP_HISTORY_SELECTOR = 'SwapHistorySelector',
  CHANGELLY_SETTINGS = 'ChangellySettings',
  CHANGELLY_DETAILS = 'ChangellyDetails',
  THORSWAP_SETTINGS = 'ThorswapSettings',
  THORSWAP_DETAILS = 'ThorswapDetails',
}

const ExternalServicesSettingsGroup: React.FC<
  ExternalServicesSettingsProps
> = ({ExternalServicesSettings, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <ExternalServicesSettings.Group screenOptions={commonOptions}>
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.BANXA_SETTINGS}
        component={BanxaSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Banxa')}</HeaderTitle>,
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
          headerTitle: () => <HeaderTitle>{t('Moonpay')}</HeaderTitle>,
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
          headerTitle: () => <HeaderTitle>{t('Ramp Network')}</HeaderTitle>,
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
        name={ExternalServicesSettingsScreens.RAMP_SELL_DETAILS}
        component={RampSellDetails}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Sell Order Details')}</HeaderTitle>
          ),
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.SARDINE_SETTINGS}
        component={SardineSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sardine')}</HeaderTitle>,
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
          headerTitle: () => <HeaderTitle>{t('Simplex')}</HeaderTitle>,
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
        name={ExternalServicesSettingsScreens.SIMPLEX_SELL_DETAILS}
        component={SimplexSellDetails}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Sell Order Details')}</HeaderTitle>
          ),
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.TRANSAK_SETTINGS}
        component={TransakSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Transak')}</HeaderTitle>,
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
          headerTitle: () => <HeaderTitle>{t('Wyre')}</HeaderTitle>,
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
        name={ExternalServicesSettingsScreens.SWAP_HISTORY_SELECTOR}
        component={SwapHistorySelector}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Swap Crypto History')}</HeaderTitle>
          ),
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.CHANGELLY_SETTINGS}
        component={ChangellySettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Changelly')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.CHANGELLY_DETAILS}
        component={ChangellyDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.THORSWAP_SETTINGS}
        component={ThorswapSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('THORSwap')}</HeaderTitle>,
        }}
      />
      <ExternalServicesSettings.Screen
        name={ExternalServicesSettingsScreens.THORSWAP_DETAILS}
        component={ThorswapDetails}
        options={{
          headerTitle: () => <HeaderTitle>{t('Order Details')}</HeaderTitle>,
        }}
      />
    </ExternalServicesSettings.Group>
  );
};

export default ExternalServicesSettingsGroup;
