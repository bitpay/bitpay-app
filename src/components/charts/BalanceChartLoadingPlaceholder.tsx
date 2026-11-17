import React from 'react';
import BalanceChartSkeleton, {
  BALANCE_CHART_SKELETON_CHART_HEIGHT,
  BalanceChartPopulateCaption,
} from './BalanceChartSkeleton';
import type {PortfolioPopulateProgress} from '../../utils/portfolio/assets';

// Line chart (220) + timeframe selector margin (5) + selector (34).
export const BALANCE_CHART_LOADING_PLACEHOLDER_HEIGHT = 259;

type BalanceChartLoadingPlaceholderProps = {
  populateProgress?: PortfolioPopulateProgress;
};

const BalanceChartLoadingPlaceholder = ({
  populateProgress,
}: BalanceChartLoadingPlaceholderProps) => (
  <BalanceChartSkeleton
    height={BALANCE_CHART_LOADING_PLACEHOLDER_HEIGHT}
    chartHeight={BALANCE_CHART_SKELETON_CHART_HEIGHT}
    caption={
      populateProgress ? (
        <BalanceChartPopulateCaption
          completed={populateProgress.completed}
          total={populateProgress.total}
        />
      ) : undefined
    }
  />
);

export default React.memo(BalanceChartLoadingPlaceholder);
