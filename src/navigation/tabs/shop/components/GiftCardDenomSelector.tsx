import React from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import MinusSvg from '../../../../../assets/img/minus.svg';
import PlusSvg from '../../../../../assets/img/plus.svg';
import {BaseText} from '../../../../components/styled/Text';
import {CardConfig} from '../../../../store/shop/shop.models';
import {Action, BitPay} from '../../../../styles/colors';
import {formatFiatAmount} from '../../../../utils/helper-methods';
import {ActiveOpacity} from '../../../../components/styled/Containers';

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeDenomButton: {
    height: 39,
    width: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    borderWidth: 1,
  },
  selectedAmount: {
    fontSize: 50,
    fontWeight: '500',
    minWidth: 185,
    paddingHorizontal: 15,
    textAlign: 'center',
  },
});

const Selector = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.selector, style]} {...rest} />
);

const ChangeDenomButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.changeDenomButton,
        {borderColor: theme.dark ? Action : BitPay},
        style,
      ]}
      {...rest}
    />
  );
};

const SelectedAmount = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.selectedAmount,
        {color: theme.dark ? Action : BitPay},
        style,
      ]}
      {...rest}
    />
  );
};

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
