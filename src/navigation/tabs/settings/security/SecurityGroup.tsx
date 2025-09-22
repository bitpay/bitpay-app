import React from 'react';
import {Theme} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import PasskeyScreen from './screens/Passkeys';
import {Root} from '../../../../Root';
import {useStackScreenOptions} from '../../../utils/headerHelpers';

interface SecurityProps {
  Security: typeof Root;
  theme: Theme;
}

export type SecurityGroupParamList = {
  Passkeys: undefined;
};

export enum SecurityScreens {
  PASSKEYS = 'Passkeys',
}

const SecurityGroup: React.FC<SecurityProps> = ({Security, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  return (
    <Security.Group screenOptions={commonOptions}>
      <Security.Screen
        name={SecurityScreens.PASSKEYS}
        component={PasskeyScreen}
        options={{
          headerTitle: t('Storage Usage'),
        }}
      />
    </Security.Group>
  );
};

export default SecurityGroup;
