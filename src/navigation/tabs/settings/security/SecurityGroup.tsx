import React from 'react';
import {Theme} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import PasskeyScreen from './screens/Passkeys';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle} from '@components/styled/Text';
import SecurityHome from './screens/SecurityHome';

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
}

const SecurityGroup = ({Security, theme}: SecurityProps) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
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
    </Security.Group>
  );
};

export default SecurityGroup;
