import styled from 'styled-components/native';
import * as React from 'react';
import IncrementArrow from '../../../assets/img/home/exchange-rates/increment-arrow.svg';
import DecrementArrow from '../../../assets/img/home/exchange-rates/decrement-arrow.svg';
import {BaseText} from '../styled/Text';
import {Black, LuckySevens} from '../../styles/colors';

const PercentageContainer = styled(BaseText)<{darkModeColor: string}>`
  font-size: 12px;
  color: ${({theme: {dark}, darkModeColor}) => (dark ? darkModeColor : Black)};
`;

const PercentageRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

export interface PercentageProps {
  percentageDifference: number;
  darkModeColor?: string;
}

const Percentage = ({
  percentageDifference,
  darkModeColor = LuckySevens,
}: PercentageProps) => {
  return (
    <>
      <PercentageRow>
        {percentageDifference > 0 ? (
          <IncrementArrow style={{marginRight: 5}} />
        ) : null}
        {percentageDifference < 0 ? (
          <DecrementArrow style={{marginRight: 5}} />
        ) : null}
        <PercentageContainer darkModeColor={darkModeColor}>
          {Math.abs(percentageDifference)}%
        </PercentageContainer>
      </PercentageRow>
    </>
  );
};

export default Percentage;
