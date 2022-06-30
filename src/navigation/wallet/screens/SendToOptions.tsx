import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {HeaderTitle} from '../../../components/styled/Text';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {WalletStackParamList} from '../WalletStack';
import SendToAddress from '../components/SendToAddress';
import SendToContact from '../components/SendToContact';
import {Wallet} from '../../../store/wallet/wallet.models';

export type SendToOptionsParamList = {
  title: string;
  wallet: Wallet;
};

const ImportContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

const SendToOptions = () => {
  const {t} = useTranslation();
  const Tab = createMaterialTopTabNavigator();
  const navigation = useNavigation();
  const {params} = useRoute<RouteProp<WalletStackParamList, 'SendToOptions'>>();

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>{params.title}</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation, t]);

  return (
    <ImportContainer>
      <Tab.Navigator screenOptions={{...ScreenOptions(150)}}>
        <Tab.Screen
          name={t('Addresses')}
          component={SendToAddress}
          initialParams={params}
        />
        <Tab.Screen
          name={t('Contacts')}
          component={SendToContact}
          initialParams={params}
        />
      </Tab.Navigator>
    </ImportContainer>
  );
};

export default SendToOptions;
