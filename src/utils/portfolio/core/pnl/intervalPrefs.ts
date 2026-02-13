import type {FiatRateInterval} from '../fiatRateSeries';

const ORDER: readonly FiatRateInterval[] = [
  '1D',
  '1W',
  '1M',
  '3M',
  '1Y',
  '5Y',
  'ALL',
];

const makePref = (start: FiatRateInterval): readonly FiatRateInterval[] => {
  const i = ORDER.indexOf(start);
  return i < 0
    ? ORDER
    : [start, ...ORDER.slice(i + 1), ...ORDER.slice(0, i).reverse()];
};

export const PREF_1D: readonly FiatRateInterval[] = makePref('1D');
export const PREF_1W: readonly FiatRateInterval[] = makePref('1W');
export const PREF_1M: readonly FiatRateInterval[] = makePref('1M');
export const PREF_3M: readonly FiatRateInterval[] = makePref('3M');
export const PREF_1Y: readonly FiatRateInterval[] = makePref('1Y');
export const PREF_5Y: readonly FiatRateInterval[] = makePref('5Y');
export const PREF_ALL: readonly FiatRateInterval[] = makePref('ALL');
