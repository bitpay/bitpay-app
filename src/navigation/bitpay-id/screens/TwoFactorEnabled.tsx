import React from 'react';
import styled from 'styled-components/native';
import Button from '../../../components/button/Button';
import {HEIGHT} from '../../../components/styled/Containers';
import SuccessSvg from '../../../../assets/img/success.svg';
import {H3, TextAlign} from '../../../components/styled/Text';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BitpayIdGroupParamList, BitpayIdScreens} from '../BitpayIdGroup';
import {useTranslation} from 'react-i18next';

type TwoFactorEnabledProps = NativeStackScreenProps<
  BitpayIdGroupParamList,
  BitpayIdScreens.TWO_FACTOR_ENABLED
>;

export type TwoFactorEnabledScreenParamList = undefined;

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

const TwoFactorEnabled = ({navigation}: TwoFactorEnabledProps) => {
  const {t} = useTranslation();
  return (
    <ViewContainer>
      <ViewBody>
        <SuccessSvg height={50} width={50} style={{marginBottom: 24}} />
        <TextAlign align="center">
          <H3>{t('Two-Factor Authentication is now enabled')}</H3>
        </TextAlign>
      </ViewBody>
      <Button buttonStyle={'primary'} onPress={() => navigation.pop(2)}>
        {t('Go back to settings')}
      </Button>
    </ViewContainer>
  );
};

export default TwoFactorEnabled;
