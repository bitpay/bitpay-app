import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
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
import {useTheme} from '../../../contexts';
import {
  BaseText,
  OptionDescription,
  OptionTitle,
} from '../../../components/styled/Text';
import {Action, LightBlue, Midnight, White} from '../../../styles/colors';
import AngleRight from '../../../../assets/img/angle-right.svg';

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  chevron: {
    justifyContent: 'center',
  },
});

const SharedWalletTypeOption = ({isTSS}: {isTSS?: boolean}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  return (
    <>
      <View style={styles.optionContent}>
        {isTSS ? (
          <View
            style={[
              styles.badge,
              {backgroundColor: theme.dark ? Midnight : LightBlue},
            ]}>
            <BaseText
              style={[styles.badgeText, {color: theme.dark ? White : Action}]}>
              {t('Beta')}
            </BaseText>
          </View>
        ) : null}
        <OptionTitle>
          {isTSS ? t('Threshold Signature Wallet') : t('Multisignature Wallet')}
        </OptionTitle>
        <OptionDescription>
          {isTSS
            ? t('One key, split across co-signers.')
            : t('Each co-signer holds their own key.')}
        </OptionDescription>
        <OptionDescription style={styles.footnote}>
          {isTSS
            ? t('Sign together, online · BitPay only · Can’t edit later')
            : t('Sign anytime')}
        </OptionDescription>
      </View>
      <View style={styles.chevron}>
        <AngleRight />
      </View>
    </>
  );
};

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
  const tssEnabled = useAppSelector(({WALLET}) => WALLET.tssEnabled);
  const hasViewedTSSOnboarding = useAppSelector(
    ({APP}) => APP.hasViewedTSSOnboarding,
  );
  const [showTSSOnboarding, setShowTSSOnboarding] = useState(false);
  const [tssOnboardingFlow, setTssOnboardingFlow] =
    useState<TSSOnboardingFlow>('create');
  const tssPageContext = walletKey ? 'AddingOptions' : 'CreationOptions';

  useEffect(() => {
    if (isVisible && !tssEnabled && !isNonTSSKeyFlow && modalType) {
      if (modalType === 'create') {
        dispatch(
          Analytics.track('Clicked Create Multisig Wallet', {
            context: tssPageContext,
          }),
        );
        closeModal();
        navigation.navigate('CurrencySelection', {
          context: 'addWalletMultisig',
          key: walletKey!,
        });
      } else {
        dispatch(
          Analytics.track('Clicked Join Multisig Wallet', {
            context: tssPageContext,
          }),
        );
        closeModal();
        navigation.navigate('JoinMultisig', {key: walletKey});
      }
    }
  }, [
    isVisible,
    tssEnabled,
    isNonTSSKeyFlow,
    modalType,
    dispatch,
    navigation,
    walletKey,
    closeModal,
    tssPageContext,
  ]);

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
        optionElement: () => <SharedWalletTypeOption />,
        cardStyle: true,
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
      ...(tssEnabled
        ? [
            {
              optionElement: () => <SharedWalletTypeOption isTSS />,
              cardStyle: true,
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
            } as Option,
          ]
        : []),
    ],
    [
      dispatch,
      navigation,
      walletKey,
      closeModal,
      hasViewedTSSOnboarding,
      tssPageContext,
      tssEnabled,
    ],
  );

  const joinOptions: Option[] = useMemo(
    () => [
      {
        optionElement: () => <SharedWalletTypeOption />,
        cardStyle: true,
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
      ...(tssEnabled
        ? [
            {
              optionElement: () => <SharedWalletTypeOption isTSS />,
              cardStyle: true,
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
            } as Option,
          ]
        : []),
    ],
    [
      dispatch,
      navigation,
      walletKey,
      closeModal,
      hasViewedTSSOnboarding,
      tssPageContext,
      tssEnabled,
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
    return t('Shared Wallet Type');
  };

  if (!tssEnabled && !isNonTSSKeyFlow && modalType) {
    return null;
  }

  return (
    <>
      <OptionsSheet
        isVisible={isVisible}
        title={getTitle()}
        titleStyle={isNonTSSKeyFlow ? undefined : styles.title}
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
