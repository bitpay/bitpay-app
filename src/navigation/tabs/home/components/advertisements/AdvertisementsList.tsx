import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import styled, {useTheme} from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import AdvertisementCard from './AdvertisementCard';
import {BoxShadow} from '../Styled';
import {useNavigation} from '@react-navigation/native';
import {useRequireKeyAndWalletRedirect} from '../../../../../utils/hooks/useRequireKeyAndWalletRedirect';
import {WalletScreens} from '../../../../wallet/WalletGroup';

interface AdvertisementListProps {
  contentCards: ContentCard[];
}

const AdvertisementListContainer = styled.View`
  margin-top: 10px;
  margin-bottom: 20px;
`;

const AdvertisementCardContainer = styled.View<{isLast: boolean}>`
  margin: 0 ${ScreenGutter} ${({isLast}) => (isLast ? 0 : 12)}px;
`;

const AdvertisementsList: React.FC<AdvertisementListProps> = props => {
  const {contentCards} = props;
  const theme = useTheme();
  const navigation = useNavigation();

  const buyCryptoCta = useRequireKeyAndWalletRedirect(() => {
    navigation.navigate(WalletScreens.AMOUNT, {
      onAmountSelected: (amount: string) => {
        navigation.navigate('BuyCryptoRoot', {
          amount: Number(amount),
        });
      },
      context: 'buyCrypto',
    });
  });
  const swapCryptoCta = useRequireKeyAndWalletRedirect(() => {
    navigation.navigate('SwapCryptoRoot');
  });
  const CTA_OVERRIDES: {[key in string]: () => void} = {
    dev_card: () =>
      navigation.navigate('Tabs', {
        screen: 'Card',
        params: {
          screen: 'CardHome',
        },
      }),
    dev_swapCrypto: swapCryptoCta,
    dev_buyCrypto: buyCryptoCta,
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
