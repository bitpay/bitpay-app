import {useFocusEffect, useLinkTo} from '@react-navigation/native';
import React from 'react';
import {ImageStyle, Linking, StyleProp} from 'react-native';
import Braze, {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import {SvgProps} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {AppEffects} from '../../../../../store/app';
import {LogActions} from '../../../../../store/log';
import {
  LightBlack,
  Slate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch, useUrlEventHandler} from '../../../../../utils/hooks';
import {BoxShadow} from '../Styled';

interface AdvertisementCardProps {
  contentCard: ContentCard;
  ctaOverride?: () => void;
}

const isSvgComponent = (src: any): src is React.FC<SvgProps> => {
  return src && typeof src === 'function';
};

const AdvertisementCardContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
  overflow: hidden;
  padding: 16px 35px 16px 76px;
  position: relative;
`;

const AdvertisementCardTitle = styled(BaseText)`
  font-style: normal;
  font-weight: bold;
  font-size: 14px;
  line-height: 23px;
  margin-bottom: 5px;
  color: ${({theme}) => theme.colors.text};
`;

const AdvertisementCardDescription = styled(BaseText)`
  font-size: 12px;
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
`;

const IconContainer = styled.View`
  position: absolute;
  left: 16px;
`;

const ADVERTISEMENT_ICON_HEIGHT = 50;
const ADVERTISEMENT_ICON_WIDTH = 50;

const IconStyle: StyleProp<ImageStyle> = {
  height: ADVERTISEMENT_ICON_HEIGHT,
  width: ADVERTISEMENT_ICON_WIDTH,
};

const AdvertisementCard: React.FC<AdvertisementCardProps> = props => {
  const {contentCard, ctaOverride} = props;
  const {image, url, openURLInWebView} = contentCard;
  const urlEventHandler = useUrlEventHandler();
  const dispatch = useAppDispatch();
  const linkTo = useLinkTo();
  const theme = useTheme();

  let title = '';
  let description = '';
  let imageSource: Source | null = null;

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  if (image) {
    if (typeof image === 'string') {
      imageSource = {uri: image};
    } else {
      imageSource = image as any;
    }
  }

  const onPress = async () => {
    haptic('impactLight');

    if (!contentCard.id.startsWith('dev_')) {
      Braze.logContentCardClicked(contentCard.id);
    }

    if (ctaOverride) {
      ctaOverride();
      return;
    }

    if (!url) {
      return;
    }

    dispatch(
      Analytics.track('Clicked Advertisement', {
        id: contentCard.id || '',
      }),
    );

    if (url.startsWith(APP_DEEPLINK_PREFIX)) {
      try {
        const handled = await urlEventHandler({url});
        if (!handled) {
          const path = '/' + url.replace(APP_DEEPLINK_PREFIX, '');
          linkTo(path);
        }
        return;
      } catch (err) {
        dispatch(
          LogActions.debug('Something went wrong parsing Do More URL: ' + url),
        );
        dispatch(LogActions.debug(JSON.stringify(err)));
      }
    }

    if (openURLInWebView) {
      dispatch(AppEffects.openUrlWithInAppBrowser(url));
    } else {
      Linking.openURL(url);
    }
  };

  const MaybeSvgComponent = imageSource;
  const icon = isSvgComponent(MaybeSvgComponent) ? (
    <MaybeSvgComponent style={IconStyle} />
  ) : imageSource ? (
    imageSource.uri ? (
      <FastImage
        source={imageSource}
        style={IconStyle}
        resizeMode={'contain'}
      />
    ) : (
      imageSource
    )
  ) : null;

  useFocusEffect(() => {
    if (!contentCard.id.startsWith('dev_')) {
      Braze.logContentCardImpression(contentCard.id);
    }
  });

  return (
    <AdvertisementCardContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={!theme.dark && BoxShadow}>
      <AdvertisementCardTitle>{title}</AdvertisementCardTitle>
      <AdvertisementCardDescription>{description}</AdvertisementCardDescription>
      <IconContainer>{icon}</IconContainer>
    </AdvertisementCardContainer>
  );
};

export default AdvertisementCard;
