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

  const sharedValue = value as {value?: unknown};
  return (
    typeof sharedValue.value === 'number' && Number.isFinite(sharedValue.value)
  );
};
