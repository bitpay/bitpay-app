import {TouchableOpacity} from '@components/base/TouchableOpacity';
import styled from 'styled-components/native';
import {WIDTH} from '../../../../components/styled/Containers';
import {BaseText, H7} from '../../../../components/styled/Text';
import {
  SlateDark,
  White,
  LightBlack,
  NeutralSlate,
  Slate10,
  Black,
  Action,
  LinkBlue,
  Slate30,
} from '../../../../styles/colors';

const SMALL_SCREEN_WIDTH_THRESHOLD = 420;

// Helper function to calculate font size based on text length
const getAmountFontSize = (textLength?: number): string => {
  if (WIDTH >= SMALL_SCREEN_WIDTH_THRESHOLD) {
    return '32px';
  }
  // Dynamic font size for small screens
  if (!textLength || textLength <= 8) return '32px';
  if (textLength <= 10) return '26px';
  if (textLength <= 14) return '22px';
  if (textLength <= 18) return '18px';
  return '16px';
};

export const CtaContainer = styled.View`
  margin: 20px 15px;
`;

export const SwapCryptoCard = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate10)};
  border-radius: 12px;
  margin: 15px;
  padding: 16px;
`;

export const OfferContainer = styled.View<{isModal?: boolean}>`
  margin-bottom: 15px;
  width: 100%;
`;

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  border-bottom-width: 1px;
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

export const WalletBalanceContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-right: 10px;
`;

export const ArrowContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

export const ArrowBoxContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  height: 0px;
`;

export const ArrowBox = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: -26px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  border-radius: 10px;
  width: 40px;
  height: 40px;
  border: 2.5px solid ${({theme: {dark}}) => (dark ? Black : White)};
  z-index: 999;
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

export const SwapCardHeaderTitle = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : '#434d5a')};
  line-height: 18px;
`;

export const SwapCardAccountChainsContainer = styled.View<{
  padding?: string;
  maxWidth?: string;
}>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 1;
  height: 23px;
  border-radius: 27.5px;
  max-width: ${({maxWidth}) => (maxWidth ? `${maxWidth}` : '250px')};
  padding: ${({padding}) => padding ?? '4px 8px'};
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

export const SwapCardAccountText = styled(BaseText)`
  font-size: 13px;
  line-height: 15px;
  font-weight: 500;
  letter-spacing: 0;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 6px;
  flex-shrink: 1;
  font-style: normal;
`;

export const SwapCardHeaderContainer = styled.View<{noMargin?: boolean}>`
  flex: 1;
  flex-direction: row;
  /* margin-bottom: ${({noMargin}) => (noMargin ? '0' : '20px')}; */
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-content: center;
`;

export const SwapCardAmountAndWalletContainer = styled.View<{
  alignEnd?: boolean;
}>`
  width: 100%;
  margin: 20px 0px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({alignEnd}) => (alignEnd ? 'flex-end' : 'space-between')};
`;

export const SwapCardBottomRowContainer = styled.View<{alignEnd?: boolean}>`
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({alignEnd}) => (alignEnd ? 'flex-end' : 'space-between')};
`;

export const LimitAmountBtn = styled(TouchableOpacity)<{
  noBackground?: boolean;
}>`
  display: flex;
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
  margin-left: 5px;
  margin-right: 5px;
`;

export const LimitAmountBtnText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
  font-size: 13px;
`;

export const AmountClickableContainer = styled(TouchableOpacity)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 36px;
`;

export const SelectedOptionContainer = styled(TouchableOpacity)<{
  noBackground?: boolean;
}>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  align-self: flex-end;
  height: 36px;
  padding: 8px;
  min-width: 146px;
  background: ${({theme: {dark}, noBackground}) =>
    noBackground ? 'transparent' : dark ? LightBlack : NeutralSlate};
  border-radius: 27.5px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

export const SwapCryptoWalletSelectorContainer = styled.View`
  margin: 8px 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export const WalletSelector = styled(TouchableOpacity)<{
  disabled?: boolean;
  isBigScreen?: boolean;
}>`
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  height: 40px;
  border-radius: 27.5px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  min-width: 146px;
  max-width: ${({isBigScreen}) => (isBigScreen ? '220px' : '185px')};
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

export const WalletSelectorLeft = styled.View`
  display: flex;
  justify-content: left;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorRight = styled.View`
  display: flex;
  justify-content: right;
  flex-direction: row;
  align-items: center;
`;

export const WalletSelectorName = styled.Text`
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-left: 8px;
  margin-right: 5px;
`;

export const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0px;
  max-width: 120px;
`;

export const SelectedOptionCol = styled.View<{justifyContent?: string}>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({justifyContent}) => justifyContent ?? 'center'};
`;

export const SwapCurrenciesButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  border-radius: 100px;
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
  font-size: 13px;
  text-align: center;
`;

export const AmountText = styled(BaseText)<{textLength?: number}>`
  font-size: ${({textLength}) => getAmountFontSize(textLength)};
  font-weight: 700;
  letter-spacing: 0px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  flex-shrink: 1;
`;

export const BottomDataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 13px;
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
