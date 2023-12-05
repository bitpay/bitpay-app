import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HeaderBackButton} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import {HeaderTitle} from '../../components/styled/Text';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../constants/NavigationOptions';
import ActivateScreen, {
  ActivateScreenParamList,
} from './screens/ActivateScreen';
import CompleteScreen, {
  CompleteScreenParamList,
} from './screens/CompleteScreen';

export type CardActivationStackParamList = {
  Activate: ActivateScreenParamList;
  Complete: CompleteScreenParamList;
};

export enum CardActivationScreens {
  ACTIVATE = 'Activate',
  COMPLETE = 'Complete',
}

const CardActivation =
  createNativeStackNavigator<CardActivationStackParamList>();

const CardActivationStack: React.FC = () => {
  const {t} = useTranslation();
  return (
    <CardActivation.Navigator
      initialRouteName={CardActivationScreens.ACTIVATE}
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
    </CardActivation.Navigator>
  );
};

export default CardActivationStack;
