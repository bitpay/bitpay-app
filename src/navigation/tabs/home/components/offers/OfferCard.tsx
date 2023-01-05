import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {Linking} from 'react-native';
import Braze, {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch, useUrlEventHandler} from '../../../../../utils/hooks';
import {AppEffects} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import LinkCard from '../cards/LinkCard';
import {
  getRouteParam,
  logSegmentEvent,
} from '../../../../../store/app/app.effects';

interface OfferCardProps {
  contentCard: ContentCard;
}

const OFFER_HEIGHT = 30;
const OFFER_WIDTH = 30;

const OfferCard: React.FC<OfferCardProps> = props => {
  const {contentCard} = props;
  const {image, url, openURLInWebView} = contentCard;
  const dispatch = useAppDispatch();
  const urlEventHandler = useUrlEventHandler();
  let description = '';
  let imageSource: Source | null = null;

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

  const _onPress = async () => {
    if (!contentCard.id.startsWith('dev_')) {
      Braze.logContentCardClicked(contentCard.id);
    }

    if (!url) {
      return;
    }

    haptic('impactLight');

    try {
      const handled = await urlEventHandler({url});
      const merchantName = getRouteParam(url, 'merchant');
      if (handled && merchantName) {
        dispatch(
          logSegmentEvent('track', 'Clicked Shop with Crypto', {
            context: 'OfferCard',
            merchantName,
          }),
        );
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

  useFocusEffect(() => {
    if (!contentCard.id.startsWith('dev_')) {
      Braze.logContentCardImpression(contentCard.id);
    }
  });

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
