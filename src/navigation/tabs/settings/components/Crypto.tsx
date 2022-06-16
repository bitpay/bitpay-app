import {SettingsComponent} from '../SettingsRoot';
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
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);
  const enableReplaceByFee = useAppSelector(
    ({WALLET}) => WALLET.enableReplaceByFee,
  );
  const navigation = useNavigation();

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() =>
          navigation.navigate('Tabs', {
            screen: 'Settings',
            params: {screen: 'NetworkFeePolicy'},
          })
        }>
        <SettingTitle>{t('Network Fee Policies')}</SettingTitle>
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
          {t(
            'If enabled, wallets will also try to spend unconfirmed funds. However, unconfirmed funds are not allowed for spending with merchants, BitPay Card loads, or BitPay in-app gift card purchases.',
          )}
        </InfoDescription>
      </Info>
      <Hr />
      <Setting activeOpacity={1}>
        <SettingTitle>{t('Customize ETH Nonce')}</SettingTitle>
        <ToggleSwitch
          onChange={value => dispatch(WalletActions.setCustomizeNonce(value))}
          isEnabled={customizeNonce}
        />
      </Setting>
      <Info>
        <InfoTriangle />
        <InfoDescription>
          {t(
            'If enabled, the transaction nonce could be changed on the confirm view. This is an advanced feature, use cautiously.',
          )}
        </InfoDescription>
      </Info>
      <Hr />
      <Setting activeOpacity={1}>
        <SettingTitle>{t('Enable BTC Replace-By-Fee')}</SettingTitle>
        <ToggleSwitch
          onChange={value =>
            dispatch(WalletActions.setEnableReplaceByFee(value))
          }
          isEnabled={enableReplaceByFee}
        />
      </Setting>
      <Info>
        <InfoTriangle />
        <InfoDescription>
          {t(
            'If enabled, your transactions will be marked as non-final, and you will have the possibility, while they are unconfirmed, to replace them with transactions that pay higher fees. Note that some merchants do not accept non-final transactions until they are confirmed.',
          )}
        </InfoDescription>
      </Info>
    </SettingsComponent>
  );
};

export default Crypto;
