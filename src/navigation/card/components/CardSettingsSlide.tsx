import React, {useState} from 'react';
import FastImage, {FastImageProps} from 'react-native-fast-image';
import {View, ViewProps, StyleSheet} from 'react-native';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {Card} from '../../../store/card/card.models';
import {useAppSelector} from '../../../utils/hooks';
import CardBack from './CardBack';
import {logManager} from '../../../managers/LogManager';

interface SettingsSlideProps {
  card: Card;
}

const styles = StyleSheet.create({
  settingsSlideContainer: {
    position: 'relative',
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  styledImage: {
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
    borderRadius: 10,
  },
});

const SettingsSlideContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.settingsSlideContainer, style]} {...rest} />
);

const PlaceholderContainer = ({style, ...rest}: ViewProps) => (
  <View style={[styles.placeholderContainer, style]} {...rest} />
);

const StyledImage = (props: FastImageProps) => (
  <FastImage {...props} style={[styles.styledImage, props.style]} />
);

const SettingsSlide: React.FC<SettingsSlideProps> = props => {
  const {card} = props;
  const virtualImageUrl = useAppSelector(
    ({CARD}) => CARD.virtualCardImages[card.id],
  );
  const [isError, setError] = useState(false);

  const onLoad = () => {
    logManager.debug(
      `Successfully loaded virtual card image for card ${card.id}`,
    );
  };

  const onError = () => {
    setError(true);
    logManager.error(
      `An error occurred while loading virtual card image for card ${card.id}`,
    );
  };

  return (
    <SettingsSlideContainer>
      <PlaceholderContainer>
        <CardBack card={card} />
      </PlaceholderContainer>

      {!isError && virtualImageUrl ? (
        <StyledImage
          source={{uri: virtualImageUrl}}
          onLoad={() => onLoad()}
          onError={() => onError()}
        />
      ) : null}
    </SettingsSlideContainer>
  );
};

export default SettingsSlide;
