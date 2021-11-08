import {NavigationProp, useNavigation} from '@react-navigation/core';
import React from 'react';
import {Text, View} from 'react-native';
import {SettingsStackParamList} from './SettingsStack';

const SettingsIndex: React.FC = () => {
  const navigation = useNavigation<NavigationProp<SettingsStackParamList>>();

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Text>Settings!</Text>
      <Text onPress={() => navigation.navigate('SessionLog')}>Session Log</Text>
    </View>
  );
};

export default SettingsIndex;
