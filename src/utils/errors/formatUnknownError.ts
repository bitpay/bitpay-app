const DEFAULT_MAX_LENGTH = 2000;

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 0) {
    return '';
  }

  if (maxLength === 1) {
    return '…';
  }

  return `${value.slice(0, maxLength - 1)}…`;
};

const safeStringify = (value: unknown): string | undefined => {
  const seen = new WeakSet<object>();

  try {
    const result = JSON.stringify(value, (_key, currentValue: unknown) => {
      if (typeof currentValue === 'bigint') {
        return `${currentValue.toString()}n`;
      }

      if (currentValue && typeof currentValue === 'object') {
        if (seen.has(currentValue)) {
          return '[Circular]';
        }

        seen.add(currentValue);
      }

      return currentValue;
    });

    return typeof result === 'string' ? result : undefined;
  } catch {
    return undefined;
  }
};

export const formatUnknownError = (
  err: unknown,
  opts?: {maxLength?: number},
): string => {
  const maxLength =
    typeof opts?.maxLength === 'number' && Number.isFinite(opts.maxLength)
      ? Math.max(0, Math.floor(opts.maxLength))
      : DEFAULT_MAX_LENGTH;

  try {
    const message =
      err instanceof Error
        ? err.message || err.name
        : typeof err === 'string'
        ? err
        : safeStringify(err) ?? String(err);

    return truncate(message || 'Unknown error', maxLength);
  } catch {
    return truncate('Unknown error', maxLength);
  }
};
