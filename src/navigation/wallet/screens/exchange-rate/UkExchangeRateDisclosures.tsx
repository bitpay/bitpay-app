import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../components/styled/Containers';
import {BaseText} from '../../../../components/styled/Text';
import {Slate30, SlateDark} from '../../../../styles/colors';
import {useAppSelector} from '../../../../utils/hooks';
import {isUnitedKingdomCountry} from '../../../../store/location/location.effects';

const UK_EXCHANGE_RATE_DISCLOSURES = [
  'Past performance is not a reliable indicator of future results.',
  'Market data provided by Coingecko and updated every 5 minutes.',
  'Tap the graph to see period information.',
];

const DisclosureContainer = styled.View`
  margin: 10px ${ScreenGutter} 18px;
`;

const DisclosureRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 4px;
`;

const DisclosureBullet = styled(BaseText)`
  width: 16px;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const DisclosureText = styled(BaseText)`
  flex: 1;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const UkExchangeRateDisclosures = () => {
  const isUkLocation = useAppSelector(({LOCATION}) => {
    return isUnitedKingdomCountry(LOCATION.locationData?.countryShortCode);
  });

  if (!isUkLocation) {
    return null;
  }

  return (
    <DisclosureContainer>
      {UK_EXCHANGE_RATE_DISCLOSURES.map(disclosure => (
        <DisclosureRow key={disclosure}>
          <DisclosureBullet>{'\u2022'}</DisclosureBullet>
          <DisclosureText>{disclosure}</DisclosureText>
        </DisclosureRow>
      ))}
    </DisclosureContainer>
  );
};

export default UkExchangeRateDisclosures;
