import styled from 'styled-components/native';
import * as React from 'react';
import IncrementArrow from '../../../assets/img/home/exchange-rates/increment-arrow.svg';
import DecrementArrow from '../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import {BaseText} from '../styled/Text';

const PercentageContainer = styled(BaseText)`
  font-size: 12px;
  color: ${({theme}) => theme.colors.text};
`;

const PercentageRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

export interface PercentageProps {
  percentageDifference: number;
}

const Percentage = ({percentageDifference}: PercentageProps) => {
  return (
    <>
      <PercentageRow>
        {percentageDifference > 0 ? (
          <IncrementArrow style={{marginRight: 5}} />
        ) : null}
        {percentageDifference < 0 ? (
          <DecrementArrow style={{marginRight: 5}} />
        ) : null}
        <PercentageContainer>{percentageDifference}%</PercentageContainer>
      </PercentageRow>
    </>
  );
};

export default Percentage;
