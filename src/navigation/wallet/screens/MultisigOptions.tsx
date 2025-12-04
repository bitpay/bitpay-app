import React, {useMemo} from 'react';
import {useNavigation} from '@react-navigation/native';
import {Key} from '../../../store/wallet/wallet.models';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import {useThemeType} from '../../../utils/hooks/useThemeType';
import {useTranslation} from 'react-i18next';
import {useAppDispatch} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {WalletScreens} from '../../../navigation/wallet/WalletGroup';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';

export type MultisigModalType = 'create' | 'join';

export interface MultisigOptionsProps {
  isVisible: boolean;
  modalType?: MultisigModalType | null;
  closeModal: () => void;
  walletKey?: Key;
}

const MultisigOptions = ({
  isVisible,
  modalType,
  closeModal,
  walletKey,
}: MultisigOptionsProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const themeType = useThemeType();

  const isNonTSSKeyFlow = walletKey && !isTSSKey(walletKey) && !modalType;

  const nonTSSOptions: Option[] = useMemo(
    () => [
      {
        title: t('Add Multisig Wallet'),
        description: t(
          'Create a new wallet that requires multiple signatures for transactions',
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Create Multisig Wallet', {
              context: 'AddingOptions',
            }),
          );
          closeModal();
          navigation.navigate('CurrencySelection', {
            context: 'addWalletMultisig',
            key: walletKey!,
          });
        },
      },
      {
        title: t('Join Shared Wallet'),
        description: t(
          'Join an existing multisig wallet using an invitation from another user',
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Join Multisig Wallet', {
              context: 'AddingOptions',
            }),
          );
          closeModal();
          navigation.navigate('JoinMultisig', {key: walletKey});
        },
      },
    ],
    [t, dispatch, navigation, walletKey, closeModal],
  );

  const createOptions: Option[] = useMemo(
    () => [
      {
        title: t('Multisignature Wallet'),
        description: t(
          'Support for Bitcoin, Litecoin, Dogecoin and Bitcoin Cash networks. Each co-signer/device has a unique private key/recovery phrase, and all signatures are recorded directly on the blockchain.',
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Create Multisig Wallet', {
              context: walletKey ? 'AddingOptions' : 'CreationOptions',
            }),
          );
          closeModal();
          navigation.navigate('CurrencySelection', {
            context: 'addWalletMultisig',
            key: walletKey!,
          });
        },
      },
      {
        title: t('Threshold Signature Wallet'),
        description: t(
          'Support for Ethereum (ERC-20) tokens, Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, and XRP. A single private key is split into keyshares across co-signers, combining approvals into one transaction.',
        ),
        subDescription: t(
          "All participants need to be online at the same time to create the wallet and sign transactions. This wallet **can't be imported into other crypto platforms.**",
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Create TSS Wallet', {
              context: walletKey ? 'AddingOptions' : 'CreationOptions',
            }),
          );
          closeModal();
          navigation.navigate('CurrencySelection', {
            context: 'addTSSWalletMultisig',
            key: walletKey!,
          });
        },
      },
    ],
    [t, dispatch, navigation, walletKey, closeModal],
  );

  const joinOptions: Option[] = useMemo(
    () => [
      {
        title: t('Multisignature Wallet'),
        description: t(
          'Support for Bitcoin, Litecoin, Dogecoin and Bitcoin Cash networks. Each co-signer/device has a unique private key/recovery phrase, and all signatures are recorded directly on the blockchain.',
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Join Multisig Wallet', {
              context: walletKey ? 'AddingOptions' : 'CreationOptions',
            }),
          );
          closeModal();
          navigation.navigate('JoinMultisig', {key: walletKey});
        },
      },
      {
        title: t('Threshold Signature Wallet'),
        description: t(
          'Support for Ethereum (ERC-20) tokens, Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, and XRP. A single private key is split into keyshares across co-signers, combining approvals into one transaction.',
        ),
        subDescription: t(
          "All participants need to be online at the same time to create the wallet and sign transactions. This wallet **can't be imported into other crypto platforms.**",
        ),
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Join TSS Wallet', {
              context: walletKey ? 'AddingOptions' : 'CreationOptions',
            }),
          );
          closeModal();
          navigation.navigate(WalletScreens.JOIN_TSS_WALLET, {});
        },
      },
    ],
    [t, dispatch, navigation, walletKey, closeModal],
  );

  const getOptions = () => {
    if (isNonTSSKeyFlow) {
      return nonTSSOptions;
    }
    return modalType === 'create' ? createOptions : joinOptions;
  };

  const getTitle = () => {
    if (isNonTSSKeyFlow) {
      return t('What would you like to do?');
    }
    return t('What type of shared wallet?');
  };

  return (
    <OptionsSheet
      isVisible={isVisible}
      title={getTitle()}
      options={getOptions()}
      closeModal={closeModal}
    />
  );
};

export default MultisigOptions;
