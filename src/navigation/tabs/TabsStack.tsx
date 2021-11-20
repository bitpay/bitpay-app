import React, {useState} from 'react';
import {
  BottomTabNavigationProp,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {TouchableOpacity, Button} from 'react-native';
import {useNavigation, NavigatorScreenParams} from '@react-navigation/native';

import HomeRoot from './home/HomeStack';
import WalletRoot from './wallet/WalletStack';
import CardRoot from './card/CardStack';
import SettingsRoot, {SettingsStackParamList} from './settings/SettingsStack';

import {SvgProps} from 'react-native-svg';
import HomeIcon from '../../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../../assets/img/tab-icons/home-focused.svg';
import WalletIcon from '../../../assets/img/tab-icons/wallet.svg';
import WalletFocusedIcon from '../../../assets/img/tab-icons/wallet-focused.svg';
import CardIcon from '../../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../../assets/img/tab-icons/settings-focused.svg';
import TransactButtonIcon from '../../../assets/img/tab-icons/transact-button.svg';

import styled from 'styled-components/native';
import {BaseText} from '../../components/styled/Text';
import BottomPopupModal from '../../components/modal/base/bottom-popup/BottomPopupModal';
import {useAndroidBackHandler} from 'react-navigation-backhandler';

const TransactButton = styled.View`
  justify-content: center;
  align-items: center;
  flex: 1;
`;

const TransactModalContainer = styled.View`
  padding: 22px;
  min-height: 300px;
  background: white;
  justify-content: center;
  align-items: center;
  border-top-left-radius: 17px;
  border-top-right-radius: 17px;
`;

const Icons: {[key: string]: React.FC<SvgProps>} = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Wallet: WalletIcon,
  WalletFocused: WalletFocusedIcon,
  Card: CardIcon,
  CardFocused: CardFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
  TransactButton: TransactButtonIcon,
};

export enum TabsScreens {
  HOME = 'Home',
  WALLET = 'Wallet',
  TRANSACT_BUTTON = 'TransactButton',
  CARD = 'Card',
  SETTINGS = 'Settings',
}

export type TabsStackParamList = {
  Home: undefined;
  Wallet: undefined;
  TransactButton: undefined;
  Card: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<TabsStackParamList>();

const TabsStack = () => {
  useAndroidBackHandler(() => true);
  const TransactionButton = () => null;
  return (
    <Tab.Navigator
      initialRouteName={TabsScreens.HOME}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarShowLabel: false,
        lazy: true,
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;

          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];

          return <Icon />;
        },
      })}>
      <Tab.Screen name={TabsScreens.HOME} component={HomeRoot} />
      <Tab.Screen name={TabsScreens.WALLET} component={WalletRoot} />
      <Tab.Screen
        name={TabsScreens.TRANSACT_BUTTON}
        component={TransactionButton}
        options={{tabBarButton: () => <TransactModal />}}
      />
      <Tab.Screen name={TabsScreens.CARD} component={CardRoot} />
      <Tab.Screen name={TabsScreens.SETTINGS} component={SettingsRoot} />
    </Tab.Navigator>
  );
};

const TransactModal = () => {
  const navigation =
    useNavigation<BottomTabNavigationProp<TabsStackParamList>>();
  const [modalVisible, setModalVisible] = useState(false);
  const hideModal = () => setModalVisible(false);
  const showModal = () => setModalVisible(true);

  return (
    <>
      <TransactButton>
        <TouchableOpacity onPress={showModal}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </TransactButton>
      <>
        <BottomPopupModal isVisible={modalVisible} onBackdropPress={hideModal}>
          <TransactModalContainer>
            <BaseText>Transact Button Menu</BaseText>
            <Button
              title="Go to Settings"
              onPress={() => {
                navigation.navigate(TabsScreens.SETTINGS);
                hideModal();
              }}
            />
            <Button
              title="Go to Card"
              onPress={() => {
                navigation.navigate(TabsScreens.CARD);
                hideModal();
              }}
            />
            <Button title="close" onPress={hideModal} />
          </TransactModalContainer>
        </BottomPopupModal>
      </>
    </>
  );
};

export default TabsStack;
