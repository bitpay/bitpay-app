import React from 'react';
import styled from 'styled-components/native';
import {Paragraph} from '../../../../../components/styled/Text';
import {LightBlack, NeutralSlate} from '../../../../../styles/colors';
import ClockSvg from '../../../../../../assets/img/bills/clock.svg';

const AlertContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : NeutralSlate)};
  flex-direction: row;
  padding: 16px 14px 21px;
  border-radius: 8px;
`;

const AlertBody = styled.View`
  margin-left: 14px;
`;

const AlertText = styled(Paragraph)`
  font-size: 14px;
  padding-right: 25px;
  line-height: 19px;
`;

const AlertHeader = styled(Paragraph)`
  font-weight: 500;
  margin-bottom: 3px;
`;

export default () => {
  return (
    <AlertContainer>
      <ClockSvg style={{marginTop: 5}} />
      <AlertBody>
        <AlertHeader>No late fees</AlertHeader>
        <AlertText>
          Your bank will give you credit for making this payment within one
          business day, but it may take 1-2 business days for it to show up on
          your bank statement.
        </AlertText>
      </AlertBody>
    </AlertContainer>
  );
};
