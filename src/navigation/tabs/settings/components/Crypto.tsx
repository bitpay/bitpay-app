import {Settings} from '../SettingsRoot';
import React from 'react';
import {
  InfoTriangle,
  Info,
  Setting,
  SettingTitle,
  Hr,
  ActiveOpacity,
} from '../../../../components/styled/Containers';
import ToggleSwitch from '../../../../components/toggle-switch/ToggleSwitch';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {InfoDescription} from '../../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {WalletActions} from '../../../../store/wallet';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {useNavigation} from '@react-navigation/native';

const Crypto = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const useUnconfirmedFunds = useAppSelector(
    ({WALLET}) => WALLET.useUnconfirmedFunds,
  );
  const navigation = useNavigation();

  return (
    <Settings>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('Settings', {screen: 'NetworkFeePolicy'})
        }>
        <SettingTitle>{t('Network Fee Policy')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
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
          If enabled, wallets will also try to spend unconfirmed funds. However,
          unconfirmed funds are not allowed for spending with merchants, BitPay
          Card loads, or BitPay in-app gift card purchases.
        </InfoDescription>
      </Info>
    </Settings>
  );
};

export default Crypto;
