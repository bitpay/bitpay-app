type AnyObject = Record<PropertyKey, any>;

const isObjectLike = (value: unknown): value is AnyObject =>
  typeof value === 'object' && value !== null;

const isPlainObject = (value: unknown): value is AnyObject => {
  if (!isObjectLike(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

const assignValue = (object: AnyObject, key: string, value: unknown) => {
  if (key === '__proto__') {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true,
    });
  } else {
    object[key] = value;
  }
};

const cloneValue = (value: unknown, seen: WeakMap<object, unknown>): any => {
  if (!isObjectLike(value)) {
    return value;
  }
  if (seen.has(value)) {
    return seen.get(value);
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    return new (value.constructor as any)(value);
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    value.forEach((entry, key) => copy.set(key, cloneValue(entry, seen)));
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    value.forEach(entry => copy.add(cloneValue(entry, seen)));
    return copy;
  }
  const copy = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  Object.keys(value).forEach(key => {
    assignValue(copy, key, cloneValue((value as AnyObject)[key], seen));
  });
  return copy;
};

export const cloneDeep = <T>(value: T): T => cloneValue(value, new WeakMap());

const isSameValueZero = (value: unknown, other: unknown) =>
  value === other || (Number.isNaN(value) && Number.isNaN(other));

export const isEqual = (value: unknown, other: unknown): boolean => {
  if (isSameValueZero(value, other)) {
    return true;
  }
  if (!isObjectLike(value) || !isObjectLike(other)) {
    return false;
  }
  if (Object.getPrototypeOf(value) !== Object.getPrototypeOf(other)) {
    return false;
  }
  if (value instanceof Date) {
    return value.getTime() === (other as Date).getTime();
  }
  const keys = Object.keys(value);
  return (
    keys.length === Object.keys(other).length &&
    keys.every(
      key =>
        Object.prototype.hasOwnProperty.call(other, key) &&
        isEqual(value[key], other[key]),
    )
  );
};

const assignMergeValue = (target: AnyObject, key: string, value: unknown) => {
  if (
    value === undefined
      ? !(key in target)
      : !isSameValueZero(target[key], value)
  ) {
    target[key] = value;
  }
};

const mergeInto = (target: AnyObject, source: AnyObject) => {
  for (const key in source) {
    const sourceValue = source[key];
    if (
      key === '__proto__' ||
      (key === 'constructor' && typeof sourceValue === 'function')
    ) {
      continue;
    }
    const targetValue = target[key];
    if (Array.isArray(sourceValue)) {
      assignMergeValue(
        target,
        key,
        mergeInto(Array.isArray(targetValue) ? targetValue : [], sourceValue),
      );
    } else if (isPlainObject(sourceValue)) {
      assignMergeValue(
        target,
        key,
        mergeInto(isObjectLike(targetValue) ? targetValue : {}, sourceValue),
      );
    } else {
      assignMergeValue(target, key, sourceValue);
    }
  }
  return target;
};

export function merge<T, S>(target: T, source: S): T & S;
export function merge<T, S1, S2>(
  target: T,
  source1: S1,
  source2: S2,
): T & S1 & S2;
export function merge(target: AnyObject, ...sources: AnyObject[]) {
  sources.forEach(source => {
    if (isObjectLike(source)) {
      mergeInto(target, source);
    }
  });
  return target;
}
