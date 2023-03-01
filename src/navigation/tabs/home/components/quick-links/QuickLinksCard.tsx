import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {Linking} from 'react-native';
import Braze, {ContentCard} from 'react-native-appboy-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import styled, {useTheme} from 'styled-components/native';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {
  ActiveOpacity,
  ScreenGutter,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
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
  padding: 11px 18px 11px 76px;
`;

const TitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 700;
  font-size: 12px;
  line-height: 15px;
  margin-bottom: 8px;
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
  left: 16px;
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

    haptic('impactLight');

    dispatch(
      Analytics.track('Clicked QuickLinks', {
        id: contentCard.id || '',
      }),
    );

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
    <QuickLinkCardContainer
      activeOpacity={ActiveOpacity}
      onPress={onPress}
      style={!theme.dark && BoxShadow}>
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
      <TextContainer>
        <TitleText>{title}</TitleText>
        <DescriptionText numberOfLines={2} ellipsizeMode={'tail'}>
          {description}
        </DescriptionText>
      </TextContainer>
    </QuickLinkCardContainer>
  );
};
export default QuickLinksCard;
