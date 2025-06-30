import React from 'react';
import {TouchableOpacity} from 'react-native-gesture-handler';
import styled from 'styled-components/native';
import MinusSvg from '../../../../../assets/img/minus.svg';
import PlusSvg from '../../../../../assets/img/plus.svg';
import {BaseText} from '../../../../components/styled/Text';
import {CardConfig} from '../../../../store/shop/shop.models';
import {Action, BitPay} from '../../../../styles/colors';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {ActiveOpacity} from '../../../../components/styled/Containers';

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

export default ({
  cardConfig,
  selectedIndex,
  onChange,
}: {
  cardConfig: CardConfig;
  selectedIndex: number;
  onChange: (value: number) => void;
}) => {
  const amounts = cardConfig.supportedAmounts as number[];
  return (
    <Selector>
      <TouchableOpacity
        activeOpacity={ActiveOpacity}
        onPress={() => {
          const newSelectedIndex = selectedIndex > 1 ? selectedIndex - 1 : 0;
          onChange(newSelectedIndex);
        }}>
        <ChangeDenomButton style={{opacity: selectedIndex > 0 ? 1 : 0}}>
          <MinusSvg />
        </ChangeDenomButton>
      </TouchableOpacity>
      <SelectedAmount>
        {formatFiatAmount(amounts[selectedIndex], cardConfig.currency, {
          customPrecision: 'minimal',
          currencyDisplay: 'symbol',
        })}
      </SelectedAmount>
      <TouchableOpacity
        activeOpacity={ActiveOpacity}
        onPress={() => {
          const newSelectedIndex =
            selectedIndex < amounts.length - 1
              ? selectedIndex + 1
              : amounts.length - 1;
          onChange(newSelectedIndex);
        }}>
        <ChangeDenomButton
          style={{opacity: selectedIndex < amounts.length - 1 ? 1 : 0}}>
          <PlusSvg />
        </ChangeDenomButton>
      </TouchableOpacity>
    </Selector>
  );
};
