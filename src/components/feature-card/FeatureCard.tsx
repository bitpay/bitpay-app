import React from 'react';
import {Image, ImageSourcePropType, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../contexts';
import Button from '../button/Button';
import {BaseText, H5, Link} from '../styled/Text';

const styles = StyleSheet.create({
  featureImage: {
    height: '100%',
    width: '100%',
    transform: [{scale: 0.8}],
  },
  bottomDescriptionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '10%',
  },
  descriptionTitle: {
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 25,
    letterSpacing: 0,
    textAlign: 'center',
    marginTop: 20,
  },
  linkText: {
    fontWeight: '500',
    fontSize: 16,
  },
  ctaContainer: {
    marginTop: 20,
  },
  featureCardContainer: {
    flex: 1,
  },
});

interface Props {
  image: ImageSourcePropType;
  descriptionTitle: string;
  descriptionText: string;
  ctaText: string;
  cta: () => void;
}

const FeatureCard = ({
  image,
  descriptionTitle,
  descriptionText,
  ctaText,
  cta,
}: Props) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <LinearGradient
      style={styles.featureCardContainer}
      colors={theme.dark ? ['#606060', '#26272A'] : ['#FFFFFF', '#EBEDF8']}
      start={{x: 0, y: 0}}
      end={{x: 0, y: 0}}
      useAngle
      angle={225}>
      <Image
        resizeMode={'contain'}
        style={[styles.featureImage, {marginTop: insets.top}]}
        source={image}
      />
      <View
        style={[
          styles.bottomDescriptionContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <H5 bold style={styles.descriptionTitle}>
          {descriptionTitle}
        </H5>
        <BaseText style={[styles.descriptionText, {color: theme.colors.text}]}>
          {descriptionText}
        </BaseText>
        <View style={styles.ctaContainer}>
          <Button buttonType={'link'} onPress={cta}>
            <Link style={styles.linkText}>{ctaText}</Link>
          </Button>
        </View>
      </View>
    </LinearGradient>
  );
};

export default FeatureCard;
