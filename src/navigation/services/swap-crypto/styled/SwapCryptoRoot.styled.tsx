import {TouchableOpacity} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SlateDark,
  White,
  LightBlack,
  NeutralSlate,
} from '../../../../styles/colors';

export const CtaContainer = styled.View`
  margin: 20px 15px;
`;

export const SwapCryptoCard = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  border-radius: 9px;
  margin: 15px;
  padding: 14px;
`;

export const AmountCryptoCard = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  border-radius: 9px;
  margin: 0px 15px;
  padding: 14px;
`;

export const SummaryTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-bottom: 15px;
`;

export const ArrowContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-left: 10px;
`;

export const SelectorArrowContainer = styled.View`
  margin-left: 10px;
`;

export const ActionsContainer = styled.View<{alignEnd?: boolean}>`
  display: flex;
  justify-content: ${({alignEnd}) => (alignEnd ? 'flex-end' : 'space-between')};
  flex-direction: row;
  align-items: center;
`;

export const SelectedOptionContainer = styled(TouchableOpacity)<{
  noBackground?: boolean;
}>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}, noBackground}) =>
    noBackground ? 'transparent' : dark ? LightBlack : NeutralSlate};
  border-radius: 12px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

export const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  font-weight: 500;
  max-width: 120px;
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

export const DataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 18px;
`;

export const AmountText = styled(BaseText)`
  font-size: 38px;
  font-weight: 500;
  text-align: center;
  color: ${({theme}) => theme.colors.text};
  height: 50px;
`;

export const BottomDataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
`;

export const ProviderContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
`;

export const ProviderLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

export const SpinnerContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

export const WalletTextContainer = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin-left: 10px;
`;

export const BalanceContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;
