import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigatorScreenParams, useTheme} from '@react-navigation/native';

import HomeRoot from './home/HomeStack';
import SettingsRoot from './settings/SettingsStack';
import {SettingsStackParamList} from './settings/SettingsStack';

import {SvgProps} from 'react-native-svg';
import HomeIcon from '../../../assets/img/tab-icons/home.svg';
import HomeFocusedIcon from '../../../assets/img/tab-icons/home-focused.svg';
import SettingsIcon from '../../../assets/img/tab-icons/settings.svg';
import SettingsFocusedIcon from '../../../assets/img/tab-icons/settings-focused.svg';

const Icons: Record<string, React.FC<SvgProps>> = {
  Home: HomeIcon,
  HomeFocused: HomeFocusedIcon,
  Settings: SettingsIcon,
  SettingsFocused: SettingsFocusedIcon,
};

export enum TabsScreens {
  HOME = 'Home',
  SETTINGS = 'Settings',
}

export type TabsStackParamList = {
  Home: undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<TabsStackParamList>();

const TabsStack = () => {
  const theme = useTheme();
  return (
    <Tab.Navigator
      initialRouteName={TabsScreens.HOME}
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          minHeight: 68,
        },
        tabBarItemStyle: {
          minHeight: 68,
        },
        tabBarShowLabel: false,
        lazy: false,
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
      <Tab.Screen name={TabsScreens.SETTINGS} component={SettingsRoot} />
    </Tab.Navigator>
  );
};

export default TabsStack;
