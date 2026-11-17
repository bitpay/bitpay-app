import type {SharedValue} from 'react-native-reanimated';

export type NumberSharedValue =
  | SharedValue<number>
  | Readonly<SharedValue<number>>;

export const isNumberSharedValue = (
  value: unknown,
): value is NumberSharedValue => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(value, 'value')) {
    return false;
  }

  // Callers read these via `.get()` (React Compiler friendly), so require it.
  const sharedValue = value as {get?: unknown};
  if (typeof sharedValue.get !== 'function') {
    return false;
  }

  const current: unknown = (sharedValue.get as () => unknown)();
  return typeof current === 'number' && Number.isFinite(current);
};
