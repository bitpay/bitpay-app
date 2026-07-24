import React, {useLayoutEffect} from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import RecoveryPhrase from '../components/RecoveryPhrase';
import FileOrText from '../components/FileOrText';
import {HeaderTitle} from '../../../components/styled/Text';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import CustomTabBar from '../../../components/custom-tab-bar/CustomTabBar';

type ImportScreenProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.IMPORT
>;

export interface ImportParamList {
  context?: string;
  keyId?: string;
  importQrCodeData?: string;
}

const styles = StyleSheet.create({
  importContainer: {
    flex: 1,
    marginTop: 10,
  },
});

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
    <SafeAreaView style={styles.importContainer} testID="import-view">
      <Tab.Navigator tabBar={props => <CustomTabBar {...props} />}>
        <Tab.Screen
          name={t('Phrase')}
          component={RecoveryPhrase}
          initialParams={route.params}
        />
        <Tab.Screen
          name={t('File')}
          component={FileOrText}
          initialParams={route.params}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default Import;
