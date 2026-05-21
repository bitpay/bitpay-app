import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import ChartChangeRow from './ChartChangeRow';
import type {ChangeRowData} from './balanceHistoryChartSelection';

export type BalanceHeaderSupplementProps = {
  changeRowData?: ChangeRowData;
  content?: React.ReactNode;
  contentTopMargin?: number;
  changeRowStyle?: StyleProp<ViewStyle>;
  reserveChangeRowSpace?: boolean;
};

const BalanceHeaderSupplement = ({
  changeRowData,
  content,
  contentTopMargin = 22,
  changeRowStyle,
  reserveChangeRowSpace = false,
}: BalanceHeaderSupplementProps): React.ReactElement | null => {
  const showChangeRow = !!changeRowData || reserveChangeRowSpace;

  if (!showChangeRow && !content) {
    return null;
  }

  return (
    <>
      {showChangeRow ? (
        <ChartChangeRow
          percent={changeRowData?.percent ?? 0}
          deltaFiatFormatted={changeRowData?.deltaFiatFormatted}
          rangeLabel={changeRowData?.rangeLabel}
          style={[changeRowStyle, !changeRowData ? {opacity: 0} : undefined]}
        />
      ) : null}

      {content ? (
        <View style={{marginTop: contentTopMargin}}>{content}</View>
      ) : null}
    </>
  );
};

export default BalanceHeaderSupplement;
