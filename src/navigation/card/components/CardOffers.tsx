import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {Linking} from 'react-native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import Braze, {ContentCard} from '@braze/react-native-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import styled, {useTheme} from 'styled-components/native';
import {
  ActiveOpacity,
  CardContainer,
} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import {APP_DEEPLINK_PREFIX} from '../../../constants/config';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {AppEffects} from '../../../store/app';
import {CardEffects} from '../../../store/card';
import {
  isCaptionedContentCard,
  isClassicContentCard,
} from '../../../utils/braze';
import {useAppDispatch} from '../../../utils/hooks';
import {BoxShadow} from '../../tabs/home/components/Styled';

interface CardOffersProps {
  contentCard: ContentCard;
  userEmail?: string;
}

const ICON_SIZE = 50;

const CardOffersOuterContainer = styled(CardContainer)`
  min-height: 78px;
`;

const CardOffersInnerContainer = styled(TouchableOpacity)`
  flex-direction: row;
  padding-left: 16px;
  padding-right: 16px;
  width: 100%;
`;

const MainColumn = styled.View`
  flex: 1 1 auto;
  padding: 14px 0;
`;

const IconColumn = styled.View`
  flex: 0 0 auto;
  justify-content: center;
  margin-left: 16px;
  padding: 14px 0;
`;

const TitleRow = styled(BaseText)`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
`;

const DescriptionRow = styled(BaseText)`
  color: ${({theme}) => theme.colors.description};
  font-size: 12px;
`;

const IconImage = styled(FastImage)`
  height: ${ICON_SIZE}px;
  width: ${ICON_SIZE}px;
`;

const CardOffers: React.FC<CardOffersProps> = props => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const {contentCard} = props;

  let title = 'Card Offers';
  let description = 'Earn cash back when you shop at top retailers.';
  let iconSource: Source | null = null;

  if (
    isCaptionedContentCard(contentCard) ||
    isClassicContentCard(contentCard)
  ) {
    title = contentCard.title;
    description = contentCard.cardDescription;
  }

  if (typeof contentCard.image === 'string') {
    iconSource = {uri: contentCard.image};
  } else {
    iconSource = contentCard.image as any;
  }

  const onPress = () => {
    if (!contentCard.id?.startsWith('dev_')) {
      Braze.logContentCardClicked(contentCard.id);

      dispatch(
        Analytics.track('Clicked Card Offer', {
          id: contentCard.id || '',
          context: 'Card Offers component',
        }),
      );
    }

    if (contentCard.url) {
      const url = contentCard.url;

      if (url.trim().startsWith(APP_DEEPLINK_PREFIX)) {
        dispatch(AppEffects.incomingLink(url));
      } else if (contentCard.openURLInWebView) {
        dispatch(AppEffects.openUrlWithInAppBrowser(url));
      } else {
        Linking.canOpenURL(url).then(canOpenUrl => {
          if (canOpenUrl) {
            Linking.openURL(url);
          }
        });
      }
    } else {
      dispatch(CardEffects.startOpenDosh());
    }
  };

  useFocusEffect(() => {
    if (!contentCard.id.startsWith('dev_')) {
      Braze.logContentCardImpression(contentCard.id);
    }
  });

  return (
    <CardOffersOuterContainer
      style={{
        ...(theme.dark ? {} : BoxShadow),
      }}>
      <CardOffersInnerContainer onPress={onPress} activeOpacity={ActiveOpacity}>
        <MainColumn>
          <TitleRow>{title}</TitleRow>

          <DescriptionRow>{description}</DescriptionRow>
        </MainColumn>

        {iconSource ? (
          <IconColumn>
            <IconImage source={iconSource} />
          </IconColumn>
        ) : null}
      </CardOffersInnerContainer>
    </CardOffersOuterContainer>
  );
};

export default CardOffers;
