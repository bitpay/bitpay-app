import {useFocusEffect} from '@react-navigation/native';
import React from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../../contexts';
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
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.debug(
        'Something went wrong parsing offer URL: ' + url,
        errStr,
      );
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
      accessibilityRole="button"
      testID={`home-offer-card-button-${contentCard.id}`}
      accessibilityLabel={title ? `${title} offer` : 'View offer'}>
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

const offerStyles = StyleSheet.create({
  offerWrapper: {
    width: 250,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  coverImageContainer: {
    width: '100%',
    height: 100,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: 120,
  },
  coverImageFallback: {
    flex: 1,
  },
  offerContent: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: -39,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 40,
  },
  offerIcon: {
    width: 40,
    height: 40,
  },
  offerTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 6,
  },
  offerDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },
});

const OfferWrapper: React.FC<React.ComponentProps<typeof TouchableOpacity>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        offerStyles.offerWrapper,
        {borderColor: theme.dark ? LightBlack : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const CoverImageContainer: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => <View style={offerStyles.coverImageContainer}>{children}</View>;

const CoverImage: React.FC<React.ComponentProps<typeof FastImage>> = ({
  style,
  ...rest
}) => <FastImage style={[offerStyles.coverImage, style]} {...rest} />;

const CoverImageFallback: React.FC = () => (
  <View style={offerStyles.coverImageFallback} />
);

const OfferContent: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        offerStyles.offerContent,
        {
          backgroundColor: theme.dark ? CharcoalBlack : White,
          borderTopColor: theme.dark ? LightBlack : Slate30,
        },
      ]}>
      {children}
    </View>
  );
};

const IconWrapper: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        offerStyles.iconWrapper,
        {borderColor: theme.dark ? LightBlack : Slate30},
      ]}>
      {children}
    </View>
  );
};

const OfferIcon: React.FC<React.ComponentProps<typeof FastImage>> = ({
  style,
  ...rest
}) => <FastImage style={[offerStyles.offerIcon, style]} {...rest} />;

const TextContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View>{children}</View>
);

const OfferTitle: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        offerStyles.offerTitle,
        {color: theme.dark ? White : Black},
        style,
      ]}
      {...rest}
    />
  );
};

const OfferDescription: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        offerStyles.offerDescription,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

export default OfferCard;
