import React, {useEffect, useLayoutEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled from 'styled-components/native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {useTranslation} from 'react-i18next';
import BoxInput from '../../../components/form/BoxInput';
import Button, {ButtonState} from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import {Caution, SlateDark, White} from '../../../styles/colors';
import {useAppDispatch} from '../../../utils/hooks';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {
  createVultisigFastVault,
  getExistingVultisigFastVault,
  getPendingVultisigFastVaultId,
  registerVultisigBitcoinTestnetWallet,
  verifyVultisigFastVault,
} from '../../../store/wallet/effects/vultisig/vultisig';

type Props = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.VULTISIG_FAST_VAULT
>;

const Container = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  padding: 20px ${ScreenGutter};
`;

const Paragraph = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  line-height: 22px;
  margin-bottom: 20px;
`;

const Field = styled.View`
  margin-bottom: 16px;
`;

const Actions = styled.View`
  gap: 12px;
  margin-top: 12px;
  padding-bottom: 36px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 13px;
  margin-bottom: 12px;
`;

const formatProgress = (step: unknown): string => {
  if (typeof step === 'string') {
    return step.replace(/_/g, ' ');
  }
  if (step && typeof step === 'object' && 'step' in step) {
    return String((step as {step: unknown}).step).replace(/_/g, ' ');
  }
  return 'Creating key shares';
};

const VultisigFastVault: React.FC<Props> = ({navigation}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('My Vultisig Fast Vault');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [vaultId, setVaultId] = useState<string>();
  const [existingVault, setExistingVault] = useState<{
    id: string;
    name: string;
  }>();
  const [buttonState, setButtonState] = useState<ButtonState>();
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Vultisig Fast Vault')}</HeaderTitle>,
    });
  }, [navigation, t]);

  useEffect(() => {
    let cancelled = false;
    getPendingVultisigFastVaultId()
      .then(async pendingVaultId => {
        if (cancelled) return;
        if (pendingVaultId) {
          setVaultId(pendingVaultId);
          return;
        }

        const vault = await getExistingVultisigFastVault();
        if (!cancelled) {
          setExistingVault(vault);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const addWallet = async (id: string) => {
    const {key, wallet} = await dispatch(
      registerVultisigBitcoinTestnetWallet(id),
    );
    navigation.replace(WalletScreens.WALLET_DETAILS, {
      key,
      walletId: wallet.credentials.walletId,
    });
  };

  const addExistingWallet = async () => {
    if (!existingVault) return;
    try {
      setError('');
      setButtonState('loading');
      setProgress(t('Adding Bitcoin Testnet4 wallet'));
      await addWallet(existingVault.id);
      setButtonState('success');
    } catch (e) {
      setButtonState('failed');
      setProgress('');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const createVault = async () => {
    setError('');
    if (!name.trim() || !password) {
      setError(t('Name and password are required.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('Passwords must match'));
      return;
    }

    try {
      setButtonState('loading');
      setProgress(t('Creating key shares'));
      const id = await createVultisigFastVault({
        name: name.trim(),
        password,
        onProgress: step => setProgress(formatProgress(step)),
      });
      setVaultId(id);
      setProgress('');
      // The next stage renders a different button. Do not carry the creation
      // button's terminal state into verification, where `success` disables
      // further presses and renders only the green checkmark.
      setButtonState(undefined);
    } catch (e) {
      setButtonState('failed');
      setProgress('');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const verifyAndAddWallet = async () => {
    if (!vaultId || !verificationCode.trim()) {
      setError(t('Enter the verification code from the local Docker logs.'));
      return;
    }
    try {
      setError('');
      setButtonState('loading');
      setProgress(t('Verifying Fast Vault'));
      await verifyVultisigFastVault(vaultId, verificationCode.trim());
      setProgress(t('Adding Bitcoin Testnet4 wallet'));
      await addWallet(vaultId);
      setButtonState('success');
    } catch (e) {
      setButtonState('failed');
      setProgress('');
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Container>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Paragraph>
          {vaultId
            ? t(
                'Enter the verification code printed by the local VultiServer Docker stack. BitPay will then add a Bitcoin Testnet4 wallet and continue to provide addresses, fees, transaction construction, and broadcasting.',
              )
            : t(
                'Create a Vultisig Fast Vault for signing. BitPay remains responsible for the wallet experience and all Bitcoin network operations.',
              )}
        </Paragraph>
        {!!error && <ErrorText>{error}</ErrorText>}
        {!!progress && <Paragraph>{progress}</Paragraph>}

        {!vaultId ? (
          <>
            {existingVault && (
              <Actions>
                <Paragraph>
                  {t('Use the existing Vultisig Fast Vault {{name}}.', {
                    name: existingVault.name,
                  })}
                </Paragraph>
                <Button
                  testID="vultisig-add-existing-vault-button"
                  accessibilityLabel="Add existing Vultisig Fast Vault wallet"
                  state={buttonState}
                  onPress={addExistingWallet}>
                  {t('Add Existing Fast Vault')}
                </Button>
              </Actions>
            )}
            <Field>
              <BoxInput
                testID="vultisig-vault-name-input"
                accessibilityLabel="Vultisig vault name"
                label={t('VAULT NAME')}
                value={name}
                onChangeText={setName}
              />
            </Field>
            <Field>
              <BoxInput
                testID="vultisig-password-input"
                accessibilityLabel="Vultisig password"
                label={t('FAST VAULT PASSWORD')}
                type="password"
                value={password}
                onChangeText={setPassword}
              />
            </Field>
            <Field>
              <BoxInput
                testID="vultisig-confirm-password-input"
                accessibilityLabel="Confirm Vultisig password"
                label={t('CONFIRM PASSWORD')}
                type="password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={createVault}
              />
            </Field>
            <Actions>
              <Button
                testID="vultisig-create-vault-button"
                accessibilityLabel="Create Vultisig Fast Vault"
                state={buttonState}
                onPress={createVault}>
                {t('Create Fast Vault')}
              </Button>
            </Actions>
          </>
        ) : (
          <>
            <Field>
              <BoxInput
                testID="vultisig-verification-code-input"
                accessibilityLabel="Vultisig verification code"
                label={t('VERIFICATION CODE')}
                value={verificationCode}
                autoCapitalize="none"
                onChangeText={setVerificationCode}
                onSubmitEditing={verifyAndAddWallet}
              />
            </Field>
            <Actions>
              <Button
                testID="vultisig-verify-wallet-button"
                accessibilityLabel="Verify Vultisig Fast Vault and add wallet"
                state={buttonState}
                onPress={verifyAndAddWallet}>
                {t('Verify and Add Wallet')}
              </Button>
            </Actions>
          </>
        )}
      </ScrollView>
    </Container>
  );
};

export default VultisigFastVault;
