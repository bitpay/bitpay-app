import React from 'react';
import type {StyleProp, ViewStyle} from 'react-native';
import styled from 'styled-components/native';
import Percentage from '../percentage/Percentage';

const PercentRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

export type ChartChangeRowProps = {
  percent: number;
  deltaFiatFormatted?: string;
  rangeLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const ChartChangeRow = ({
  percent,
  deltaFiatFormatted,
  rangeLabel,
  style,
}: ChartChangeRowProps): React.ReactElement => {
  return (
    <PercentRow style={style}>
      <Percentage
        percentageDifference={percent}
        hideArrow
        hideSign
        priceChange={deltaFiatFormatted}
        rangeLabel={rangeLabel}
        fractionDigits={2}
      />
    </PercentRow>
  );
};

export default ChartChangeRow;
