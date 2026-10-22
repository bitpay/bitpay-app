import {SettingsComponent} from '../SettingsRoot';
import React, {useCallback, useLayoutEffect, useRef} from 'react';
import {Alert, Pressable} from 'react-native';
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
import {HeaderTitle, InfoDescription} from '../../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {useNavigation} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {
  setCustomizeNonce,
  setQueuedTransactions,
  setShowTestnetWallets,
  setTssEnabled,
  setUseUnconfirmedFunds,
} from '../../../../store/wallet/wallet.actions';
import {
  selectShowTestnetWallets,
  selectTestnetModeUnlocked,
} from '../../../../store/wallet/utils/testnet';
import {startUpdateAllKeyAndWalletStatus} from '../../../../store/wallet/effects/status/status';

/** Taps on the screen title that unlock the testnet toggle. */
export const TESTNET_UNLOCK_TAP_COUNT = 7;
/** A pause longer than this starts the tap count over. */
const TESTNET_UNLOCK_TAP_WINDOW_MS = 1500;

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
  const isInternalUser = useAppSelector(({APP, BITPAY_ID}) => {
    const user = BITPAY_ID.user[APP.network];
    return !!user?.email?.endsWith('@bitpay.com');
  });
  const showTestnetWallets = useAppSelector(selectShowTestnetWallets);
  const testnetModeUnlocked = useAppSelector(selectTestnetModeUnlocked);
  const navigation = useNavigation();
  const titleTaps = useRef({count: 0, lastTapAt: 0});

  const applyShowTestnetWallets = useCallback(
    (value: boolean) => {
      dispatch(setShowTestnetWallets(value));
      if (value) {
        // Testnet balances may be stale after being hidden; refresh them now.
        dispatch(
          startUpdateAllKeyAndWalletStatus({
            force: true,
            createTokenWalletWithFunds: false,
          }),
        );
      }
    },
    [dispatch],
  );

  const onTitlePress = useCallback(() => {
    if (testnetModeUnlocked) {
      return;
    }
    const now = Date.now();
    const taps = titleTaps.current;
    taps.count =
      now - taps.lastTapAt > TESTNET_UNLOCK_TAP_WINDOW_MS ? 1 : taps.count + 1;
    taps.lastTapAt = now;
    if (taps.count < TESTNET_UNLOCK_TAP_COUNT) {
      return;
    }
    taps.count = 0;
    applyShowTestnetWallets(true);
    dispatch(Analytics.track('Unlocked Testnet Mode'));
    Alert.alert(
      t('Testnet mode unlocked'),
      t(
        'Testnet wallets and networks are now shown. You can turn them off below.',
      ),
    );
  }, [applyShowTestnetWallets, dispatch, t, testnetModeUnlocked]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          testID="settings-crypto-title"
          accessibilityRole="header"
          onPress={onTitlePress}>
          <HeaderTitle>{t('Crypto')}</HeaderTitle>
        </Pressable>
      ),
    });
  }, [navigation, onTitlePress, t]);

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

  const handleToggleShowTestnetWallets = useCallback(
    (value: boolean) => {
      applyShowTestnetWallets(value);
      dispatch(
        Analytics.track('Set Show Testnet Wallets', {
          showTestnetWallets: value,
        }),
      );
    },
    [applyShowTestnetWallets, dispatch],
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
      {testnetModeUnlocked ? (
        <>
          <Hr />
          <Setting activeOpacity={1}>
            <SettingTitle>{t('Show Testnet Wallets')}</SettingTitle>
            <ToggleSwitch
              onChange={handleToggleShowTestnetWallets}
              isEnabled={showTestnetWallets}
            />
          </Setting>
          <Info>
            <InfoTriangle />
            <InfoDescription>
              {t(
                'If enabled, testnet wallets are shown throughout the app and you can create testnet wallets and tokens. Testnet coins have no value. If disabled, testnet wallets are hidden but not deleted.',
              )}
            </InfoDescription>
          </Info>
        </>
      ) : null}
      {isInternalUser ? (
        <>
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
        </>
      ) : null}
    </SettingsComponent>
  );
};

export default Crypto;
