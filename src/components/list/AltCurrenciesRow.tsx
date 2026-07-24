import React, {memo} from 'react';
import {StyleSheet, TouchableHighlight, View} from 'react-native';
import {BaseText} from '../styled/Text';
import {
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Black,
  Slate30,
  GhostWhite,
} from '../../styles/colors';
import {useTheme} from '../../contexts';
import {Column} from '../styled/Containers';
import {useTranslation} from 'react-i18next';

const styles = StyleSheet.create({
  altCurrencyContainer: {
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  altCurrencyName: {
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 19,
  },
  altCurrencyNameSelected: {
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 18,
  },
  altCurrencyIsoCodeContainer: {
    width: 60,
    height: 40,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isoCodeNameLabel: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  selectedLabel: {
    fontWeight: '400',
    paddingBottom: 2,
  },
  rowContainer: {
    flexDirection: 'row',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export interface AltCurrenciesRowProps {
  isoCode: string;
  name: string;
}

interface Props {
  altCurrency: AltCurrenciesRowProps;
  selected: boolean;
  onPress: () => void;
}

const AltCurrencyRow = ({altCurrency, selected, onPress}: Props) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const underlayColor = theme.colors.background;
  const {isoCode, name} = altCurrency;
  return (
    <TouchableHighlight
      style={[
        styles.altCurrencyContainer,
        selected
          ? {backgroundColor: theme.dark ? LightBlack : GhostWhite}
          : null,
      ]}
      underlayColor={underlayColor}
      onPress={onPress}>
      <View style={styles.rowContainer}>
        <Column>
          {selected ? (
            <BaseText
              style={[
                styles.selectedLabel,
                {color: theme.dark ? White : Black},
              ]}>
              {t('Selected')}
            </BaseText>
          ) : null}
          <BaseText
            style={[
              styles.altCurrencyName,
              {color: theme.dark ? White : Black},
              selected ? styles.altCurrencyNameSelected : null,
            ]}>
            {name}
          </BaseText>
        </Column>
        <View
          style={[
            styles.altCurrencyIsoCodeContainer,
            {backgroundColor: theme.dark ? LightBlack : NeutralSlate},
            selected
              ? {backgroundColor: theme.dark ? SlateDark : Slate30}
              : null,
          ]}>
          <BaseText
            style={[
              styles.isoCodeNameLabel,
              {color: theme.dark ? White : SlateDark},
            ]}>
            {isoCode}
          </BaseText>
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default memo(AltCurrencyRow);
