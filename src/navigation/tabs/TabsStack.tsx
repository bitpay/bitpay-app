import React, {useState} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import HomeRoot from './Home/HomeStack';
import WalletRoot from './Wallet/WalletStack';
import CardRoot from './Card/CardStack';
import SettingsRoot from './Settings/SettingsStack';

import HomeIcon from '../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../assets/img/tab-icons/home-focused.svg';
import WalletIcon from '../../assets/img/tab-icons/wallet.svg';
import WalletFocusedIcon from '../../assets/img/tab-icons/wallet-focused.svg';
import CardIcon from '../../assets/img/tab-icons/card.svg';
import CardFocusedIcon from '../../assets/img/tab-icons/card-focused.svg';
import SettingsIcon from '../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../assets/img/tab-icons/settings-focused.svg';
import TransactButtonIcon from '../../assets/img/tab-icons/transact-button.svg';

import {SvgProps} from 'react-native-svg';
import {StyleSheet, View, Text, TouchableOpacity, Button} from 'react-native';
import Modal from 'react-native-modal';
import {useNavigation} from '@react-navigation/native';

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

const Tab = createBottomTabNavigator();

const TransactModal = () => {
  const navigation = useNavigation();

  console.log(navigation);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <View style={styles.transactButton}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <TransactButtonIcon />
        </TouchableOpacity>
      </View>
      <View>
        <Modal
          backdropOpacity={0.3}
          isVisible={modalVisible}
          backdropTransitionOutTiming={0}
          onBackdropPress={() => setModalVisible(false)}
          style={styles.contentView}>
          <View style={styles.content}>
            <Text>Transact Button Menu</Text>
            <Button
              title="Go to Settings"
              onPress={() => {
                navigation.navigate('Settings');
                setModalVisible(false);
              }}
            />
            <Button
              title="Go to Card"
              onPress={() => {
                navigation.navigate('Card');
                setModalVisible(false);
              }}
            />
            <Button title="close" onPress={() => setModalVisible(false)} />
          </View>
        </Modal>
      </View>
    </>
  );
};

const TransactionButton = () => null;

const TabsStack = () => {
  return (
    <Tab.Navigator
      tabBarOptions={{showLabel: false}}
      initialRouteName="Home"
      lazy={true}
      screenOptions={({route}) => ({
        tabBarIcon: ({focused}) => {
          let {name: icon} = route;

          if (focused) {
            icon += 'Focused';
          }
          const Icon = Icons[icon];

          return <Icon />;
        },
      })}>
      <Tab.Screen name="Home" component={HomeRoot} />
      <Tab.Screen name="Wallet" component={WalletRoot} />
      <Tab.Screen
        name="TransactButton"
        component={TransactionButton}
        options={{tabBarButton: () => <TransactModal />}}
      />
      <Tab.Screen name="Card" component={CardRoot} />
      <Tab.Screen name="Settings" component={SettingsRoot} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  transactButton: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  content: {
    padding: 22,
    minHeight: 300,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 17,
    borderTopLeftRadius: 17,
  },
  contentTitle: {
    fontSize: 20,
  },
  contentView: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  buttonStyle: {
    height: 90,
    width: 90,
    borderRadius: 100,
  },
});

export default TabsStack;
