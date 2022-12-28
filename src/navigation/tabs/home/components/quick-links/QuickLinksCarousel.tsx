import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard from './QuickLinksCard';
import {CarouselItemContainer} from '../Styled';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../../../../utils/hooks';

interface QuickLinksCarouselProps {
  contentCards: ContentCard[];
}

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({
  contentCards,
}) => {
  const navigation = useNavigation();
  const {sessions} = useAppSelector(({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2);
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);

  const CTA_OVERRIDES: {[key in string]: () => void} = {
    dev_walletConnect: () => {
      if (Object.keys(sessions).length || Object.keys(connectors).length) {
        navigation.navigate('WalletConnect', {
          screen: 'WalletConnectConnections',
        });
      } else {
        navigation.navigate('WalletConnect', {
          screen: 'Root',
          params: {uri: undefined},
        });
      }
    },
  };

  return (
    <Carousel<ContentCard>
      vertical={false}
      layout={'default'}
      useExperimentalSnap={true}
      data={contentCards}
      renderItem={({item}: {item: ContentCard}) => (
        <CarouselItemContainer>
          <QuickLinksCard
            contentCard={item}
            ctaOverride={CTA_OVERRIDES[item.id]}
          />
        </CarouselItemContainer>
      )}
      sliderWidth={WIDTH}
      itemWidth={225}
      inactiveSlideScale={1}
      inactiveSlideOpacity={1}
    />
  );
};

export default QuickLinksCarousel;
