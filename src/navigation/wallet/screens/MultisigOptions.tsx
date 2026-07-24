import React, {useMemo, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {Key} from '../../../store/wallet/wallet.models';
import OptionsSheet, {Option} from '../components/OptionsSheet';
import TSSOnboardingModal, {
  TSSOnboardingFlow,
} from '../components/TSSOnboardingModal';
import {useTranslation} from 'react-i18next';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {WalletScreens} from '../../../navigation/wallet/WalletGroup';
import {isTSSKey} from '../../../store/wallet/effects/tss-send/tss-send';
import {setHasViewedTSSOnboarding} from '../../../store/app/app.actions';

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
  const isNonTSSKeyFlow = walletKey && !isTSSKey(walletKey) && !modalType;
  const hasViewedTSSOnboarding = useAppSelector(
    ({APP}) => APP.hasViewedTSSOnboarding,
  );
  const [showTSSOnboarding, setShowTSSOnboarding] = useState(false);
  const [tssOnboardingFlow, setTssOnboardingFlow] =
    useState<TSSOnboardingFlow>('create');
  const tssPageContext = walletKey ? 'AddingOptions' : 'CreationOptions';

  const nonTSSOptions: Option[] = useMemo(
    () => [
      {
        title: t('Add Multisig Wallet'),
        description: t(
          'Create a new wallet that requires multiple signatures for transactions',
        ),
        showChevron: true,
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
        showChevron: true,
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
          'Each co-signer/device has a unique private key/recovery phrase, and all signatures are recorded directly on the blockchain.',
        ),
        cardStyle: true,
        showChevron: true,
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
        title: t('Threshold signature wallet'),
        description: t(
          'A single private key is split into keyshares across co-signers, combining approvals into one transaction.',
        ),
        badge: t('Beta'),
        subDescriptionItems: [
          {icon: 'clock', text: t('Requires all signers online to sign.')},
          {icon: 'warning', text: t('Not portable to other platforms.')},
          {
            icon: 'info',
            text: t('This wallet cannot be modified after creation.'),
          },
        ],
        cardStyle: true,
        showChevron: true,
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Create TSS Wallet', {
              context: tssPageContext,
            }),
          );
          if (hasViewedTSSOnboarding) {
            closeModal();
            navigation.navigate('CurrencySelection', {
              context: 'addTSSWalletMultisig',
              key: walletKey!,
            });
          } else {
            setTssOnboardingFlow('create');
            setShowTSSOnboarding(true);
          }
        },
      },
    ],
    [
      t,
      dispatch,
      navigation,
      walletKey,
      closeModal,
      hasViewedTSSOnboarding,
      tssPageContext,
    ],
  );

  const joinOptions: Option[] = useMemo(
    () => [
      {
        title: t('Multisignature Wallet'),
        description: t(
          'Each co-signer/device has a unique private key/recovery phrase, and all signatures are recorded directly on the blockchain.',
        ),
        cardStyle: true,
        showChevron: true,
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
        title: t('Threshold signature wallet'),
        description: t(
          'A single private key is split into keyshares across co-signers, combining approvals into one transaction.',
        ),
        badge: t('Beta'),
        subDescriptionItems: [
          {icon: 'clock', text: t('Requires all signers online to sign.')},
          {icon: 'warning', text: t('Not portable to other platforms.')},
          {
            icon: 'info',
            text: t('This wallet cannot be modified after creation.'),
          },
        ],
        cardStyle: true,
        showChevron: true,
        onPress: () => {
          dispatch(
            Analytics.track('Clicked Join TSS Wallet', {
              context: tssPageContext,
            }),
          );
          if (hasViewedTSSOnboarding) {
            closeModal();
            navigation.navigate(WalletScreens.JOIN_TSS_WALLET, {});
          } else {
            setTssOnboardingFlow('join');
            setShowTSSOnboarding(true);
          }
        },
      },
    ],
    [
      t,
      dispatch,
      navigation,
      walletKey,
      closeModal,
      hasViewedTSSOnboarding,
      tssPageContext,
    ],
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
    <>
      <OptionsSheet
        isVisible={isVisible}
        title={getTitle()}
        onBack={closeModal}
        options={getOptions()}
        closeModal={closeModal}
      />
      <TSSOnboardingModal
        isVisible={showTSSOnboarding}
        flow={tssOnboardingFlow}
        pageContext={tssPageContext}
        onAcknowledge={() => {
          dispatch(setHasViewedTSSOnboarding());
          setShowTSSOnboarding(false);
          if (tssOnboardingFlow === 'create') {
            navigation.navigate('CurrencySelection', {
              context: 'addTSSWalletMultisig',
              key: walletKey!,
            });
          } else {
            navigation.navigate(WalletScreens.JOIN_TSS_WALLET, {});
          }
        }}
        onDismiss={() => setShowTSSOnboarding(false)}
      />
    </>
  );
};

export default MultisigOptions;
