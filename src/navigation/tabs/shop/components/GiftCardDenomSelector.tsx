import React, {useState} from 'react';
import {TouchableWithoutFeedback} from 'react-native';
import styled from 'styled-components/native';
import MinusSvg from '../../../../../assets/img/minus.svg';
import PlusSvg from '../../../../../assets/img/plus.svg';
import {BaseText} from '../../../../components/styled/Text';
import {formatAmount} from '../../../../lib/gift-cards/gift-card';
import {CardConfig} from '../../../../store/shop/shop.models';
import {Action, BitPay} from '../../../../styles/colors';

const Selector = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const ChangeDenomButton = styled.View`
  height: 39px;
  width: 39px;
  border: 1px solid black;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px;
  border: 1px solid ${({theme}) => (theme.dark ? Action : BitPay)};
`;

const SelectedAmount = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? Action : BitPay)};
  font-size: 50px;
  font-weight: 500;
  min-width: 185px;
  padding: 0 15px;
  text-align: center;
`;

const getMiddleIndex = (arr: number[]) => arr && Math.floor(arr.length / 2);

export default ({cardConfig}: {cardConfig: CardConfig}) => {
  const amounts = cardConfig.supportedAmounts as number[];
  const [selectedIndex, setSelectedIndex] = useState(getMiddleIndex(amounts));
  return (
    <Selector>
      <TouchableWithoutFeedback
        onPress={() =>
          setSelectedIndex(selectedIndex > 1 ? selectedIndex - 1 : 0)
        }>
        <ChangeDenomButton style={{opacity: selectedIndex > 0 ? 1 : 0}}>
          <MinusSvg />
        </ChangeDenomButton>
      </TouchableWithoutFeedback>
      <SelectedAmount>
        {formatAmount(amounts[selectedIndex], cardConfig.currency, {
          customPrecision: 'minimal',
        })}
      </SelectedAmount>
      <TouchableWithoutFeedback
        onPress={() =>
          setSelectedIndex(
            selectedIndex < amounts.length - 1
              ? selectedIndex + 1
              : amounts.length - 1,
          )
        }>
        <ChangeDenomButton
          style={{opacity: selectedIndex < amounts.length - 1 ? 1 : 0}}>
          <PlusSvg />
        </ChangeDenomButton>
      </TouchableWithoutFeedback>
    </Selector>
  );
};
