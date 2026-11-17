import React, {ReactElement, memo, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../contexts';
import {BaseText, ListItemSubText} from '../styled/Text';
import RemoteImage from '../../navigation/tabs/shop/components/RemoteImage';
import {TRANSACTION_ICON_SIZE} from '../../constants/TransactionIcons';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../currency-image/CurrencyImage';
export const TRANSACTION_ROW_HEIGHT = 75;
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useIsLargeFont} from '../../utils/hooks/useFontScale';

const styles = StyleSheet.create({
  transactionContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    minHeight: TRANSACTION_ROW_HEIGHT,
  },
  transactionContainerStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  tailContainer: {
    flexShrink: 0,
  },
  tailContainerStacked: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  valueStacked: {
    textAlign: 'left',
  },
  iconContainer: {
    marginRight: 8,
    height: 50,
    width: 50,
    display: 'flex',
    justifyContent: 'center',
  },
  descriptionContainer: {
    flexGrow: 1,
    flexShrink: 1,
    marginRight: 10,
  },
  description: {
    overflow: 'hidden',
    fontSize: 16,
  },
  value: {
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 16,
  },
  badgeContainer: {
    height: '54%',
    width: '54%',
    position: 'absolute',
    right: -2,
    bottom: 0,
  },
  iconSubContainer: {
    position: 'relative',
  },
});

interface Props {
  icon?: ReactElement;
  iconURI?: string;
  description?: string;
  details?: string;
  value?: string;
  time?: string;
  chain?: string;
  testID?: string;
  transaction?: unknown;
  onPressTransaction?: (transaction?: unknown) => void;
}

const TransactionRow = ({
  icon,
  iconURI,
  description,
  details,
  value,
  time,
  chain,
  testID,
  transaction,
  onPressTransaction,
}: Props) => {
  const theme = useTheme();
  const stacked = useIsLargeFont();
  const onPress = useCallback(
    () => onPressTransaction?.(transaction),
    [onPressTransaction, transaction],
  );

  return (
    <TouchableOpacity
      style={[
        styles.transactionContainer,
        stacked && styles.transactionContainerStacked,
      ]}
      testID={testID}
      onPress={onPressTransaction ? onPress : undefined}>
      {iconURI ? (
        <View style={styles.iconContainer}>
          <RemoteImage
            borderRadius={50}
            fallbackComponent={() => icon as React.JSX.Element}
            height={TRANSACTION_ICON_SIZE}
            uri={iconURI}
          />
        </View>
      ) : icon && chain ? (
        <View style={styles.iconContainer}>
          <View style={styles.iconSubContainer}>
            {icon}
            <View style={styles.badgeContainer}>
              <CurrencyImage img={CurrencyListIcons[chain]} size={20} />
            </View>
          </View>
        </View>
      ) : (
        icon && <View style={styles.iconContainer}>{icon}</View>
      )}
      {!!description && (
        <View style={styles.descriptionContainer}>
          <BaseText
            style={[styles.description, {color: theme.colors.text}]}
            numberOfLines={stacked ? undefined : details ? 2 : 1}
            ellipsizeMode={'tail'}>
            {description}
            {details && (
              <ListItemSubText>
                {'\n'}
                {details}
              </ListItemSubText>
            )}
          </BaseText>
        </View>
      )}
      <View
        style={[styles.tailContainer, stacked && styles.tailContainerStacked]}>
        {value ? (
          <BaseText
            style={[
              styles.value,
              stacked && styles.valueStacked,
              {color: theme.colors.text},
            ]}>
            {value}
          </BaseText>
        ) : null}
        {time ? (
          <ListItemSubText textAlign={stacked ? 'left' : 'right'}>
            {time}
          </ListItemSubText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default memo(TransactionRow);
