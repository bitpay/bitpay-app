import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import {SvgProps} from 'react-native-svg';
import styled, {useTheme} from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {AppEffects} from '../../../../../store/app';
import {LightBlack, SlateDark, White} from '../../../../../styles/colors';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch} from '../../../../../utils/hooks';
import {BoxShadow} from '../Styled';

interface AdvertisementCardProps {
  contentCard: ContentCard;
  ctaOverride?: () => void;
}

const isSvgComponent = (src: any): src is React.FC<SvgProps> => {
  return src && src.name === 'SvgComponent';
};

const AdvertisementCardContainer = styled.TouchableOpacity`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 12px;
  flex-direction: column;
  justify-content: center;
  min-height: 100px;
  overflow: hidden;
  padding: 20px 100px 20px 20px;
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
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ADVERTISEMENT_ICON_HEIGHT = 50;
const ADVERTISEMENT_ICON_WIDTH = 50;

const IconStyle: StyleProp<ViewStyle & ImageStyle> = {
  height: ADVERTISEMENT_ICON_HEIGHT,
  width: ADVERTISEMENT_ICON_WIDTH,
  right: 10,
  position: 'absolute',
};

const AdvertisementCard: React.FC<AdvertisementCardProps> = props => {
  const {contentCard, ctaOverride} = props;
  const {image, url, openURLInWebView} = contentCard;
  const dispatch = useAppDispatch();
  const theme = useTheme();
  let title = '';
  let description = '';
  let imageSource: ImageSourcePropType | null = null;

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
    if (ctaOverride) {
      ctaOverride();
      return;
    }

    if (!url) {
      return;
    }

    haptic('impactLight');

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
    <Image
      source={imageSource}
      style={IconStyle}
      height={ADVERTISEMENT_ICON_HEIGHT}
      width={ADVERTISEMENT_ICON_WIDTH}
    />
  ) : null;

  return (
    <AdvertisementCardContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={!theme.dark && BoxShadow}>
      <AdvertisementCardTitle>{title}</AdvertisementCardTitle>
      <AdvertisementCardDescription>{description}</AdvertisementCardDescription>
      {icon}
    </AdvertisementCardContainer>
  );
};

export default AdvertisementCard;
