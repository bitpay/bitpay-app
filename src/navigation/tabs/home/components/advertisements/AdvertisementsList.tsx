import React from 'react';
import {ContentCard} from 'react-native-appboy-sdk';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import AdvertisementCard from './AdvertisementCard';

interface AdvertisementListProps {
  contentCards: ContentCard[];
}

const AdvertisementCardContainer = styled.View<{isLast: boolean}>`
  margin: 0 ${ScreenGutter} ${({isLast}) => (isLast ? 0 : 12)}px;
`;

const AdvertisementsList: React.FC<AdvertisementListProps> = props => {
  const {contentCards} = props;

  return (
    <>
      {contentCards.map((contentCard, idx) => (
        <AdvertisementCardContainer
          key={contentCard.id}
          isLast={idx === contentCards.length - 1}>
          <AdvertisementCard contentCard={contentCard} />
        </AdvertisementCardContainer>
      ))}
    </>
  );
};

export default AdvertisementsList;
