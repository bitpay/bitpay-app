import React from 'react';
import {useTheme} from '../../../../../contexts';
import {CurrencyImage} from '../../../../../components/currency-image/CurrencyImage';
import {
  ActiveOpacity,
  Column,
  CurrencyColumn,
  CurrencyImageContainer,
} from '../../../../../components/styled/Containers';
import {H7, Smallest, BaseText} from '../../../../../components/styled/Text';
import {
  formatCurrencyAbbreviation,
  formatFiatAmountObj,
} from '../../../../../utils/helper-methods';
import {ExchangeRateItemProps} from './ExchangeRatesList';
import {NeutralSlate, Slate30, SlateDark} from '../../../../../styles/colors';
import {StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import Percentage from '../../../../../components/percentage/Percentage';

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  noteContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  subTextContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  exchangeRateText: {
    fontSize: 16,
    fontWeight: '400',
  },
  exchangeRateCode: {
    fontWeight: '500',
    fontSize: 10,
    paddingLeft: 2,
  },
  exchangeRateSubText: {
    lineHeight: 20,
    fontSize: 13,
  },
});

const RowContainer: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => <TouchableOpacity style={[styles.rowContainer, style]} {...rest} />;

const NoteContainer: React.FC<React.ComponentProps<typeof Column>> = ({
  style,
  ...rest
}) => <Column style={[styles.noteContainer, style]} {...rest} />;

const SubTextContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={styles.subTextContainer}>{children}</View>;

const ExchangeRateText: React.FC<React.ComponentProps<typeof H7>> = ({
  style,
  ...rest
}) => <H7 style={[styles.exchangeRateText, style]} {...rest} />;

const ExchangeRateCode: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.exchangeRateCode,
        {color: theme.dark ? NeutralSlate : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

const ExchangeRateSubText: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <Smallest
      style={[
        styles.exchangeRateSubText,
        {color: theme.dark ? Slate30 : SlateDark},
      ]}>
      {children}
    </Smallest>
  );
};

const ExchangeRateItem = ({
  item,
  onPress,
  defaultAltCurrencyIsoCode,
}: {
  item: ExchangeRateItemProps;
  onPress: () => void;
  defaultAltCurrencyIsoCode: string;
}) => {
  const {img, currencyName, currentPrice, average, currencyAbbreviation} = item;

  const {amount, code} = formatFiatAmountObj(
    currentPrice!,
    defaultAltCurrencyIsoCode,
    {
      customPrecision: 'minimal',
      currencyAbbreviation,
    },
  );

  return (
    <RowContainer
      activeOpacity={ActiveOpacity}
      testID={`home-exchange-rate-item-${item.id}`}
      accessibilityLabel={`${currencyName} exchange rate`}
      onPress={onPress}>
      <CurrencyImageContainer style={{width: 40, height: 40}}>
        <CurrencyImage img={img} size={40} />
      </CurrencyImageContainer>
      <CurrencyColumn>
        <ExchangeRateText ellipsizeMode="tail" numberOfLines={1}>
          {currencyName}
        </ExchangeRateText>
        {currencyAbbreviation ? (
          <ExchangeRateSubText>
            {formatCurrencyAbbreviation(currencyAbbreviation)}
          </ExchangeRateSubText>
        ) : null}
      </CurrencyColumn>
      <NoteContainer>
        {currentPrice ? (
          <>
            <ExchangeRateText>
              {amount}
              {code ? (
                <View>
                  <ExchangeRateCode>{code}</ExchangeRateCode>
                </View>
              ) : null}
            </ExchangeRateText>
            <SubTextContainer>
              <Percentage percentageDifference={average || 0} hideArrow />
            </SubTextContainer>
          </>
        ) : null}
      </NoteContainer>
    </RowContainer>
  );
};

export default ExchangeRateItem;
