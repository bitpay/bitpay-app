import React from 'react';
import styled from 'styled-components/native';
import {
  ActionContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import {Link, Paragraph} from '../../../components/styled/Text';
import {SlateDark, White} from '../../../styles/colors';
import {Pressable} from 'react-native';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';

import {URL} from '../../../constants';
import {useAppDispatch} from '../../../utils/hooks';
import Button from '../../../components/button/Button';
import {useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {WalletGroupParamList} from '../WalletGroup';
import {useTranslation} from 'react-i18next';

export type ClearEncryptPasswordParamList = {
  keyId: string;
};

const ClearEncryptPasswordContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin-top: 20px;
  padding: 0 ${ScreenGutter};
`;

const ClearEncryptPasswordParagraph = styled(Paragraph)`
  margin-bottom: 15px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ClearEncryptPasswordParagraphLink = styled(Link)`
  font-size: 16px;
  font-style: normal;
`;

const ClearEncryptPassword = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {
    params: {keyId},
  } = useRoute<RouteProp<WalletGroupParamList, 'ClearEncryptPassword'>>();

  return (
    <ClearEncryptPasswordContainer>
      <ScrollView>
        <ClearEncryptPasswordParagraph>
          {t(
            'Because your encrypted password is not stored by BitPay, there is no way to reset it.',
          )}
        </ClearEncryptPasswordParagraph>
        <ClearEncryptPasswordParagraph>
          {t(
            'If you need to regain access to your wallet because you have forgotten or lost the encrypt password, you must restore the wallet using the 12 word recovery phrase.',
          )}
        </ClearEncryptPasswordParagraph>
        <ClearEncryptPasswordParagraph>
          {t(
            'If you do not have the recovery phrase, you will not be able to regain access to your wallet',
          )}{' '}
          <Pressable
            style={{maxHeight: 22, alignSelf: 'flex-start'}}
            onPress={() =>
              dispatch(
                openUrlWithInAppBrowser(
                  URL.HELP_FORGOT_WALLET_ENCRYPT_PASSWORD,
                ),
              )
            }>
            <ClearEncryptPasswordParagraphLink>
              {t('Read more.')}
            </ClearEncryptPasswordParagraphLink>
          </Pressable>
        </ClearEncryptPasswordParagraph>

        <ActionContainer>
          <Button
            onPress={() => {
              navigation.navigate('Import', {keyId});
            }}>
            {t('Continue')}
          </Button>
        </ActionContainer>
      </ScrollView>
    </ClearEncryptPasswordContainer>
  );
};

export default ClearEncryptPassword;
