import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import {Slate30, SlateDark} from '../../styles/colors';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import {H7} from '../styled/Text';
import {CurrencyOpts} from '../../constants/currencies';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  chainSelectionRowContainer: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'column',
    marginTop: 0,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
  },
  flexRow: {
    flexDirection: 'row',
  },
  currencyColumn: {
    justifyContent: 'center',
    marginRight: 8,
  },
  currencyTitleColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
  },
  currencyTitle: {
    margin: 0,
    padding: 0,
  },
});

interface ChainSelectionRowProps {
  chainObj: CurrencyOpts;
  onToggle: (currencyAbbreviation: string, chain: string) => any;
}

export const ChainSelectionRow: React.FC<ChainSelectionRowProps> = memo(
  props => {
    const {onToggle, chainObj} = props;
    const {coin: currencyAbbreviation, chain, img, name} = chainObj;
    const theme = useTheme();

    return (
      <View
        style={[
          styles.chainSelectionRowContainer,
          {borderColor: theme.dark ? SlateDark : Slate30},
        ]}
        testID={`currency-selection-container-${chain}`}>
        <TouchableOpacity
          style={styles.flexRow}
          testID={`chain-selection-row-${currencyAbbreviation}-${chain}`}
          accessibilityLabel={`${name} chain selection`}
          onPress={() => onToggle(currencyAbbreviation, chain)}>
          <View style={styles.currencyColumn}>
            <CurrencyImage img={img!} />
          </View>

          <View style={[styles.currencyTitleColumn, {flexGrow: 1}]}>
            <H7 medium style={styles.currencyTitle}>
              {name}
            </H7>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);
