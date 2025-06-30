import styled from 'styled-components/native';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SlateDark,
  Slate30,
  White,
  LightBlack,
  NeutralSlate,
  LinkBlue,
  Slate,
} from '../../../../styles/colors';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
`;

export const RowDataContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
`;

export const FiatAmountContainer = styled.View`
  flex-direction: row;
  justify-content: flex-end;
`;

export const CryptoUnit = styled(BaseText)`
  font-size: 15px;
  padding-top: 7px;
  padding-left: 5px;
`;

export const RowLabel = styled(BaseText)`
  font-size: 14px;
`;

export const RowData = styled(BaseText)`
  font-size: 16px;
`;

export const FiatAmount = styled(BaseText)`
  font-size: 14px;
  color: #667;
`;

export const SelectedOptionContainer = styled(TouchableOpacity)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 19.5px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

export const SelectedOptionText = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

export const SelectedOptionCol = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const CoinIconContainer = styled.View`
  width: 30px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const CheckBoxContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 8px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  padding: 16px;
  margin: 20px 0 0 0;
`;

export const CheckBoxCol = styled.View`
  display: flex;
  flex-direction: column;
`;

export const CheckboxText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  margin: 0 20px;
`;

export const PoliciesContainer = styled(TouchableOpacity)`
  margin: 16px 0 0 20px;
`;

export const PoliciesText = styled(BaseText)`
  color: ${LinkBlue};
  font-size: 13px;
`;

export const ArrowContainer = styled.View`
  margin-left: 10px;
`;
