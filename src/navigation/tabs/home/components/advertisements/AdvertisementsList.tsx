import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import styled, {useTheme} from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import AdvertisementCard from './AdvertisementCard';
import {BoxShadow} from '../Styled';
import {useNavigation} from '@react-navigation/native';
import {useRequireKeyAndWalletRedirect} from '../../../../../utils/hooks/useRequireKeyAndWalletRedirect';
import analytics from '@segment/analytics-react-native';

interface AdvertisementListProps {
  contentCards: ContentCard[];
}

const AdvertisementListContainer = styled.View`
  margin-top: 40px;
`;

const AdvertisementCardContainer = styled.View<{isLast: boolean}>`
  margin: 0 ${ScreenGutter} ${({isLast}) => (isLast ? 0 : 12)}px;
`;

const AdvertisementsList: React.FC<AdvertisementListProps> = props => {
  const {contentCards} = props;
  const theme = useTheme();
  const navigation = useNavigation();
  const buyCryptoCta = useRequireKeyAndWalletRedirect(() => {
    analytics.track('BitPay App - Clicked Buy Crypto', {
      from: 'Advertisement',
    });
    navigation.navigate('Wallet', {
      screen: 'Amount',
      params: {
        onAmountSelected: (amount: string) => {
          navigation.navigate('BuyCrypto', {
            screen: 'Root',
            params: {
              amount: Number(amount),
            },
          });
        },
        opts: {
          hideSendMax: true,
        },
      },
    });
  });
  const CTA_OVERRIDES: {[key in string]: () => void} = {
    card: () => navigation.navigate('Card', {screen: 'Home'}),
    swapCrypto: () => {
      analytics.track('BitPay App - Clicked Swap Crypto', {
        from: 'Advertisement',
      });
      navigation.navigate('SwapCrypto', {screen: 'Root'});
    },
    buyCrypto: buyCryptoCta,
  };

  return (
    <AdvertisementListContainer>
      {contentCards.map((contentCard, idx) => (
        <AdvertisementCardContainer
          style={!theme.dark && BoxShadow}
          key={contentCard.id}
          isLast={idx === contentCards.length - 1}>
          <AdvertisementCard
            contentCard={contentCard}
            ctaOverride={CTA_OVERRIDES[contentCard.id]}
          />
        </AdvertisementCardContainer>
      ))}
    </AdvertisementListContainer>
  );
};

export default AdvertisementsList;
