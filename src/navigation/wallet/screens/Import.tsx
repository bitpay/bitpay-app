import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import RecoveryPhrase from '../components/RecoveryPhrase';
import FileOrText from '../components/FileOrText';
import {ScreenOptions} from '../../../styles/tabNavigator';
import {HeaderTitle} from '../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {WalletStackParamList} from '../WalletStack';
import {StackScreenProps} from '@react-navigation/stack';

type ImportScreenProps = StackScreenProps<WalletStackParamList, 'Import'>;

export interface ImportParamList {
  context?: string;
}

const ImportContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

const Import: React.FC<ImportScreenProps> = ({route}) => {
  const Tab = createMaterialTopTabNavigator();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerTitle: () => <HeaderTitle>Import</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation]);

  return (
    <ImportContainer>
      <Tab.Navigator screenOptions={{...ScreenOptions(150)}}>
        <Tab.Screen
          name="Recovery Phrase"
          component={RecoveryPhrase}
          initialParams={route.params}
        />
        <Tab.Screen name="File/Text" component={FileOrText} />
      </Tab.Navigator>
    </ImportContainer>
  );
};

export default Import;
