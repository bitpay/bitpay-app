import React from 'react';
import {Theme} from '@react-navigation/native';
import {t as i18nextT} from 'i18next';
const t = i18nextT as (key: string) => string;
import PasskeyScreen from './screens/Passkeys';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle} from '@components/styled/Text';
import SecurityHome from './screens/SecurityHome';
import VerifyIdentityScreen from '../../../bitpay-id/screens/VerifyIdentity';

interface SecurityProps {
  Security: typeof Root;
  theme: Theme;
}

export type SecurityGroupParamList = {
  Home: undefined;
  Passkeys: undefined;
};

export enum SecurityScreens {
  HOME = 'Home',
  PASSKEYS = 'Passkeys',
  KYC_VERIFICATION = 'KycVerification',
}

const SecurityGroup = ({Security, theme}: SecurityProps) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <Security.Group screenOptions={commonOptions}>
      <Security.Screen
        name={SecurityScreens.HOME}
        component={SecurityHome}
        options={{
          headerTitle: () => <HeaderTitle>{t('Security')}</HeaderTitle>,
        }}
      />
      <Security.Screen
        name={SecurityScreens.PASSKEYS}
        component={PasskeyScreen}
        options={{
          headerTitle: () => <HeaderTitle>Passkeys</HeaderTitle>,
        }}
      />
      <Security.Screen
        name={SecurityScreens.KYC_VERIFICATION}
        component={VerifyIdentityScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Verify Identity')}</HeaderTitle>,
        }}
      />
    </Security.Group>
  );
};

export default SecurityGroup;
