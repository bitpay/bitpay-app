import {
  hasCompletedFullPortfolioPopulate,
  selectCanRenderPortfolioBalanceCharts,
} from './portfolio.selectors';

describe('portfolio selectors', () => {
  it('requires a completed full-populate timestamp', () => {
    expect(
      hasCompletedFullPortfolioPopulate({
        lastFullPopulateCompletedAt: 1234,
      }),
    ).toBe(true);

    expect(
      hasCompletedFullPortfolioPopulate({
        lastFullPopulateCompletedAt: undefined,
        lastPopulatedAt: 1234,
      }),
    ).toBe(false);

    expect(
      hasCompletedFullPortfolioPopulate({
        lastFullPopulateCompletedAt: null,
        lastPopulatedAt: 1234,
      }),
    ).toBe(false);
  });

  it('does not treat lastPopulatedAt alone as an active completed-full-populate signal', () => {
    expect(
      hasCompletedFullPortfolioPopulate({
        lastPopulatedAt: 1234,
      }),
    ).toBe(false);
  });

  it('requires Show Portfolio and a completed full populate for chart eligibility', () => {
    expect(
      selectCanRenderPortfolioBalanceCharts({
        APP: {showPortfolioValue: true},
        PORTFOLIO: {lastFullPopulateCompletedAt: 1234},
      } as any),
    ).toBe(true);

    expect(
      selectCanRenderPortfolioBalanceCharts({
        APP: {showPortfolioValue: false},
        PORTFOLIO: {lastFullPopulateCompletedAt: 1234},
      } as any),
    ).toBe(false);

    expect(
      selectCanRenderPortfolioBalanceCharts({
        APP: {showPortfolioValue: true},
        PORTFOLIO: {
          lastFullPopulateCompletedAt: undefined,
          lastPopulatedAt: 1234,
        },
      } as any),
    ).toBe(false);
  });
});
