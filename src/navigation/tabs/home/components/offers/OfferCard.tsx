import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {Linking} from 'react-native';
import styled from 'styled-components/native';
import Braze, {ContentCard} from '@braze/react-native-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch, useUrlEventHandler} from '../../../../../utils/hooks';
import {AppEffects} from '../../../../../store/app';
import {logManager} from '../../../../../managers/LogManager';
import {BaseText} from '../../../../../components/styled/Text';
import {
  Black,
  CharcoalBlack,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {getRouteParam} from '../../../../../store/app/app.effects';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

interface OfferCardProps {
  contentCard: ContentCard;
}

const OfferCard: React.FC<OfferCardProps> = props => {
  const {contentCard} = props;
  const {image, url, openURLInWebView} = contentCard;
  const dispatch = useAppDispatch();
  const urlEventHandler = useUrlEventHandler();
  let title = '';
  let description = '';
  let iconSource: Source | null = null;
  let coverImageSource: Source | null = null;

  if (isCaptionedContentCard(contentCard)) {
    title = contentCard.title || '';
    description = contentCard.cardDescription || '';
  } else if (isClassicContentCard(contentCard)) {
    title = contentCard.title || '';
    description = contentCard.cardDescription || '';
  }

  const coverImage = contentCard.extras?.cover_image;

  if (image) {
    iconSource = typeof image === 'string' ? {uri: image} : (image as Source);
  }

  if (coverImage) {
    coverImageSource =
      typeof coverImage === 'string'
        ? {uri: coverImage}
        : (coverImage as Source);
  }

  if (!title) {
    title = contentCard.id;
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

      if (handled) {
        const merchantName = getRouteParam(url, 'merchant');

        if (merchantName) {
          dispatch(
            Analytics.track('Clicked Shop with Crypto', {
              context: 'OfferCard',
              merchantName,
            }),
          );
        }

        return;
      }
    } catch (err) {
      logManager.debug('Something went wrong parsing offer URL: ' + url);
      logManager.debug(JSON.stringify(err));
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
    <OfferWrapper
      activeOpacity={0.9}
      onPress={_onPress}
      accessibilityRole="button">
      <CoverImageContainer>
        {coverImageSource ? (
          <CoverImage
            source={coverImageSource}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <CoverImageFallback />
        )}
      </CoverImageContainer>
      <OfferContent>
        {iconSource ? (
          <IconWrapper>
            <OfferIcon
              source={iconSource}
              resizeMode={FastImage.resizeMode.contain}
            />
          </IconWrapper>
        ) : null}
        <TextContainer>
          {title ? <OfferTitle numberOfLines={2}>{title}</OfferTitle> : null}
          {description ? (
            <OfferDescription numberOfLines={3}>{description}</OfferDescription>
          ) : null}
        </TextContainer>
      </OfferContent>
    </OfferWrapper>
  );
};

const OfferWrapper = styled(TouchableOpacity)`
  width: 250px;
  border-radius: 12px;
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  overflow: hidden;
`;

const CoverImageContainer = styled.View`
  width: 100%;
  height: 100px;
  overflow: hidden;
`;

const CoverImage = styled(FastImage)`
  width: 100%;
  height: 120px;
`;

const CoverImageFallback = styled.View`
  flex: 1;
`;

const OfferContent = styled.View`
  padding: 18px 20px 20px;
  background: ${({theme: {dark}}) => (dark ? CharcoalBlack : White)};
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
`;

const IconWrapper = styled.View`
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  margin-top: -39px;
  overflow: hidden;
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : Slate30)};
  border-radius: 40px;
`;

const OfferIcon = styled(FastImage)`
  width: 40px;
  height: 40px;
`;

const TextContainer = styled.View``;

const OfferTitle = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 6px;
`;

const OfferDescription = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

export default OfferCard;
