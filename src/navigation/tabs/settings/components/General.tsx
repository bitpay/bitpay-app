import React from 'react';
import Button from '../../../../components/button/Button';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import ToggleSwitch from '../../../../components/toggle-switch/ToggleSwitch';
import {AppActions} from '../../../../store/app';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {resetAllSettings} from '../../../../store/app/app.effects';
import {sleep} from '../../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../../../utils/hooks/useAppSelector';
import {RootState} from '../../../../store';
import {useAppDispatch} from '../../../../utils/hooks/useAppDispatch';
import {useTranslation} from 'react-i18next';
import {SettingsComponent} from '../SettingsRoot';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
const General = () => {
  const navigation = useNavigation();
  const colorScheme = useAppSelector(({APP}: RootState) => APP.colorScheme);
  const showPortfolioValue = useAppSelector(
    ({APP}: RootState) => APP.showPortfolioValue,
  );

  const dispatch = useAppDispatch();
  const {t} = useTranslation();

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('GeneralSettings', {screen: 'Theme'})
        }>
        <SettingTitle>{t('Theme')}</SettingTitle>
        <Button
          buttonType={'pill'}
          onPress={() =>
            navigation.navigate('GeneralSettings', {screen: 'Theme'})
          }>
          {colorScheme === 'light'
            ? 'Light Mode'
            : colorScheme === 'dark'
            ? 'Dark Mode'
            : 'System Default'}
        </Button>
      </Setting>
      <Hr />
      {/*----------------------------------------------------------------------*/}
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('GeneralSettings', {screen: 'CustomizeHome'})
        }>
        <SettingTitle>{t('Customize Home')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
      {/*----------------------------------------------------------------------*/}
      <Setting activeOpacity={1}>
        <SettingTitle>{t('Show Portfolio')}</SettingTitle>
        <ToggleSwitch
          onChange={value => dispatch(AppActions.showPortfolioValue(value))}
          isEnabled={showPortfolioValue}
        />
      </Setting>
      <Hr />
      {/*----------------------------------------------------------------------*/}
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('GeneralSettings', {
            screen: 'AltCurrencySettings',
          })
        }>
        <SettingTitle>{t('Display Currency')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
      {/*----------------------------------------------------------------------*/}
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('GeneralSettings', {screen: 'LanguageSettings'})
        }>
        <SettingTitle>{t('Language')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
      {/*----------------------------------------------------------------------*/}
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          dispatch(
            showBottomNotificationModal({
              type: 'warning',
              title: t('Reset all settings'),
              message: t('Are you sure you want to reset all settings?'),
              enableBackdropDismiss: true,
              actions: [
                {
                  text: t('RESET'),
                  action: async () => {
                    dispatch(resetAllSettings());
                    await sleep(400);
                    dispatch(
                      showBottomNotificationModal({
                        type: 'success',
                        title: t('Reset complete'),
                        message: t('All settings have been reset.'),
                        enableBackdropDismiss: true,
                        actions: [
                          {
                            text: t('OK'),
                            action: () => null,
                            primary: true,
                          },
                        ],
                      }),
                    );
                  },
                  primary: true,
                },
                {
                  text: t('CANCEL'),
                  action: () => {},
                  primary: true,
                },
              ],
            }),
          )
        }>
        <SettingTitle>{t('Reset All Settings')}</SettingTitle>
      </Setting>
    </SettingsComponent>
  );
};

export default General;
