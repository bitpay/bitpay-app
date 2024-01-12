import React, {useLayoutEffect, useState} from 'react';
import {HeaderTitle, Paragraph} from '../../../../components/styled/Text';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {
  ActiveOpacity,
  AdvancedOptions,
  AdvancedOptionsButton,
  AdvancedOptionsContainer,
  Column,
  ScreenGutter,
  AdvancedOptionsButtonText,
} from '../../../../components/styled/Containers';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SlateDark, White} from '../../../../styles/colors';
import yup from '../../../../lib/yup';
import {Controller, useForm} from 'react-hook-form';
import BoxInput from '../../../../components/form/BoxInput';
import Button, {ButtonState} from '../../../../components/button/Button';
import {yupResolver} from '@hookform/resolvers/yup';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import Haptic from '../../../../components/haptic-feedback/haptic';
import ChevronUpSvg from '../../../../../assets/img/chevron-up.svg';
import ChevronDownSvg from '../../../../../assets/img/chevron-down.svg';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../../WalletGroup';
import {BwcProvider} from '../../../../lib/bwc';
import Clipboard from '@react-native-clipboard/clipboard';
import {sleep} from '../../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {LogActions} from '../../../../store/log';
import Mailer from 'react-native-mail';

const BWC = BwcProvider.getInstance();

const ExportWalletContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled(KeyboardAwareScrollView)`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const PasswordFormContainer = styled.View`
  margin: 15px 0;
`;

const ExportWalletParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AdvancedOptionsText = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
`;

const PasswordActionContainer = styled.View`
  margin-top: 20px;
`;

const PasswordInputContainer = styled.View`
  margin: 15px 0;
`;

interface ExportWalletPasswordFieldValues {
  password: string;
  confirmPassword: string;
}

const RowContainer = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 18px;
`;

const CtaContainer = styled.View`
  align-self: stretch;
  flex-direction: column;
  margin-top: 20px;
`;

const CheckBoxContainer = styled.View`
  flex-direction: column;
  justify-content: center;
