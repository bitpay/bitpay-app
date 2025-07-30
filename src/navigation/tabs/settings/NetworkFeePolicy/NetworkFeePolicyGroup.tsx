import React from 'react';
import {useTranslation} from 'react-i18next';
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../../../components/styled/Text';
import {Root} from '../../../../Root';
import NetworkFeePolicy from './screens/NewtorkFeePolicy';
import {useStackScreenOptions} from '../../../utils/headerHelpers';

interface NetworkFeePolicyProps {
  NetworkFeePolicySettings: typeof Root;
  theme: Theme;
}

export type NetworkFeePolicySettingsGroupParamsList = {
  NetworkFeePolicy: undefined;
};

export enum NetworkFeePolicySettingsScreens {
  NETWORK_FEE_POLICY = 'NetworkFeePolicy',
}

const NetworkFeePolicySettingsGroup: React.FC<NetworkFeePolicyProps> = ({
  NetworkFeePolicySettings,
  theme,
}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();

  return (
    <NetworkFeePolicySettings.Group screenOptions={commonOptions}>
      <NetworkFeePolicySettings.Screen
        name={NetworkFeePolicySettingsScreens.NETWORK_FEE_POLICY}
        component={NetworkFeePolicy}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Network Fee Policies')}</HeaderTitle>
          ),
        }}
      />
    </NetworkFeePolicySettings.Group>
  );
};
export default NetworkFeePolicySettingsGroup;
