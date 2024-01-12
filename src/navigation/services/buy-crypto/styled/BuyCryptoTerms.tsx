import styled from 'styled-components/native';
import {BaseText, Small} from '../../../../components/styled/Text';
import {LuckySevens, SlateDark} from '../../../../styles/colors';

export const TermsContainer = styled.View`
  padding: 0 20px;
  margin-top: 20px;
  margin-bottom: 40px;
`;

export const ExchangeTermsContainer = styled.View`
  padding: 0 0 10px 0;
`;

export const TermsText = styled(Small)`
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? LuckySevens : SlateDark)};
`;

export const ExchangeTermsText = styled(BaseText)`
  font-size: 11px;
  line-height: 20px;
  color: ${LuckySevens};
`;
