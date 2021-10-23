import styled from 'styled-components/native';
import {StyledComponentBase} from 'styled-components';

export const BaseText: StyledComponentBase<any, any> = styled.Text`
  font-family: 'Heebo';
`;

export const H3 = styled(BaseText)`
  font-size: 25px;
  font-style: normal;
  font-weight: 700;
  line-height: 34px;
  letter-spacing: 0;
  text-align: center;
`;

export const Paragraph = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 25px;
  letter-spacing: 0;
  text-align: center;
`;

export const Disclaimer = styled(BaseText)`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 19px;
  letter-spacing: 0;
  text-align: center;
`;
