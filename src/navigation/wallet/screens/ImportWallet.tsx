import React from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import RecoveryPhrase from '../components/RecoveryPhrase';
import FileOrText from '../components/FileOrText';
import {ScreenOptions} from '../../../styles/tabNavigator';

const ImportWallerContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

const ImportWallet = () => {
  const Tab = createMaterialTopTabNavigator();

  return (
    <ImportWallerContainer>
      <Tab.Navigator screenOptions={ScreenOptions(150)}>
        <Tab.Screen name="Recovery Phrase" component={RecoveryPhrase} />
        <Tab.Screen name="File/Text" component={FileOrText} />
      </Tab.Navigator>
    </ImportWallerContainer>
  );
};

export default ImportWallet;
