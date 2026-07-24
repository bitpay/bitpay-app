import React, {memo, useCallback} from 'react';
import {ImageRequireSource, StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import {IS_ANDROID} from '../../constants';
import {SupportedCurrencyOption} from '../../constants/SupportedCurrencyOptions';
import {CurrencySelectionMode} from '../../navigation/wallet/screens/CurrencySelection';
import {LightBlack, LuckySevens, Slate30, SlateDark} from '../../styles/colors';
import {formatCurrencyAbbreviation} from '../../utils/helper-methods';
import {CurrencyImage} from '../currency-image/CurrencyImage';
import haptic from '../haptic-feedback/haptic';
import {BaseText, H7} from '../styled/Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import ChevronRightSvg from '../../../assets/img/angle-right.svg';

export type CurrencySelectionItem = Pick<
  SupportedCurrencyOption,
  | 'id'
  | 'currencyAbbreviation'
  | 'currencyName'
  | 'img'
  | 'isToken'
  | 'badgeUri'
> & {
  chain: string;
  chainName?: string;
  imgSrc?: ImageRequireSource | undefined;
  selected?: boolean;
  disabled?: boolean;
};

export type CurrencySelectionRowProps = {
  currency: CurrencySelectionItem;
  hideCheckbox?: boolean;
  hideChevron?: boolean;
  disableCheckbox?: boolean;
  selectionMode?: CurrencySelectionMode;
  onToggle?: (currencyAbbreviation: string, chain: string) => void;
};

const styles = StyleSheet.create({
  rowContainer: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
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
  currencySubTitle: {
    fontSize: 12,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const CurrencySelectionRow: React.FC<CurrencySelectionRowProps> = ({
  currency,
  onToggle,
}) => {
  const theme = useTheme();
  const {
    currencyAbbreviation,
    currencyName,
    img,
    imgSrc,
    badgeUri,
    disabled,
    chain,
  } = currency;

  const onPress = useCallback((): void => {
    if (disabled) {
      return;
    }
    haptic(IS_ANDROID ? 'keyboardPress' : 'impactLight');
    onToggle?.(currencyAbbreviation, chain);
  }, [currencyAbbreviation, chain, disabled, onToggle]);

  return (
    <TouchableOpacity
      style={[
        styles.rowContainer,
        {borderColor: theme.dark ? LightBlack : Slate30},
        {borderWidth: 0, marginBottom: 0},
      ]}
      testID={`currency-selection-row-${currencyAbbreviation}-${chain}`}
      accessibilityLabel={`${currencyName} currency selection`}
      onPress={onPress}>
      <View style={styles.currencyColumn}>
        <CurrencyImage img={img} imgSrc={imgSrc} badgeUri={badgeUri} />
      </View>

      <View style={styles.currencyTitleColumn}>
        <H7 medium style={styles.currencyTitle}>
          {currencyName}
        </H7>
        <BaseText
          style={[
            styles.currencySubTitle,
            {color: theme.dark ? LuckySevens : SlateDark},
          ]}>
          {formatCurrencyAbbreviation(currencyAbbreviation)}
        </BaseText>
      </View>

      <View style={styles.chevronContainer}>
        <ChevronRightSvg height={16} width={16} />
      </View>
    </TouchableOpacity>
  );
};

export default memo(CurrencySelectionRow);
