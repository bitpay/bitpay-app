import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {
  Linking,
  View,
  ViewProps,
  Text,
  TextProps,
  StyleSheet,
} from 'react-native';
import {
  TouchableOpacity,
  TouchableOpacityProps,
} from '@components/base/TouchableOpacity';
import Braze, {ContentCard} from '@braze/react-native-sdk';
import FastImage, {FastImageProps, Source} from 'react-native-fast-image';
import {useTheme} from '../../../contexts';
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

const styles = StyleSheet.create({
  cardOffersOuterContainer: {
    minHeight: 78,
  },
  cardOffersInnerContainer: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    width: '100%',
  },
  mainColumn: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingVertical: 14,
  },
  iconColumn: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    justifyContent: 'center',
    marginLeft: 16,
    paddingVertical: 14,
  },
  titleRow: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  descriptionRow: {
    fontSize: 12,
  },
  iconImage: {
    height: ICON_SIZE,
    width: ICON_SIZE,
  },
});

const CardOffersOuterContainer = React.forwardRef<View, ViewProps>(
  ({style, ...rest}, ref) => (
    <CardContainer
      ref={ref}
      style={[styles.cardOffersOuterContainer, style]}
      {...rest}
    />
  ),
);

const CardOffersInnerContainer: React.FC<TouchableOpacityProps> = ({
  style,
  ...rest
}) => (
  <TouchableOpacity
    style={[styles.cardOffersInnerContainer, style]}
    {...rest}
  />
);

const MainColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.mainColumn, style]} {...rest} />
);

const IconColumn = ({style, ...rest}: ViewProps) => (
  <View style={[styles.iconColumn, style]} {...rest} />
);

const TitleRow = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <BaseText ref={ref} style={[styles.titleRow, style]} {...rest} />
));

const DescriptionRow = React.forwardRef<Text, TextProps>(
  ({style, ...rest}, ref) => {
    const theme = useTheme();
    return (
      <BaseText
        ref={ref}
        style={[
          styles.descriptionRow,
          {color: theme.colors.description},
          style,
        ]}
        {...rest}
      />
    );
  },
);

const IconImage = (props: FastImageProps) => (
  <FastImage {...props} style={[styles.iconImage, props.style]} />
);

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
