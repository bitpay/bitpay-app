import React, {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ColorSchemeName, Pressable, View} from 'react-native';
import {useTheme} from 'styled-components/native';
import Checkbox from '../../../../../components/checkbox/Checkbox';
import {
  Hr,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import {RootState} from '../../../../../store';
import {AppActions} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import {HeaderTitle} from '../../../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {Network} from '../../../../../constants';
import {
  networkChanged,
  showBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {sleep} from '../../../../../utils/helper-methods';
import RNRestart from 'react-native-restart';
import {Analytics} from '../../../../../store/analytics/analytics.effects';

const ThemeSettings: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector(({APP}: RootState) => APP.colorScheme);
  const navigation = useNavigation();
  const [clickCount, setClickCount] = useState(0);
  const network = useAppSelector(({APP}) => APP.network);

  const onPressTitle = () => {
    const _clickCount = clickCount + 1;
    setClickCount(_clickCount);
    if (_clickCount >= 10) {
      const changeNetwork =
        network === Network.mainnet ? Network.testnet : Network.mainnet;

      dispatch(
        showBottomNotificationModal({
          type: 'info',
          title: `${
            network === Network.testnet ? 'Disable' : 'Enable'
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
    setSelected(setScheme);
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
  const [selected, setSelected] = useState(currentTheme);
  const selectedTheme = useTheme();
  const textStyle = {color: selectedTheme.colors.text};

  const SETTINGS: {title: string; theme: ColorSchemeName}[] = [
    {title: t('Light Mode'), theme: 'light'},
    {title: t('Dark Mode'), theme: 'dark'},
    {title: t('System Default'), theme: null},
  ];

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {SETTINGS.map(({title, theme}) => {
          return (
            <View key={theme}>
              <Setting onPress={() => onSetThemePress(theme)}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
                <Checkbox
                  radio={true}
                  onPress={() => onSetThemePress(theme)}
                  checked={selected === theme}
                />
              </Setting>
              <Hr />
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default ThemeSettings;
