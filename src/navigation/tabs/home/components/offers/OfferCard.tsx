import React from 'react';
import {Image, ImageSourcePropType, Linking} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {AppEffects} from '../../../../../store/app';
import {getStateFromPath, useNavigation} from '@react-navigation/native';
import {selectAvailableGiftCards} from '../../../../../store/shop/shop.selectors';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {LogActions} from '../../../../../store/log';
import LinkCard from '../cards/LinkCard';

interface OfferCardProps {
  contentCard: ContentCard;
}

const OFFER_HEIGHT = 30;
const OFFER_WIDTH = 30;

const OfferCard: React.FC<OfferCardProps> = props => {
  const {contentCard} = props;
  const {image, url, openURLInWebView} = contentCard;
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  let description = '';
  let imageSource: ImageSourcePropType | null = null;

  const availableGiftCards = useAppSelector(selectAvailableGiftCards);

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    description = contentCard.cardDescription;
  }

  if (image) {
    if (typeof image === 'string') {
      imageSource = {uri: image};
    } else if (__DEV__) {
      imageSource = image as any;
    }
  }

  const _onPress = () => {
    if (!url) {
      return;
    }

    haptic('impactLight');

    try {
      const path = url.replace(APP_DEEPLINK_PREFIX, '');
      const maybeParsedState = getStateFromPath(path);

      if (maybeParsedState?.routes.length) {
        const route = maybeParsedState.routes[0];

        if (route.name === 'giftcard') {
          if (route.params) {
            const merchantName = (
              (route.params as any).merchant || ''
            ).toLowerCase();
            const cardConfig = availableGiftCards.find(
              giftCard => giftCard.name.toLowerCase() === merchantName,
            );

            if (cardConfig) {
              navigation.navigate('GiftCard', {
                screen: 'BuyGiftCard',
                params: {
                  cardConfig,
                },
              });

              return;
            }
          }

          navigation.navigate('Shop', {
            screen: 'Home',
          });

          return;
        }
      }
    } catch (err) {
      dispatch(
        LogActions.debug('Something went wrong parsing offer URL: ' + url),
      );
      dispatch(LogActions.debug(JSON.stringify(err)));
    }

    if (openURLInWebView) {
      dispatch(AppEffects.openUrlWithInAppBrowser(url));
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <LinkCard
      image={() =>
        imageSource && (
          <Image
            style={{
              height: OFFER_HEIGHT,
              width: OFFER_WIDTH,
            }}
            height={OFFER_HEIGHT}
            width={OFFER_WIDTH}
            source={imageSource}
          />
        )
      }
      description={description}
      onPress={_onPress}
    />
  );
};

export default OfferCard;
