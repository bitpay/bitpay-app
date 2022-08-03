import {useFocusEffect, useLinkTo} from '@react-navigation/native';
import React from 'react';
import {ImageStyle, Linking, StyleProp} from 'react-native';
import ReactAppboy, {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import {SvgProps} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {AppEffects} from '../../../../../store/app';
import {logSegmentEvent} from '../../../../../store/app/app.effects';
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
import {
  useAppDispatch,
  useLogger,
  useShopDeepLinkHandler,
} from '../../../../../utils/hooks';
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
  const shopDeepLinkHandler = useShopDeepLinkHandler();
  const dispatch = useAppDispatch();
  const linkTo = useLinkTo();
  const theme = useTheme();
  const logger = useLogger();

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

  const onPress = () => {
    haptic('impactLight');

    if (!contentCard.id.startsWith('dev_')) {
      ReactAppboy.logContentCardClicked(contentCard.id);
    }

    if (ctaOverride) {
      ctaOverride();
      return;
    }

    if (!url) {
      return;
    }

    dispatch(
      logSegmentEvent('track', 'Clicked Advertisement', {
        id: contentCard.id || '',
      }),
    );

    if (url.startsWith(APP_DEEPLINK_PREFIX)) {
      try {
        const pathInfo = shopDeepLinkHandler(url);
        if (!pathInfo) {
          const path = '/' + url.replace(APP_DEEPLINK_PREFIX, '');
          linkTo(path);
        }
        return;
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
        logger.debug(
          `AdvertisementCard: something went wrong parsing Do More URL: ${url}. ${errMsg}`,
        );
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
      ReactAppboy.logContentCardImpression(contentCard.id);
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
