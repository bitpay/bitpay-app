import React from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import RecoveryPhrase from '../components/RecoveryPhrase';
import FileOrText from '../components/FileOrText';
import {Action, Black, White} from '../../../styles/colors';
const ImportWallerContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

const ImportWallet = () => {
  const Tab = createMaterialTopTabNavigator();

  return (
    <ImportWallerContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarIndicatorStyle: {
            height: 48,
            borderRadius: 50,
            backgroundColor: Action,
          },
          tabBarActiveTintColor: White,
          tabBarInactiveTintColor: Black,
          tabBarItemStyle: {width: 145, height: 48},
          tabBarLabelStyle: {
            fontSize: 15,
            textTransform: 'capitalize',
            fontWeight: '500',
          },
          tabBarStyle: {
            borderWidth: 5,
            width: 300,
            alignSelf: 'center',
            borderRadius: 40,
            backgroundColor: '#f2f2f2',
            borderColor: '#f2f2f2',
          },
        }}>
        <Tab.Screen name="Recovery Phrase" component={RecoveryPhrase} />
        <Tab.Screen name="File/Text" component={FileOrText} />
      </Tab.Navigator>
    </ImportWallerContainer>
  );
};

export default ImportWallet;
