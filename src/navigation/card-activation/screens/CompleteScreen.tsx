import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import Button from '../../../components/button/Button';
import {ScreenGutter} from '../../../components/styled/Containers';
import {H4, Paragraph} from '../../../components/styled/Text';
import {navigationRef} from '../../../Root';
import OnTheMoonSvg from '../assets/on-the-moon.svg';
import {
  CardActivationGroupParamList,
  CardActivationScreens,
} from '../CardActivationGroup';

export type CompleteScreenParamList = undefined;

const styles = StyleSheet.create({
  contentContainer: {
    marginLeft: parseInt(ScreenGutter, 10),
    marginRight: parseInt(ScreenGutter, 10),
  },
  heroImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroImageWrapper: {
    height: 420,
    width: 648,
  },
  heading: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    marginBottom: 20,
  },
});

const ContentContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.contentContainer, style]} {...rest} />
);

const HeroImageContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.heroImageContainer, style]} {...rest} />
);

const HeroImageWrapper = ({style, ...rest}: ViewProps) => (
  <View style={[styles.heroImageWrapper, style]} {...rest} />
);

const Heading = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <H4 ref={ref} style={[styles.heading, style]} {...rest} />
));

const Description = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => (
  <Paragraph ref={ref} style={[styles.description, style]} {...rest} />
));

const CompleteScreen: React.FC<
  NativeStackScreenProps<
    CardActivationGroupParamList,
    CardActivationScreens.COMPLETE
  >
> = () => {
  const {t} = useTranslation();
  const onViewCardPress = () => {
    navigationRef.navigate('Tabs', {
      screen: 'Card',
      params: {
        screen: 'Home',
      },
    });
  };

  return (
    <SafeAreaView>
      <HeroImageContainer>
        <HeroImageWrapper>
          <OnTheMoonSvg />
        </HeroImageWrapper>
      </HeroImageContainer>

      <ContentContainer>
        <Heading>{t('Your card is now activated!')}</Heading>

        <Description>
          {t(
            'You can now use your card at over 40 million locations in 210 countries and territories.',
          )}
        </Description>

        <Button onPress={onViewCardPress}>{t('View My Card')}</Button>
      </ContentContainer>
    </SafeAreaView>
  );
};

export default CompleteScreen;
