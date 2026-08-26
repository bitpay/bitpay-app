import {useFocusEffect, useLinkTo} from '@react-navigation/native';
import React from 'react';
import {ImageStyle, Linking, StyleProp, StyleSheet, View} from 'react-native';
import Braze, {ContentCard} from '@braze/react-native-sdk';
import FastImage, {Source} from 'react-native-fast-image';
import {SvgProps} from 'react-native-svg';
import {useTheme} from '../../../../../contexts';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {ActiveOpacity} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {APP_DEEPLINK_PREFIX} from '../../../../../constants/config';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {AppEffects} from '../../../../../store/app';
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
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {logManager} from '../../../../../managers/LogManager';

interface AdvertisementCardProps {
  contentCard: ContentCard;
  ctaOverride?: () => void;
}

const isSvgComponent = (src: any): src is React.FC<SvgProps> => {
  return src && typeof src === 'function';
};

const styles = StyleSheet.create({
  advertisementCardContainer: {
    borderRadius: 12,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 100,
    overflow: 'hidden',
    paddingTop: 16,
    paddingRight: 35,
    paddingBottom: 16,
    paddingLeft: 76,
    position: 'relative',
  },
  advertisementCardTitle: {
    fontStyle: 'normal',
    fontWeight: 'bold',
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 5,
  },
  advertisementCardDescription: {
    fontSize: 12,
  },
  iconContainer: {
    position: 'absolute',
    left: 16,
  },
});

const AdvertisementCardContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.advertisementCardContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const AdvertisementCardTitle: React.FC<{children?: React.ReactNode}> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.advertisementCardTitle, {color: theme.colors.text}]}>
      {children}
    </BaseText>
  );
};

const AdvertisementCardDescription: React.FC<{
  children?: React.ReactNode;
}> = ({children}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.advertisementCardDescription,
        {color: theme.dark ? Slate : SlateDark},
      ]}>
      {children}
    </BaseText>
  );
};

const IconContainer: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <View style={styles.iconContainer}>{children}</View>
);

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
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        logManager.debug(
          'Something went wrong parsing Do More URL: ' + url,
          errStr,
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
