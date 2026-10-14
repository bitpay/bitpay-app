import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../../styles/colors';
import {useAppSelector} from '../../../../utils/hooks';
import {isUnitedKingdomCountry} from '../../../../store/location/location.effects';

const UK_EXCHANGE_RATE_DISCLOSURES = [
  'Past performance is not a reliable indicator of future results.',
  'Market data provided by Coingecko and updated every 5 minutes.',
  'Tap the graph to see period information.',
];

const styles = StyleSheet.create({
  disclosureContainer: {
    marginTop: 10,
    marginHorizontal: 12,
    marginBottom: 18,
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  disclosureBullet: {
    width: 16,
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 15,
  },
  disclosureText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 15,
  },
});

const UkExchangeRateDisclosures = () => {
  const theme = useTheme();
  const isUkLocation = useAppSelector(({LOCATION}) => {
    return isUnitedKingdomCountry(LOCATION.locationData?.countryShortCode);
  });

  if (!isUkLocation) {
    return null;
  }

  const textColor = theme.dark ? Slate30 : SlateDark;

  return (
    <View style={styles.disclosureContainer}>
      {UK_EXCHANGE_RATE_DISCLOSURES.map(disclosure => (
        <View style={styles.disclosureRow} key={disclosure}>
          <BaseText style={[styles.disclosureBullet, {color: textColor}]}>
            {'\u2022'}
          </BaseText>
          <BaseText style={[styles.disclosureText, {color: textColor}]}>
            {disclosure}
          </BaseText>
        </View>
      ))}
    </View>
  );
};

export default UkExchangeRateDisclosures;
