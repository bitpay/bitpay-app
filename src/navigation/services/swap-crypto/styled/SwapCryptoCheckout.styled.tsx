import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import {
  SlateDark,
  Action,
  White,
  LightBlack,
  NeutralSlate,
  LinkBlue,
  LuckySevens,
} from '../../../../styles/colors';

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ebecee')};
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

export const SelectedOptionContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

export const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  font-weight: 500;
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
  margin: 10px 20px 0 0;
`;

export const CheckboxText = styled(BaseText)`
  color: ${LuckySevens};
  font-size: 11px;
  font-weight: 300;
  margin-left: 20px;
`;

export const PoliciesContainer = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  margin: 20px 0;
`;

export const PoliciesText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
`;

export const ArrowContainer = styled.View`
  margin-left: 10px;
`;
