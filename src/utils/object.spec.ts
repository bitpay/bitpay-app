import {cloneDeep, isEqual, merge} from './object';

class Client {
  credentials = {walletId: 'w1'};

  getId() {
    return this.credentials.walletId;
  }
}

describe('cloneDeep', () => {
  it('copies nested objects and arrays without sharing references', () => {
    const original = {offers: {a: {showOffer: true}}, list: [{id: 1}]};
    const copy = cloneDeep(original);

    expect(copy).toEqual(original);
    expect(copy.offers.a).not.toBe(original.offers.a);
    expect(copy.list[0]).not.toBe(original.list[0]);

    copy.offers.a.showOffer = false;
    expect(original.offers.a.showOffer).toBe(true);
  });

  it('keeps the prototype of class instances', () => {
    const copy = cloneDeep(new Client());

    expect(copy).toBeInstanceOf(Client);
    expect(copy.getId()).toBe('w1');
  });

  it('copies dates, typed arrays and circular references', () => {
    const original: any = {
      date: new Date(0),
      bytes: new Uint8Array([1, 2]),
    };
    original.self = original;
    const copy = cloneDeep(original);

    expect(copy.date).not.toBe(original.date);
    expect(copy.date.getTime()).toBe(0);
    expect(copy.bytes).not.toBe(original.bytes);
    expect(Array.from(copy.bytes)).toEqual([1, 2]);
    expect(copy.self).toBe(copy);
  });

  it('copies an own __proto__ key as a property instead of a prototype', () => {
    const copy = cloneDeep(JSON.parse('{"__proto__": {"polluted": true}}'));

    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(copy, '__proto__')).toBe(true);
    expect(copy.polluted).toBeUndefined();
  });

  it('returns primitives as they are', () => {
    expect(cloneDeep('btc')).toBe('btc');
    expect(cloneDeep(1)).toBe(1);
    expect(cloneDeep(undefined)).toBeUndefined();
  });
});

describe('isEqual', () => {
  it('compares nested objects and arrays by value', () => {
    expect(
      isEqual(
        {sat: 1, txps: [{id: 'a', outputs: [1]}]},
        {sat: 1, txps: [{id: 'a', outputs: [1]}]},
      ),
    ).toBe(true);
    expect(
      isEqual({sat: 1, txps: [{id: 'a'}]}, {sat: 1, txps: [{id: 'b'}]}),
    ).toBe(false);
  });

  it('treats missing and extra keys as different', () => {
    expect(isEqual({a: 1}, {a: 1, b: undefined})).toBe(false);
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('distinguishes arrays from objects and compares dates by time', () => {
    expect(isEqual([], {})).toBe(false);
    expect(isEqual(new Date(1), new Date(1))).toBe(true);
    expect(isEqual(new Date(1), new Date(2))).toBe(false);
    expect(isEqual(NaN, NaN)).toBe(true);
  });

  it('compares null-prototype objects with plain objects by value', () => {
    const decoded = Object.assign(Object.create(null), {sat: 1});
    expect(isEqual(decoded, {sat: 1})).toBe(true);
    expect(isEqual(decoded, {sat: 2})).toBe(false);
  });
});

describe('merge', () => {
  it('deep merges plain objects into the target and returns it', () => {
    const target = {balance: {sat: 1, fiat: 2}, name: 'a'};
    const result = merge(target, {balance: {sat: 3}, id: 'w1'});

    expect(result).toBe(target);
    expect(result).toEqual({balance: {sat: 3, fiat: 2}, name: 'a', id: 'w1'});
  });

  it('keeps the target prototype and copies plain source values', () => {
    const source = {credentials: {network: 'livenet'}};
    const result = merge(new Client(), source);

    expect(result).toBeInstanceOf(Client);
    expect(result.getId()).toBe('w1');
    expect(result.credentials).toEqual({walletId: 'w1', network: 'livenet'});
    expect(result.credentials).not.toBe(source.credentials);
  });

  it('does not overwrite existing values with undefined', () => {
    expect(merge({a: 1, b: 2}, {a: undefined, c: undefined})).toStrictEqual({
      a: 1,
      b: 2,
      c: undefined,
    });
  });

  it('ignores __proto__ keys from parsed JSON without touching Object.prototype', () => {
    const result = merge(
      {metadata: {}},
      JSON.parse(
        '{"__proto__": {"polluted": true}, "metadata": {"__proto__": {"polluted": true}}}',
      ),
    );

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(result.metadata)).toBe(Object.prototype);
  });

  it('merges arrays by index and assigns class instances by reference', () => {
    const client = new Client();
    const result = merge(
      {tokens: ['a', 'b'], client: {old: true}},
      {tokens: ['c']},
      {client},
    );

    expect(result.tokens).toEqual(['c', 'b']);
    expect(result.client).toBe(client);
  });
});
