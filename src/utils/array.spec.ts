import {groupBy, maxBy, minBy, orderBy, partition, uniqBy} from './array';

describe('uniqBy', () => {
  it('keeps the first item for each key', () => {
    const items = [
      {id: 'a', value: 1},
      {id: 'b', value: 2},
      {id: 'a', value: 3},
    ];
    expect(uniqBy(items, 'id')).toEqual([
      {id: 'a', value: 1},
      {id: 'b', value: 2},
    ]);
  });

  it('accepts a function iteratee', () => {
    expect(uniqBy(['BTC', 'btc', 'ETH'], item => item.toLowerCase())).toEqual([
      'BTC',
      'ETH',
    ]);
  });
});

describe('orderBy', () => {
  it('sorts by a property in the given direction', () => {
    const items = [{amount: 2}, {amount: 3}, {amount: 1}];
    expect(orderBy(items, 'amount', 'desc')).toEqual([
      {amount: 3},
      {amount: 2},
      {amount: 1},
    ]);
    expect(orderBy(items, 'amount')).toEqual([
      {amount: 1},
      {amount: 2},
      {amount: 3},
    ]);
  });

  it('applies each iteratee in turn with its own direction', () => {
    const items = [
      {supported: false, symbol: 'b'},
      {supported: true, symbol: 'c'},
      {supported: true, symbol: 'a'},
    ];
    expect(
      orderBy(items, [item => item.supported, 'symbol'], ['desc', 'asc']),
    ).toEqual([
      {supported: true, symbol: 'a'},
      {supported: true, symbol: 'c'},
      {supported: false, symbol: 'b'},
    ]);
  });

  it('keeps the original order of equal items', () => {
    const items = [
      {order: 1, id: 'first'},
      {order: 0, id: 'second'},
      {order: 1, id: 'third'},
    ];
    expect(orderBy(items, 'order').map(({id}) => id)).toEqual([
      'second',
      'first',
      'third',
    ]);
  });

  it('places null and undefined after defined values when ascending', () => {
    const items = [{value: undefined}, {value: 2}, {value: null}, {value: 1}];
    expect(orderBy(items, 'value').map(({value}) => value)).toEqual([
      1,
      2,
      null,
      undefined,
    ]);
  });

  it('does not mutate the input', () => {
    const items = [{amount: 2}, {amount: 1}];
    orderBy(items, 'amount');
    expect(items).toEqual([{amount: 2}, {amount: 1}]);
  });
});

describe('minBy and maxBy', () => {
  const limits = [
    {provider: 'a', minAmount: 5, maxAmount: 100},
    {provider: 'b', minAmount: NaN, maxAmount: undefined},
    {provider: 'c', minAmount: 2, maxAmount: 100},
    {provider: 'd', minAmount: 2, maxAmount: 50},
  ];

  it('return the first item with the extreme value, skipping nullish and NaN values', () => {
    expect(minBy(limits, 'minAmount')?.provider).toBe('c');
    expect(maxBy(limits, 'maxAmount')?.provider).toBe('a');
    expect(minBy(limits, limit => limit.maxAmount)?.provider).toBe('d');
  });

  it('skip a NaN value in the first position', () => {
    const amounts = [{amount: NaN}, {amount: 3}, {amount: 1}];
    expect(minBy(amounts, 'amount')).toBe(amounts[2]);
    expect(maxBy(amounts, 'amount')).toBe(amounts[1]);
  });

  it('return undefined when no item has a comparable value', () => {
    expect(minBy([], 'minAmount')).toBeUndefined();
    expect(maxBy([{maxAmount: undefined}], 'maxAmount')).toBeUndefined();
    expect(minBy([{minAmount: NaN}], 'minAmount')).toBeUndefined();
  });
});

describe('groupBy', () => {
  it('groups items by key', () => {
    const wallets = [
      {keyId: 'k1', id: 'w1'},
      {keyId: 'k2', id: 'w2'},
      {keyId: 'k1', id: 'w3'},
    ];
    expect(groupBy(wallets, 'keyId')).toEqual({
      k1: [
        {keyId: 'k1', id: 'w1'},
        {keyId: 'k1', id: 'w3'},
      ],
      k2: [{keyId: 'k2', id: 'w2'}],
    });
  });

  it('handles keys named like Object.prototype members', () => {
    const groups = groupBy(
      [{keyId: 'constructor'}, {keyId: '__proto__'}, {keyId: 'constructor'}],
      'keyId',
    );

    expect(groups.constructor).toEqual([
      {keyId: 'constructor'},
      {keyId: 'constructor'},
    ]);
    expect(Object.prototype.hasOwnProperty.call(groups, '__proto__')).toBe(
      true,
    );
    expect(Object.getPrototypeOf(groups)).toBe(Object.prototype);
  });
});

describe('partition', () => {
  it('splits items into matching and non-matching groups', () => {
    const keys = [
      {id: 'a', isReadOnly: true},
      {id: 'b', isReadOnly: false},
      {id: 'c'},
    ];
    expect(partition(keys, 'isReadOnly')).toEqual([
      [{id: 'a', isReadOnly: true}],
      [{id: 'b', isReadOnly: false}, {id: 'c'}],
    ]);
  });

  it('accepts a predicate function', () => {
    expect(partition([0, 1, 2, 0], value => value === 0)).toEqual([
      [0, 0],
      [1, 2],
    ]);
  });
});
