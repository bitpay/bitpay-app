import {SettingsComponent} from '../SettingsRoot';
import React, {useState} from 'react';
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
import {Analytics} from '../../../../store/analytics/analytics.effects';

const Crypto = () => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const useUnconfirmedFunds = useAppSelector(
    ({WALLET}) => WALLET.useUnconfirmedFunds,
  );
  const customizeNonce = useAppSelector(({WALLET}) => WALLET.customizeNonce);
  const queuedTransactions = useAppSelector(
    ({WALLET}) => WALLET.queuedTransactions,
  );
  const enableReplaceByFee = useAppSelector(
    ({WALLET}) => WALLET.enableReplaceByFee,
  );
  const [showInfoUnconfirmed, setShowInfoUnconfirmed] = useState(false);
  const [showInfoCustomizeEvm, setShowInfoCustomizeEvm] = useState(false);
  const [showInfoEthQueued, setShowInfoEthQueued] = useState(false);
  const [showInfoEnableRbf, setShowInfoEnableRbf] = useState(false);
  const navigation = useNavigation();

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() => navigation.navigate('NetworkFeePolicy')}>
        <SettingTitle>{t('Network Fee Policies')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting
        activeOpacity={1}
        onPress={() => setShowInfoUnconfirmed(!showInfoUnconfirmed)}>
        <SettingTitle>{t('Use Unconfirmed Funds')}</SettingTitle>
        <ToggleSwitch
          onChange={value => {
            dispatch(WalletActions.setUseUnconfirmedFunds(value));
            dispatch(
              Analytics.track('Set Use Unconfirmed Funds', {
                value,
              }),
            );
          }}
          isEnabled={useUnconfirmedFunds}
        />
      </Setting>
      {showInfoUnconfirmed ? (
        <Info>
          <InfoTriangle />
          <InfoDescription>
            {t(
              'If enabled, wallets will also try to spend unconfirmed funds. However, unconfirmed funds are not allowed for spending with merchants, BitPay Card loads, or BitPay in-app gift card purchases.',
            )}
          </InfoDescription>
        </Info>
      ) : null}
      <Hr />
      <Setting
        activeOpacity={1}
        onPress={() => setShowInfoCustomizeEvm(!showInfoCustomizeEvm)}>
        <SettingTitle>{t('Customize EVM Nonce')}</SettingTitle>
        <ToggleSwitch
          onChange={value => {
            dispatch(WalletActions.setCustomizeNonce(value));
            dispatch(
              Analytics.track('Set Customize EVM Nonce', {
                value,
              }),
            );
          }}
          isEnabled={customizeNonce}
        />
      </Setting>
      {showInfoCustomizeEvm ? (
        <Info>
          <InfoTriangle />
          <InfoDescription>
            {t(
              'If enabled, the transaction nonce could be changed on the confirm view. This is an advanced feature, use cautiously.',
            )}
          </InfoDescription>
        </Info>
      ) : null}
      <Hr />
      <Setting
        activeOpacity={1}
        onPress={() => setShowInfoEthQueued(!showInfoEthQueued)}>
        <SettingTitle>{t('ETH Queued transactions')}</SettingTitle>
        <ToggleSwitch
          onChange={value =>
            dispatch(WalletActions.setQueuedTransactions(value))
          }
          isEnabled={queuedTransactions}
        />
      </Setting>
      {showInfoEthQueued ? (
        <Info>
          <InfoTriangle />
          <InfoDescription>
            {t(
              'If enabled, your eth transactions will be queued if there is a pending transaction with a lower account nonce. This is an advanced feature, use cautiously.',
            )}
          </InfoDescription>
        </Info>
      ) : null}
      <Hr />
      <Setting
        activeOpacity={1}
        onPress={() => setShowInfoEnableRbf(!showInfoEnableRbf)}>
        <SettingTitle>{t('Enable BTC Replace-By-Fee')}</SettingTitle>
        <ToggleSwitch
          onChange={value => {
            dispatch(WalletActions.setEnableReplaceByFee(value));
            dispatch(
              Analytics.track('Set Enable BTC Replace-By-Fee', {
                value,
              }),
            );
          }}
          isEnabled={enableReplaceByFee}
        />
      </Setting>
      {showInfoEnableRbf ? (
        <Info>
          <InfoTriangle />
          <InfoDescription>
            {t(
              'If enabled, your transactions will be marked as non-final, and you will have the possibility, while they are unconfirmed, to replace them with transactions that pay higher fees. Note that some merchants do not accept non-final transactions until they are confirmed.',
            )}
          </InfoDescription>
        </Info>
      ) : null}
    </SettingsComponent>
  );
};

export default Crypto;
