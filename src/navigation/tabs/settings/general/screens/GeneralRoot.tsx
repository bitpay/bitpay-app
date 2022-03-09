import React from 'react';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import Button from '../../../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {RootState} from '../../../../../store';
import {
  ActiveOpacity,
  Hr,
  Info,
  InfoTriangle,
  Setting,
  SettingTitle,
} from '../../../../../components/styled/Containers';
import AngleRight from '../../../../../../assets/img/angle-right.svg';
import {useTranslation} from 'react-i18next';
import ToggleSwitch from '../../../../../components/toggle-switch/ToggleSwitch';
import {InfoDescription} from '../../../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {AppActions} from '../../../../../store/app';
import {WalletActions} from '../../../../../store/wallet';
import {showBottomNotificationModal} from '../../../../../store/app/app.actions';
import {resetAllSettings} from '../../../../../store/app/app.effects';
import {sleep} from '../../../../../utils/helper-methods';
const GeneralSettingsRoot: React.FC = () => {
  const navigation = useNavigation();
  const colorScheme = useAppSelector(({APP}: RootState) => APP.colorScheme);
  const showPortfolioValue = useAppSelector(
    ({APP}: RootState) => APP.showPortfolioValue,
  );
  const useUnconfirmedFunds = useAppSelector(
    ({WALLET}: RootState) => WALLET.useUnconfirmedFunds,
  );
  const dispatch = useAppDispatch();
  const {t} = useTranslation();

  return (
    <SettingsContainer>
      <Settings>
        <Hr />
        {/*----------------------------------------------------------------------*/}
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
          onPress={
            () => null // Todo
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
                title: 'Reset all settings',
                message: 'Are you sure you want to reset all settings?',
                enableBackdropDismiss: true,
                actions: [
                  {
                    text: 'RESET',
                    action: async () => {
                      dispatch(resetAllSettings());
                      await sleep(400);
                      dispatch(
                        showBottomNotificationModal({
                          type: 'success',
                          title: 'Reset complete',
                          message: 'All settings have been reset.',
                          enableBackdropDismiss: true,
                          actions: [
                            {
                              text: 'OK',
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
                    text: 'CANCEL',
                    action: () => {},
                    primary: true,
                  },
                ],
              }),
            )
          }>
          <SettingTitle>{t('Reset All Settings')}</SettingTitle>
        </Setting>
        <Hr />
        {/*----------------------------------------------------------------------*/}
        <Setting activeOpacity={1}>
          <SettingTitle>{t('Use Unconfirmed Funds')}</SettingTitle>
          <ToggleSwitch
            onChange={value =>
              dispatch(WalletActions.setUseUnconfirmedFunds(value))
            }
            isEnabled={useUnconfirmedFunds}
          />
        </Setting>
        <Info>
          <InfoTriangle />
          <InfoDescription>
            If enabled, wallets will also try to spend unconfirmed funds.
            However, unconfirmed funds are not allowed for spending with
            merchants, BitPay Card loads, or BitPay in-app gift card purchases.
          </InfoDescription>
        </Info>
      </Settings>
    </SettingsContainer>
  );
};

export default GeneralSettingsRoot;
