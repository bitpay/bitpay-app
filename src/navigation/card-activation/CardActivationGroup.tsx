import React from 'react';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import ActivateScreen, {
  ActivateScreenParamList,
} from './screens/ActivateScreen';
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';
import {Root} from '../../Root';
import {baseNavigatorOptions} from '../../constants/NavigationOptions';
import HeaderBackButton from '../../components/back/HeaderBackButton';

interface CardActivationProps {
  CardActivation: typeof Root;
}

export type CardActivationGroupParamList = {
  CardActivate: ActivateScreenParamList;
  CardComplete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ACTIVATE = 'CardActivate',
  COMPLETE = 'CardComplete',
}

const CardActivationGroup: React.FC<CardActivationProps> = ({
  CardActivation,
}) => {
  const {t} = useTranslation();
  return (
    <CardActivation.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
      })}>
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
