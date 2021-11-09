import {NavigationProp, useNavigation} from '@react-navigation/core';
import { useTheme } from '@react-navigation/native';
import React from 'react';
import {Button, Text, View} from 'react-native';
import {SettingsScreens, SettingsStackParamList} from './SettingsStack';

const SettingsIndex: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();
  const theme = useTheme();
  const textStyle = { color: theme.colors.text };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={textStyle}>Settings!</Text>
      <Button title="Theme" onPress={() => navigation.navigate(SettingsScreens.THEME)} />
      <Button title="Session Log" onPress={() => navigation.navigate(SettingsScreens.SESSION_LOG)} />
    </View>
  );
};

export default SettingsIndex;
