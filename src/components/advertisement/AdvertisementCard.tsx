import React, {ReactElement} from 'react';
import styled from 'styled-components/native';
import haptic from '../haptic-feedback/haptic';
import {LightBlack, NeutralSlate, SlateDark, White} from '../../styles/colors';
import {BaseText} from '../styled/Text';
import {ActiveOpacity, ScreenGutter} from '../styled/Containers';

export interface AdvertisementProps {
  id: string;
  title: string;
  text: string;
  img: ReactElement;
  onPress: () => void;
}

const AdvertisementCardContainer = styled.TouchableOpacity`
  flex-direction: column;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  padding: 20px 100px 20px 20px;
  position: relative;
  min-height: 112px;
  margin: 10px ${ScreenGutter};
`;

const AdvertisementCardTitle = styled(BaseText)`
  font-style: normal;
  font-weight: bold;
  font-size: 16px;
  line-height: 23px;
  margin-bottom: 5px;
  color: ${({theme}) => theme.colors.text};
`;

const AdvertisementCardText = styled(BaseText)`
  font-size: 14px;
  line-height: 21px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const AdvertisementCardImg = styled.View`
  position: absolute;
  bottom: 0;
  right: 0;
`;

const AdvertisementCard = ({items}: {items: AdvertisementProps[]}) => {
  const _onPress = (item: AdvertisementProps) => {
    console.log(`Service option clicked: ${item.title}`);
    haptic('impactLight');
    item.onPress();
  };

  return (
    <>
      {items &&
        items.map(item => (
          <AdvertisementCardContainer
            activeOpacity={ActiveOpacity}
            key={item.id}
            onPress={() => _onPress(item)}>
            <AdvertisementCardTitle>{item.title}</AdvertisementCardTitle>

            <AdvertisementCardText>{item.text}</AdvertisementCardText>
            <AdvertisementCardImg>{item.img}</AdvertisementCardImg>
          </AdvertisementCardContainer>
        ))}
    </>
  );
};

export default AdvertisementCard;
