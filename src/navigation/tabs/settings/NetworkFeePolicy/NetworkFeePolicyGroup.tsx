import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../../../components/styled/Text';
import {Root} from '../../../../Root';
import NetworkFeePolicy from './screens/NewtorkFeePolicy';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface NetworkFeePolicyProps {
  NetworkFeePolicySettings: typeof Root;
}

export type NetworkFeePolicySettingsGroupParamsList = {
  NetworkFeePolicy: undefined;
};

export enum NetworkFeePolicySettingsScreens {
  NETWORK_FEE_POLICY = 'NetworkFeePolicy',
}

const NetworkFeePolicySettingsGroup: React.FC<NetworkFeePolicyProps> = ({
  NetworkFeePolicySettings,
}) => {
  const {t} = useTranslation();

  return (
    <NetworkFeePolicySettings.Group
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
