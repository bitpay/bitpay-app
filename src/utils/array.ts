type Iteratee<T> = keyof T | ((item: T) => unknown);

type SortOrder = 'asc' | 'desc';

const toGetter =
  <T>(iteratee: Iteratee<T>) =>
  (item: T): unknown =>
    typeof iteratee === 'function' ? iteratee(item) : item[iteratee];

const compareAscending = (value: unknown, other: unknown): number => {
  if (value === other) {
    return 0;
  }
  if (value === undefined || value === null) {
    return other === undefined ? -1 : 1;
  }
  if (other === undefined || other === null) {
    return -1;
  }
  if ((value as any) < (other as any)) {
    return -1;
  }
  return (value as any) > (other as any) ? 1 : 0;
};

export const uniqBy = <T>(array: readonly T[], iteratee: Iteratee<T>): T[] => {
  const getKey = toGetter(iteratee);
  const seen = new Set<unknown>();
  return array.filter(item => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const orderBy = <T>(
  array: readonly T[],
  iteratees: Iteratee<T> | Iteratee<T>[],
  orders: SortOrder | SortOrder[] = [],
): T[] => {
  const getters = (Array.isArray(iteratees) ? iteratees : [iteratees]).map(
    toGetter,
  );
  const directions = Array.isArray(orders) ? orders : [orders];
  return array
    .map((item, index) => ({
      item,
      index,
      criteria: getters.map(getCriterion => getCriterion(item)),
    }))
    .sort((a, b) => {
      for (let i = 0; i < getters.length; i++) {
        const result = compareAscending(a.criteria[i], b.criteria[i]);
        if (result) {
          return directions[i] === 'desc' ? -result : result;
        }
      }
      return a.index - b.index;
    })
    .map(({item}) => item);
};

const extremumBy = <T>(
  array: readonly T[],
  iteratee: Iteratee<T>,
  isBetter: (value: any, current: any) => boolean,
): T | undefined => {
  const getValue = toGetter(iteratee);
  let result: T | undefined;
  let resultValue: unknown;
  array.forEach(item => {
    const value = getValue(item);
    if (
      value != null &&
      (resultValue === undefined
        ? !Number.isNaN(value)
        : isBetter(value, resultValue))
    ) {
      result = item;
      resultValue = value;
    }
  });
  return result;
};

export const minBy = <T>(array: readonly T[], iteratee: Iteratee<T>) =>
  extremumBy(array, iteratee, (value, current) => value < current);

export const maxBy = <T>(array: readonly T[], iteratee: Iteratee<T>) =>
  extremumBy(array, iteratee, (value, current) => value > current);

export const groupBy = <T>(
  array: readonly T[],
  iteratee: Iteratee<T>,
): Record<string, T[]> => {
  const getKey = toGetter(iteratee);
  return array.reduce<Record<string, T[]>>((groups, item) => {
    const key = String(getKey(item));
    if (Object.prototype.hasOwnProperty.call(groups, key)) {
      groups[key].push(item);
    } else {
      Object.defineProperty(groups, key, {
        configurable: true,
        enumerable: true,
        value: [item],
        writable: true,
      });
    }
    return groups;
  }, {});
};

export const partition = <T>(
  array: readonly T[],
  predicate: Iteratee<T>,
): [T[], T[]] => {
  const test = toGetter(predicate);
  return array.reduce<[T[], T[]]>(
    ([matching, rest], item) => {
      (test(item) ? matching : rest).push(item);
      return [matching, rest];
    },
    [[], []],
  );
};
