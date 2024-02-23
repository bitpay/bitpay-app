import styled from 'styled-components/native';
import {BaseText} from '../../../../../components/styled/Text';

export const NoPrMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
`;

export const PrTitle = styled(BaseText)`
  font-size: 18px;
  font-weight: 500;
`;

export const PrRow = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 60px;
`;

export const PrRowLeft = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

export const PrRowRight = styled.View`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

export const PrTxtCryptoAmount = styled(BaseText)`
  font-weight: 700;
`;

export const PrTxtDate = styled(BaseText)`
  font-size: 12.5px;
  color: #667;
`;

export const PrTxtFiatAmount = styled(BaseText)`
  font-size: 14px;
`;

export const PrTxtStatus = styled(BaseText)`
  font-size: 12.5px;
`;

export const FooterSupport = styled.View`
  padding-top: 20px;
  padding-bottom: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
`;

export const SupportTxt = styled(BaseText)`
  font-size: 12.5px;
  color: #667;
`;
