import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import styled, {useTheme} from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import AdvertisementCard from './AdvertisementCard';
import {BoxShadow} from '../Styled';

interface AdvertisementListProps {
  contentCards: ContentCard[];
}

const AdvertisementListContainer = styled.View`
  margin-top: 40px;
`;

const AdvertisementCardContainer = styled.View<{isLast: boolean}>`
  margin: 0 ${ScreenGutter} ${({isLast}) => (isLast ? 0 : 12)}px;
`;

const AdvertisementsList: React.FC<AdvertisementListProps> = props => {
  const {contentCards} = props;
  const theme = useTheme();
  return (
    <AdvertisementListContainer>
      {contentCards.map((contentCard, idx) => (
        <AdvertisementCardContainer
          style={!theme.dark ? BoxShadow : null}
          key={contentCard.id}
          isLast={idx === contentCards.length - 1}>
          <AdvertisementCard contentCard={contentCard} />
        </AdvertisementCardContainer>
      ))}
    </AdvertisementListContainer>
  );
};

export default AdvertisementsList;