`;

const ExportWallet = () => {
  const {t} = useTranslation();
  const {
    params: {wallet, keyObj},
  } = useRoute<RouteProp<WalletGroupParamList, 'ExportWallet'>>();

  const {network} = wallet;

  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const [dontIncludePrivateKey, setDontIncludePrivateKey] = useState(false);
  const contacts = useAppSelector(({CONTACT}) =>
    CONTACT.list.filter(c => c.network === network),
  );
  const [copyButtonState, setCopyButtonState] = useState<ButtonState>();
  const [sendButtonState, setSendButtonState] = useState<ButtonState>();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>{t('Export Wallet')}</HeaderTitle>,
    });
  }, [navigation, t]);

  const schema = yup.object().shape({
    password: yup.string().required(),
    confirmPassword: yup
      .string()
      .required()
      .oneOf([yup.ref('password')], t('Passwords must match')),
  });
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm<ExportWalletPasswordFieldValues>({
    resolver: yupResolver(schema),
  });

  const walletExport = (password: any) => {
    if (!password) {
      return null;
    }

    const opts = {
      noSign: dontIncludePrivateKey,
      addressBook: contacts,
      password,
    };

    let backup: any = {
      credentials: JSON.parse(wallet.toString(opts)),
    };

    /**----------- Read only wallet ---------------*/
    if (backup.credentials.keyId && opts.noSign) {
      delete backup.credentials.keyId;
    }
    /**--------------------------*/

    if (wallet.keyId && !opts.noSign) {
      backup.key = keyObj;
    }

    if (opts.addressBook) {
      backup.addressBook = opts.addressBook;
    }

    backup = JSON.stringify(backup);

    return BWC.getSJCL().encrypt(password, backup, {iter: 1000});
  };

  const onCopyToClipboard = async ({password}: {password: string}) => {
    setCopyButtonState('loading');
    try {
      const _copyWallet = walletExport(password);
      Clipboard.setString(_copyWallet);
      setCopyButtonState('success');
      await sleep(500);
      setCopyButtonState(undefined);
    } catch (e) {
      setCopyButtonState('failed');
      await sleep(500);
      setCopyButtonState(undefined);
    }
  };

  const handleEmail = (subject: string, body: string) => {
    Mailer.mail(
      {
        subject,
        body,
        isHTML: false,
      },
      (error, event) => {
        if (error) {
          dispatch(LogActions.error('Error sending email: ' + error));
        }
        if (event) {
          dispatch(LogActions.debug('Email Backup: ' + event));
        }
      },
    );
  };

  const onSendByEmail = async ({password}: {password: string}) => {
    try {
      setSendButtonState('loading');
      const _sendWallet = walletExport(password);
      const {
        credentials: {walletName: cWalletName, walletId},
        walletName,
      } = wallet;
      let name = walletName || cWalletName || walletId;

      if (dontIncludePrivateKey) {
        name = name + ' ' + t('(No Private Key)');
      }

      // TODO: Update app name
      const subject = t('BitPay Wallet Backup: ') + name;
      const body = t(
        'Here is the encrypted backup of the wallet : \n\n \n\nTo import this backup, copy all text between {...}, including the symbols {}',
        {name, sendWallet: _sendWallet},
      );

      handleEmail(subject, body);

      setSendButtonState('success');
      await sleep(200);
      setSendButtonState(undefined);
    } catch (err) {
      const e = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error('[onSendByEmail] ', e));
      setSendButtonState('failed');
      await sleep(500);
      setSendButtonState(undefined);
    }
  };

  return (
    <ExportWalletContainer>
      <ScrollView>
        <ExportWalletParagraph>
          {t('Export your asset by creating a password')}
        </ExportWalletParagraph>

        <PasswordFormContainer>
          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('EXPORT PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.password?.message}
                  value={value}
                />
              )}
              name="password"
              defaultValue=""
            />
          </PasswordInputContainer>

          <PasswordInputContainer>
            <Controller
              control={control}
              render={({field: {onChange, onBlur, value}}) => (
                <BoxInput
                  placeholder={'strongPassword123'}
                  label={t('CONFIRM EXPORT PASSWORD')}
                  type={'password'}
                  onBlur={onBlur}
                  onChangeText={(text: string) => onChange(text)}
                  error={errors.confirmPassword?.message}
                  value={value}
                />
              )}
              name="confirmPassword"
              defaultValue=""
            />
          </PasswordInputContainer>

          <CtaContainer>
            <AdvancedOptionsContainer>
              <AdvancedOptionsButton
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  Haptic('impactLight');
                  setShowOptions(!showOptions);
                }}>
                {showOptions ? (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Hide Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronUpSvg />
                  </>
                ) : (
                  <>
                    <AdvancedOptionsButtonText>
                      {t('Show Advanced Options')}
                    </AdvancedOptionsButtonText>
                    <ChevronDownSvg />
                  </>
                )}
              </AdvancedOptionsButton>

              {showOptions && (
                <AdvancedOptions>
                  <RowContainer
                    activeOpacity={1}
                    onPress={() => {
                      setDontIncludePrivateKey(!dontIncludePrivateKey);
                    }}>
                    <Column>
                      <AdvancedOptionsText>
                        {t('Do not include private key')}
                      </AdvancedOptionsText>
                    </Column>
                    <CheckBoxContainer>
                      <Checkbox
                        checked={dontIncludePrivateKey}
                        onPress={() => {
                          setDontIncludePrivateKey(!dontIncludePrivateKey);
                        }}
                      />
                    </CheckBoxContainer>
                  </RowContainer>
                </AdvancedOptions>
              )}
            </AdvancedOptionsContainer>
          </CtaContainer>

          <PasswordActionContainer>
            <Button
              onPress={handleSubmit(onCopyToClipboard)}
              state={copyButtonState}>
              {t('Copy to Clipboard')}
            </Button>
          </PasswordActionContainer>

          <PasswordActionContainer>
            <Button
              onPress={handleSubmit(onSendByEmail)}
              state={sendButtonState}
              buttonStyle={'secondary'}>
              {t('Send by Email')}
            </Button>
          </PasswordActionContainer>
        </PasswordFormContainer>
      </ScrollView>
    </ExportWalletContainer>
  );
};

export default ExportWallet;
