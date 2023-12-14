import React from 'react';
import styled from 'styled-components/native';
import {t} from 'i18next';
import Button from '../../../components/button/Button';
import {Br, HEIGHT} from '../../../components/styled/Containers';
import SuccessSvg from '../../../../assets/img/success.svg';
import {
  BaseText,
  H3,
  Paragraph,
  TextAlign,
} from '../../../components/styled/Text';
import {Action, White} from '../../../styles/colors';
import {useAppSelector} from '../../../utils/hooks';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BitpayIdGroupParamList, BitpayIdScreens} from '../BitpayIdGroup';
import {useTranslation} from 'react-i18next';

type ReceivingEnabledProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.RECEIVING_ENABLED
>;

const ViewContainer = styled.View`
  padding: 16px;
  flex-direction: column;
  height: ${HEIGHT - 110}px;
`;

const ViewBody = styled.View`
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-bottom: 100px;
`;

const EmailContainer = styled.View`
  background-color: rgba(
    34,
    64,
    196,
    ${({theme}) => (theme.dark ? 0.35 : 0.05)}
  );
  align-items: center;
  height: 48px;
  padding: 0 14px 0 17px;
  border-radius: 48px;
  width: 100%;
  max-width: 300px;
  margin-top: 32px;
  flex-direction: row;
`;

const EmailText = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : Action)};
  font-size: 16px;
  font-weight: 500;
`;

const ReceivingEnabled = ({route, navigation}: ReceivingEnabledProps) => {
  const {t} = useTranslation();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  return (
    <ViewContainer>
      <ViewBody>
        <SuccessSvg height={50} width={50} style={{marginBottom: 24}} />
        <TextAlign align="center">
          <H3>{t('Email payments has been enabled!')}</H3>
        </TextAlign>
        <Br />
        <TextAlign align="center">
          <Paragraph>
            {t(
              'Your friends and family can now send crypto straight to your email address.',
            )}
          </Paragraph>
        </TextAlign>
        <EmailContainer>
          <EmailText style={{flexGrow: 1}}>{user!.email}</EmailText>
          <SuccessSvg height={20} width={20} />
        </EmailContainer>
      </ViewBody>
      <Button buttonStyle={'primary'} onPress={() => navigation.popToTop()}>
        {t('Go back to settings')}
      </Button>
    </ViewContainer>
  );
};

export default ReceivingEnabled;
