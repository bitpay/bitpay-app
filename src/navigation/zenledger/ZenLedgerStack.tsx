import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../constants/NavigationOptions';
import ZenLedgerImport from './screens/ZenLedgerImport';
import ZenLedgerIntro from './screens/ZenLedgerIntro';

export type ZenLedgerStackParamsList = {
  Root: undefined;
  ZenLedgerImport: undefined;
};

export enum ZenLedgerScreens {
  Root = 'Root',
  ZENLEDGER_IMPORT = 'ZenLedgerImport',
}

const ZenLedger = createStackNavigator<ZenLedgerStackParamsList>();

const ZenLedgerStack = () => {
  const {t} = useTranslation();
  return (
    <ZenLedger.Navigator
      initialRouteName={ZenLedgerScreens.Root}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <ZenLedger.Screen
        name={ZenLedgerScreens.Root}
        component={ZenLedgerIntro}
      />
      <ZenLedger.Screen
        name={ZenLedgerScreens.ZENLEDGER_IMPORT}
        component={ZenLedgerImport}
        options={{
          headerTitle: () => <HeaderTitle>{t('ZenLedger')}</HeaderTitle>,
        }}
      />
    </ZenLedger.Navigator>
  );
};

export default ZenLedgerStack;
