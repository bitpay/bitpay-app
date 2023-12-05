import React from 'react';
import styled from 'styled-components/native';
import {t} from 'i18next';
import Button from '../../../components/button/Button';
import {HEIGHT} from '../../../components/styled/Containers';
import SuccessSvg from '../../../../assets/img/success.svg';
import {H3, TextAlign} from '../../../components/styled/Text';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BitpayIdStackParamList} from '../BitpayIdStack';

type TwoFactorEnabledProps = NativeStackScreenProps<
  BitpayIdStackParamList,
  'TwoFactorEnabled'
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

const TwoFactorEnabled: React.FC<TwoFactorEnabledProps> = ({navigation}) => {
  return (
    <ViewContainer>
      <ViewBody>
        <SuccessSvg height={50} width={50} style={{marginBottom: 24}} />
        <TextAlign align="center">
          <H3>{t('Two-Factor Authentication is now enabled')}</H3>
        </TextAlign>
      </ViewBody>
      <Button buttonStyle={'primary'} onPress={() => navigation.popToTop()}>
        {t('Go back to settings')}
      </Button>
    </ViewContainer>
  );
};

export default TwoFactorEnabled;
