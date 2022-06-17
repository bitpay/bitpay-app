import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import {Carousel} from 'react-native-snap-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard from './QuickLinksCard';
import {CarouselItemContainer} from '../Styled';
import {useNavigation} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {logSegmentEvent} from '../../../../../store/app/app.effects';

interface QuickLinksCarouselProps {
  contentCards: ContentCard[];
}

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({
  contentCards,
}) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const {connectors} = useAppSelector(({WALLET_CONNECT}) => WALLET_CONNECT);

  const CTA_OVERRIDES: {[key in string]: () => void} = {
    dev_walletConnect: () => {
      if (Object.keys(connectors).length) {
        dispatch(
          logSegmentEvent('track', 'Clicked WalletConnect', {
            context: 'QuickLinks',
          }),
        );
        navigation.navigate('WalletConnect', {
          screen: 'WalletConnectConnections',
        });
      } else {
        dispatch(
          logSegmentEvent('track', 'Clicked Leave Feedback', {
            context: 'QuickLinks',
          }),
        );
        navigation.navigate('WalletConnect', {
          screen: 'Root',
          params: {uri: undefined},
        });
      }
    },
  };

  return (
    <Carousel<ContentCard>
      containerCustomStyle={{
        marginTop: 20,
      }}
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
