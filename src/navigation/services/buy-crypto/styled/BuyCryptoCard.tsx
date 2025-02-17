import styled from 'styled-components/native';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Slate30,
} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const BuyCryptoItemCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 9px;
  margin: 8px 16px;
  padding: 14px;
`;

export const BuyCryptoExpandibleCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 9px;
  margin: 20px 15px 0px 15px;
  padding: 18px 14px;
`;

export const ActionsContainer = styled.View`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

export const SelectedOptionContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
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

export const DataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 18px;
  max-width: 160px;
`;

export const CoinIconContainer = styled.View`
  width: 30px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
`;

export const BuyCryptoItemTitle = styled.Text`
  margin: 0 0 18px 0;
  color: ${({theme: {dark}}) => (dark ? White : '#434d5a')};
  line-height: 18px;
`;
