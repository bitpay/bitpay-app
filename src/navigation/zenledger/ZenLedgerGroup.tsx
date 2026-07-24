import React from 'react';
import {t as i18nextT} from 'i18next';
const t = i18nextT as (key: string) => string;
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../components/styled/Text';
import ZenLedgerImport from './screens/ZenLedgerImport';
import ZenLedgerIntro from './screens/ZenLedgerIntro';
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';

interface ZenLedgerProps {
  ZenLedger: typeof Root;
  theme: Theme;
}

export type ZenLedgerGroupParamsList = {
  ZenLedgerRoot: undefined;
  ZenLedgerImport: undefined;
};

export enum ZenLedgerScreens {
  ROOT = 'ZenLedgerRoot',
  ZENLEDGER_IMPORT = 'ZenLedgerImport',
}

const ZenLedgerGroup = ({ZenLedger, theme}: ZenLedgerProps) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <ZenLedger.Group screenOptions={commonOptions}>
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
