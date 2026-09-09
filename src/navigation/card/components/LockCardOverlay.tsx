import React from 'react';
import {useTranslation} from 'react-i18next';
import {View, ViewProps, Text, TextProps, StyleSheet} from 'react-native';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {White} from '../../../styles/colors';
import LockIcon from '../assets/settings/icon-lock.svg';
import CardOverlayBackground from './CardOverlayBackground';

const styles = StyleSheet.create({
  lockCardOverlayContainer: {
    height: CARD_HEIGHT,
    position: 'relative',
    width: CARD_WIDTH,
  },
  lockCardOverlayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  lockText: {
    color: White,
  },
});

const LockCardOverlayContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.lockCardOverlayContainer, style]} {...rest} />
);

const LockCardOverlayContent = ({style, ...rest}: ViewProps) => (
  <View style={[styles.lockCardOverlayContent, style]} {...rest} />
);

const LockText = React.forwardRef<Text, TextProps>(({style, ...rest}, ref) => (
  <Text ref={ref} style={[styles.lockText, style]} {...rest} />
));

const LockCardOverlay: React.FC = () => {
  const {t} = useTranslation();
  return (
    <LockCardOverlayContainer>
      <CardOverlayBackground />

      <LockCardOverlayContent>
        <LockIcon />

        <LockText>{t('Card is locked')}</LockText>
      </LockCardOverlayContent>
    </LockCardOverlayContainer>
  );
};

export default LockCardOverlay;
