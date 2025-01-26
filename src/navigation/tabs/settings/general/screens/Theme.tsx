import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ColorSchemeName, Pressable, View, SafeAreaView} from 'react-native';
import {TEST_MODE_NETWORK} from '@env';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {RootState} from '../../../../../store';
import {AppActions} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import {HeaderTitle} from '../../../../../components/styled/Text';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Network} from '../../../../../constants';
import {
  networkChanged,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {sleep} from '../../../../../utils/helper-methods';
import RNRestart from 'react-native-restart';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {SettingsDetailsParamList} from '../../SettingsDetails';

type Props = NativeStackScreenProps<SettingsDetailsParamList, 'Theme'>;

const ThemeSettings: React.FC<Props> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector(({APP}: RootState) => APP.colorScheme);
  const [clickCount, setClickCount] = useState(0);
  const network = useAppSelector(({APP}) => APP.network);
  const testModeNetwork = TEST_MODE_NETWORK || Network.testnet;

  const onPressTitle = () => {
    const _clickCount = clickCount + 1;
    setClickCount(_clickCount);
    if (_clickCount >= 10) {
      const changeNetwork =
        network === Network.mainnet ? testModeNetwork : Network.mainnet;

      dispatch(
        showBottomNotificationModal({
          type: 'info',
          title: `${
            network === testModeNetwork ? 'Disable' : 'Enable'
          } Test Mode`,
          message:
            'Tap continue to switch networks. Your app will restart to enable the new network.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'CONTINUE',
              primary: true,
              action: async () => {
                dispatch(networkChanged(changeNetwork));
                await sleep(200);
                RNRestart.restart();
              },
            },
            {
              text: 'NEVERMIND',
              action: () => {
                setClickCount(0);
              },
            },
          ],
        }),
      );
    }
  };

  const onPressTitleRef = useRef(onPressTitle);
  onPressTitleRef.current = onPressTitle;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <Pressable onPress={() => onPressTitleRef.current()}>
            <HeaderTitle>{t('Theme')}</HeaderTitle>
          </Pressable>
        );
      },
    });
  }, [navigation, t, onPressTitleRef]);

  const onSetThemePress = (setScheme: ColorSchemeName) => {
    dispatch(AppActions.setColorScheme(setScheme));
    dispatch(
      LogActions.info('Theme updated to ' + (setScheme || 'system default')),
    );
    dispatch(
      Analytics.track('Saved Theme', {
        theme: setScheme || 'system default',
      }),
    );
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <View>
        <Setting onPress={() => onSetThemePress('light')}>
          <SettingTitle>{t('Light Mode')}</SettingTitle>
          <Checkbox radio onPress={() => onSetThemePress('light')} checked={currentTheme === 'light'} />
        </Setting>
        <Hr />
        <Setting onPress={() => onSetThemePress('dark')}>
          <SettingTitle>{t('Dark Mode')}</SettingTitle>
          <Checkbox radio onPress={() => onSetThemePress('dark')} checked={currentTheme === 'dark'} />
        </Setting>
        <Hr />
        <Setting onPress={() => onSetThemePress(null)}>
          <SettingTitle>{t('System Default')}</SettingTitle>
          <Checkbox radio onPress={() => onSetThemePress(null)} checked={currentTheme === null} />
        </Setting>
      </View>
    </SafeAreaView>
  );
};

export default ThemeSettings;
