import {SettingsComponent} from '../SettingsRoot';
import React, {useCallback} from 'react';
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
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {useNavigation} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {
  setCustomizeNonce,
  setQueuedTransactions,
  setTssEnabled,
  setUseUnconfirmedFunds,
} from '../../../../store/wallet/wallet.actions';

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
  const tssEnabled = useAppSelector(({WALLET}) => WALLET.tssEnabled);
  const navigation = useNavigation();

  const handleToggleUnconfirmedFunds = useCallback(
    (value: boolean) => {
      dispatch(setUseUnconfirmedFunds(value));
      dispatch(
        Analytics.track('Set Use Unconfirmed Funds', {
          useUnconfirmedFunds: value,
        }),
      );
    },
    [dispatch],
  );

  const handleToggleCustomizeNonce = useCallback(
    (value: boolean) => {
      dispatch(setCustomizeNonce(value));
      dispatch(
        Analytics.track('Set Customize Nonce', {
          customizeNonce: value,
        }),
      );
    },
    [dispatch],
  );

  const handleToggleQueuedTransactions = useCallback(
    (value: boolean) => {
      dispatch(setQueuedTransactions(value));
      dispatch(
        Analytics.track('Set Queued Transactions', {
          queuedTransactions: value,
        }),
      );
    },
    [dispatch],
  );

  const handleToggleTssEnabled = useCallback(
    (value: boolean) => {
      dispatch(setTssEnabled(value));
      dispatch(
        Analytics.track('Set TSS Enabled', {
          tssEnabled: value,
        }),
      );
    },
    [dispatch],
  );

  return (
    <SettingsComponent>
      <Setting
        activeOpacity={ActiveOpacity}
        onPress={() => navigation.navigate('NetworkFeePolicy')}>
        <SettingTitle>{t('Network Fee Policies')}</SettingTitle>
        <AngleRight />
      </Setting>
      <Hr />
      <Setting activeOpacity={1}>
        <SettingTitle>{t('Use Unconfirmed Funds')}</SettingTitle>
        <ToggleSwitch
          onChange={handleToggleUnconfirmedFunds}
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
        <SettingTitle>{t('Customize Nonce')}</SettingTitle>
        <ToggleSwitch
          onChange={handleToggleCustomizeNonce}
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
        <SettingTitle>{t('ETH Queued transactions')}</SettingTitle>
        <ToggleSwitch
          onChange={handleToggleQueuedTransactions}
          isEnabled={queuedTransactions}
        />
      </Setting>
      <Info>
        <InfoTriangle />
        <InfoDescription>
          {t(
            'If enabled, your eth transactions will be queued if there is a pending transaction with a lower account nonce. This is an advanced feature, use cautiously.',
          )}
        </InfoDescription>
      </Info>
      <Hr />
      <Setting activeOpacity={1}>
        <SettingTitle>{t('Enable TSS Wallets')}</SettingTitle>
        <ToggleSwitch
          onChange={handleToggleTssEnabled}
          isEnabled={tssEnabled}
        />
      </Setting>
      <Info>
        <InfoTriangle />
        <InfoDescription>
          {t(
            'If enabled, you will be able to create and join TSS (Threshold Signature Scheme) wallets. This is an experimental feature.',
          )}
        </InfoDescription>
      </Info>
    </SettingsComponent>
  );
};

export default Crypto;
