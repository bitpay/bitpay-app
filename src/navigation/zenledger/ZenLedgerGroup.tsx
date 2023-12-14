import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import ZenLedgerImport from './screens/ZenLedgerImport';
import ZenLedgerIntro from './screens/ZenLedgerIntro';
import {Root} from '../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';

interface ZenLedgerProps {
  ZenLedger: typeof Root;
}

export type ZenLedgerGroupParamsList = {
  ZenLedgerRoot: undefined;
  ZenLedgerImport: undefined;
};

export enum ZenLedgerScreens {
  ROOT = 'ZenLedgerRoot',
  ZENLEDGER_IMPORT = 'ZenLedgerImport',
}

const ZenLedgerGroup: React.FC<ZenLedgerProps> = ({ZenLedger}) => {
  const {t} = useTranslation();
  return (
    <ZenLedger.Group
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
      <ZenLedger.Screen
        name={ZenLedgerScreens.ROOT}
        component={ZenLedgerIntro}
      />
      <ZenLedger.Screen
        name={ZenLedgerScreens.ZENLEDGER_IMPORT}
        component={ZenLedgerImport}
        options={{
          headerTitle: () => <HeaderTitle>{t('ZenLedger')}</HeaderTitle>,
        }}
      />
    </ZenLedger.Group>
  );
};

export default ZenLedgerGroup;
