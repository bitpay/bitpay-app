import React, {useLayoutEffect} from 'react';
import styled from 'styled-components/native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import RecoveryPhrase from '../components/RecoveryPhrase';
import FileOrText from '../components/FileOrText';
import {HeaderTitle} from '../../../components/styled/Text';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import CustomTabBar from '../../../components/custom-tab-bar/CustomTabBar';
import {Platform} from 'react-native';

type ImportScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.IMPORT
>;

export interface ImportParamList {
  context?: string;
  keyId?: string;
  importQrCodeData?: string;
}

const ImportContainer = styled.SafeAreaView`
  flex: 1;
  margin-top: 10px;
`;

const Import: React.FC<ImportScreenProps> = ({navigation, route}) => {
  const {t} = useTranslation();
  const Tab = createMaterialTopTabNavigator();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Import')}</HeaderTitle>,
      headerTitleAlign: 'center',
    });
  }, [navigation, t]);

  return (
    <ImportContainer accessibilityLabel="import-view">
      <Tab.Navigator tabBar={props => <CustomTabBar {...props} />}>
        <Tab.Screen
          name={t('Phrase')}
          component={RecoveryPhrase}
          initialParams={route.params}
        />
        <Tab.Screen
          name={t('Plain Text')}
          component={FileOrText}
          initialParams={route.params}
        />
      </Tab.Navigator>
    </ImportContainer>
  );
};

export default Import;
