import React from 'react';
import {ContentCard} from '@braze/react-native-sdk';
import Carousel from 'react-native-reanimated-carousel';
import {WIDTH} from '../../../../../components/styled/Containers';
import QuickLinksCard from './QuickLinksCard';
import {CarouselItemContainer} from '../Styled';
import {useNavigation} from '@react-navigation/native';
import {useAppSelector} from '../../../../../utils/hooks';

interface QuickLinksCarouselProps {
  contentCards: ContentCard[];
}

const itemWidth = 225;
const itemHeight = 125;

const QuickLinksCarousel: React.FC<QuickLinksCarouselProps> = ({
  contentCards,
}) => {
  const navigation = useNavigation();
  const sessions = useAppSelector(
    ({WALLET_CONNECT_V2}) => WALLET_CONNECT_V2.sessions,
  );

  const CTA_OVERRIDES: {[key in string]: () => void} = {
    dev_walletConnect: () => {
      if (Object.keys(sessions).length) {
        navigation.navigate('WalletConnectConnections');
      } else {
        navigation.navigate('WalletConnectRoot', {});
      }
    },
    dev_zenLedger: () => {
      navigation.navigate('ZenLedgerRoot');
    },
  };

  return (
    <Carousel
      loop={false}
      vertical={false}
      style={{width: WIDTH}}
      width={itemWidth}
      height={itemHeight}
      autoPlay={false}
      data={contentCards}
      scrollAnimationDuration={1000}
      enabled={true}
      renderItem={({item}: {item: ContentCard}) => (
        <CarouselItemContainer>
          <QuickLinksCard
            contentCard={item}
            ctaOverride={CTA_OVERRIDES[item.id]}
          />
        </CarouselItemContainer>
      )}
    />
  );
};

export default QuickLinksCarousel;
