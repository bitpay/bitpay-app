import styled from 'styled-components/native';
import {LightBlack, SlateDark, White, Slate30} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const SellCryptoExpandibleCard = styled(TouchableOpacity)`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 9px;
  margin: 20px 15px 0px 15px;
  padding: 18px 14px;
`;

export const SellCryptoOfferLine = styled.View`
  width: 100%;
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

export const SellCryptoOfferText = styled.Text`
  color: ${({theme: {dark}}) => (dark ? White : '#434d5a')};
  line-height: 18px;
`;

export const SellCryptoOfferDataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  max-width: 160px;
  margin-right: 24px;
`;

export const SellTermsContainer = styled.View`
  margin-top: 20px;
`;

export const SellBalanceContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

export const SellBottomDataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
`;

export const ItemDivisor = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-bottom-width: 1px;
`;
