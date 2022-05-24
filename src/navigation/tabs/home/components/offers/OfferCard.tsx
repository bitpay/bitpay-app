import {getStateFromPath, useNavigation} from '@react-navigation/native';
import React from 'react';
import {Linking} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {AppEffects} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import {
  selectAvailableGiftCards,
  selectIntegrations,
} from '../../../../../store/shop/shop.selectors';
import {ShopTabs} from '../../../shop/ShopHome';
import LinkCard from '../cards/LinkCard';
import {ShopScreens} from '../../../shop/ShopStack';

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
  let imageSource: Source | null = null;

  const availableGiftCards = useAppSelector(selectAvailableGiftCards);
  const integrations = useAppSelector(selectIntegrations);

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    description = contentCard.cardDescription;
  }

  if (image) {
    if (typeof image === 'string') {
      imageSource = {uri: image};
    } else {
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
      const state = getStateFromPath(path);

      if (!state?.routes.length) {
        return;
      }

      const route = state.routes[0];

      if (!route.params) {
        return;
      }

      const merchantName = ((route.params as any).merchant || '').toLowerCase();

      if (route.name === 'giftcard') {
        const cardConfig = availableGiftCards.find(
          gc => gc.name.toLowerCase() === merchantName,
        );

        if (cardConfig) {
          navigation.navigate('GiftCard', {
            screen: 'BuyGiftCard',
            params: {
              cardConfig,
            },
          });
        } else {
          navigation.navigate('Shop', {
            screen: ShopScreens.HOME,
            params: {
              screen: ShopTabs.GIFT_CARDS,
            },
          });
        }
      } else if (route.name === 'shoponline') {
        const directIntegration = integrations.find(
          i => i.displayName.toLowerCase() === merchantName,
        );

        if (directIntegration) {
          navigation.navigate('Merchant', {
            screen: 'MerchantDetails',
            params: {
              directIntegration,
            },
          });
        } else {
          navigation.navigate('Shop', {
            screen: ShopScreens.HOME,
            params: {
              screen: ShopTabs.SHOP_ONLINE,
            },
          });
        }
      }

      return;
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
          <FastImage
            style={{
              height: OFFER_HEIGHT,
              width: OFFER_WIDTH,
            }}
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
