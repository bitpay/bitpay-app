import React, {useState} from 'react';
import FastImage from 'react-native-fast-image';
import styled from 'styled-components/native';
import {CARD_HEIGHT, CARD_WIDTH} from '../../../constants/config.card';
import {Card} from '../../../store/card/card.models';
import {LogActions} from '../../../store/log';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import CardBack from './CardBack';

interface SettingsSlideProps {
  card: Card;
}

const SettingsSlideContainer = styled.View`
  position: relative;
  height: ${CARD_HEIGHT}px;
  width: ${CARD_WIDTH}px;
`;

const PlaceholderContainer = styled.View`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;

const StyledImage = styled(FastImage)`
  height: ${CARD_HEIGHT}px;
  width: ${CARD_WIDTH}px;
  border-radius: 10px;
`;

const SettingsSlide: React.FC<SettingsSlideProps> = props => {
  const {card} = props;
  const dispatch = useAppDispatch();
  const virtualImageUrl = useAppSelector(
    ({CARD}) => CARD.virtualCardImages[card.id],
  );
  const [isError, setError] = useState(false);

  const onLoad = () => {
    dispatch(
      LogActions.debug(
        `Successfully loaded virtual card image for card ${card.id}`,
      ),
    );
  };

  const onError = () => {
    setError(true);
    dispatch(
      LogActions.error(
        `An error occurred while loading virtual card image for card ${card.id}`,
      ),
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
