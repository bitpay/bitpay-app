export const HIDDEN_BALANCE_MASK = '****';

export const maskIfHidden = (
  hidden: boolean,
  value: string | number | null | undefined,
  mask: string = HIDDEN_BALANCE_MASK,
): string => {
  if (hidden) {
    return mask;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return value ?? '';
};
