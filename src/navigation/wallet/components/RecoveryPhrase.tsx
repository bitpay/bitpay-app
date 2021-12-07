import React from 'react';
import styled from 'styled-components/native';
import {Caution, Slate, SlateDark, White} from '../../../styles/colors';
import ScanSvg from '../../../../assets/img/onboarding/scan.svg';
import {CtaContainer} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {yupResolver} from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {useForm, Controller} from 'react-hook-form';
import {BaseText} from '../../../components/styled/Text';
import {useLogger} from '../../../utils/hooks/useLogger';
import {WalletOptions} from '../../../store/wallet/wallet.models';
import {startImportMnemonic} from '../../../store/wallet/wallet.effects';
import { navigationRef } from '../../../Root';

const Gutter = '10px';
export const ImportWalletContainer = styled.View`
  padding: ${Gutter} 0;
`;

const ImportWalletParagraph = styled.Text`
  font-size: 16px;
  line-height: 25px;
  padding: ${Gutter};
  color: ${SlateDark};
`;

const HeaderContainer = styled.View`
  padding: ${Gutter};
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

export const ImportWalletTitle = styled.Text`
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: ${SlateDark};
  opacity: 0.75;
  text-transform: uppercase;
`;

const ImgContainer = styled.View`
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
`;

export const ImportWalletTextInput = styled.TextInput`
  height: 100px;
  margin: 0 ${Gutter};
  padding: ${Gutter};
  background: ${White};
  border: 0.75px solid ${Slate};
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
`;

const ErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 12px;
  font-weight: 500;
  padding: 5px 0 0 10px;
`;

const schema = yup.object().shape({
  words: yup.string().required(),
});

const RecoveryPhrase = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const {
    control,
    handleSubmit,
    formState: {errors},
  } = useForm({resolver: yupResolver(schema)});

  const onSubmit = (formData: {words: string}) => {
    const {words} = formData;
    if (!words) {
      return;
    }

    const wordList = words.trim().split(/[\u3000\s]+/);

    if (wordList.length % 3 !== 0) {
      logger.info('Incorrect words length');
      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: 'Something went wrong',
          message: 'The recovery phrase is invalid.',
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
      return;
    }

    const opts: Partial<WalletOptions> = {};
    opts.mnemonic = words;

    importWallet(words, opts);
  };

  const importWallet = async (words: string, opts: Partial<WalletOptions>): void => {
    try {
      await dispatch(startImportMnemonic(words, opts));
      navigationRef.navigate('Onboarding', {
        screen: 'TermsOfUse',
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ImportWalletContainer>
      <ImportWalletParagraph>
        Enter your recovery phrase (usually 12-words) in the correct order.
        Separate each word with a single space only (no commas or any other
        punctuation). For backup phrases in non-English languages: Some words
        may include special symbols, so be sure to spell all the words
        correctly.
      </ImportWalletParagraph>

      <HeaderContainer>
        <ImportWalletTitle>Recovery phrase</ImportWalletTitle>

        <ImgContainer>
          <ScanSvg />
        </ImgContainer>
      </HeaderContainer>

      <Controller
        control={control}
        render={({field: {onChange, onBlur, value}}) => (
          <ImportWalletTextInput
            multiline
            numberOfLines={5}
            onChangeText={(text: string) => onChange(text)}
            onBlur={onBlur}
            value={value}
          />
        )}
        name="words"
        defaultValue=""
      />

      {errors?.words?.message && (
        <ErrorText>Recovery phrase is required.</ErrorText>
      )}

      <CtaContainer>
        <Button buttonStyle={'primary'} onPress={handleSubmit(onSubmit)}>
          Import Wallet
        </Button>
      </CtaContainer>
    </ImportWalletContainer>
  );
};

export default RecoveryPhrase;
