import React from 'react';
import styled from 'styled-components/native';
import {Trans, useTranslation} from 'react-i18next';
import {BaseText, Paragraph} from '../../../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../../../styles/colors';
const BillsZeroState = require('../../../../../../assets/img/bills/bills-zero-state.png');

const BillsValueProp = styled.View`
  flex-grow: 1;
  align-items: center;
  justify-content: center;
`;

const BillsImage = styled.Image`
  width: 317px;
  height: 242px;
  margin-top: 20px;
`;

const TitleContainer = styled.View`
  align-items: center;
`;

const Title = styled(BaseText)`
  font-size: 24px;
  font-weight: 400;
  line-height: 28px;
  text-align: center;
  margin-top: 20px;
  width: 341px;
`;

const BoldTitle = styled(Title)`
  font-weight: 600;
`;

const Subtitle = styled(Paragraph)`
  font-size: 14px;
  line-height: 21px;
  width: 310px;
  margin-top: 10px;
  color: ${({theme}) => (theme.dark ? Slate30 : SlateDark)};
  text-align: center;
  margin-bottom: 20px;
`;

export default () => {
  const {t} = useTranslation();
  return (
    <BillsValueProp>
      <BillsImage source={BillsZeroState} />
      <TitleContainer>
        <Title>
          <Trans
            i18nKey="BillPayPitch"
            values={{wallet: t('BitPay wallet')}}
            components={[<BoldTitle />]}
          />
        </Title>
        <Subtitle>
          {t('Make payments on everything from credit cards to mortgages.')}
        </Subtitle>
      </TitleContainer>
    </BillsValueProp>
  );
};
