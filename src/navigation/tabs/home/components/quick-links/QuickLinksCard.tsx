import React from 'react';
import {Linking} from 'react-native';
import {ContentCard} from 'react-native-appboy-sdk';
import styled, {useTheme} from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {AppEffects} from '../../../../../store/app';
import {
  Action,
  LightBlack,
  Slate,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../../../utils/braze';
import {useAppDispatch} from '../../../../../utils/hooks';
import {BoxShadow} from '../Styled';
import FastImage, {Source} from 'react-native-fast-image';

const QUICK_LINK_ICON_HEIGHT = 35;
const QUICK_LINK_ICON_WIDTH = 35;

interface QuickLinksCardProps {
  contentCard: ContentCard;
  ctaOverride?: () => void;
}

const QuickLinkCardContainer = styled.TouchableOpacity`
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  width: 202px;
  height: 91px;
  border-radius: 12px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  left: ${ScreenGutter};
  position: relative;
`;

const TextContainer = styled.View`
  padding: 20px 0 20px 20px;
  width: 130px;
`;

const TitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 700;
  font-size: 12px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;
const DescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
`;

const IconContainer = styled.View`
  position: absolute;
  right: 20px;
`;

const QuickLinksCard: React.FC<QuickLinksCardProps> = props => {
  const {contentCard, ctaOverride} = props;
  const {image, url, openURLInWebView} = contentCard;
  const dispatch = useAppDispatch();
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

  return (
    <QuickLinkCardContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={!theme.dark && BoxShadow}>
      <TextContainer>
        <TitleText>{title}</TitleText>
        <DescriptionText numberOfLines={2} ellipsizeMode={'tail'}>
          {description}
        </DescriptionText>
      </TextContainer>
      {imageSource ? (
        <IconContainer>
          <FastImage
            resizeMode={'contain'}
            style={{
              height: QUICK_LINK_ICON_HEIGHT,
              width: QUICK_LINK_ICON_WIDTH,
            }}
            source={imageSource}
          />
        </IconContainer>
      ) : null}
    </QuickLinkCardContainer>
  );
};
export default QuickLinksCard;
