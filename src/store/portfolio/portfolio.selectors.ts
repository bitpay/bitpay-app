import type {AppSelector} from '..';
import type {PortfolioState} from './portfolio.models';

const isFiniteTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const hasCompletedFullPortfolioPopulate = (
  portfolio?: Partial<PortfolioState> | null,
): boolean => isFiniteTimestamp(portfolio?.lastFullPopulateCompletedAt);

export const selectHasCompletedFullPortfolioPopulate: AppSelector<boolean> = ({
  PORTFOLIO,
}) => hasCompletedFullPortfolioPopulate(PORTFOLIO);

export const selectCanRenderPortfolioBalanceCharts: AppSelector<
  boolean
> = state =>
  state.APP?.showPortfolioValue === true &&
  selectHasCompletedFullPortfolioPopulate(state);
