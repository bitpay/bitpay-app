import React from 'react';
import styled from 'styled-components/native';
import {ScreenGutter} from '../../../../../components/styled/Containers';
import AdvertisementCard, {Advertisement} from './AdvertisementCard';

interface AdvertisementListProps {
  items: Advertisement[];
}

const AdvertisementCardContainer = styled.View<{isLast: boolean}>`
  margin: 0 ${ScreenGutter} ${({isLast}) => (isLast ? 0 : 12)}px;
`;

const AdvertisementsList: React.FC<AdvertisementListProps> = props => {
  const {items} = props;

  return (
    <>
      {items.map((advertisement, idx) => (
        <AdvertisementCardContainer
          key={advertisement.id}
          isLast={idx === items.length - 1}>
          <AdvertisementCard advertisement={advertisement} />
        </AdvertisementCardContainer>
      ))}
    </>
  );
};

export default AdvertisementsList;
