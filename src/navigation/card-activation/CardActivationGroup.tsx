import React from 'react';
import {t as i18nextT} from 'i18next';
const t = i18nextT as (key: string) => string;
import {Theme} from '@react-navigation/native';
import {HeaderTitle} from '../../components/styled/Text';
import ActivateScreen, {
  ActivateScreenParamList,
} from './screens/ActivateScreen';
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';
import {Root} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';

interface CardActivationProps {
  CardActivation: typeof Root;
  theme: Theme;
}

export type CardActivationGroupParamList = {
  CardActivate: ActivateScreenParamList;
  CardComplete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ACTIVATE = 'CardActivate',
  COMPLETE = 'CardComplete',
}

const CardActivationGroup = ({CardActivation, theme}: CardActivationProps) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <CardActivation.Group screenOptions={commonOptions}>
      <CardActivation.Screen
        name={CardActivationScreens.ACTIVATE}
        component={ActivateScreen}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Activate BitPay Card')}</HeaderTitle>
          ),
        }}
      />
      <CardActivation.Screen
        name={CardActivationScreens.COMPLETE}
        component={CompleteScreen}
        options={{
          headerShown: false,
        }}
      />
    </CardActivation.Group>
  );
};

export default CardActivationGroup;
