import {normalizeDisplayPercentage} from '../common';

export function buildKeyPercentageDifferenceMap(args: {
  results: Array<{
    keyId: string;
    liveFiatTotal: number;
    totalFiatBalance?: number;
    totalPnlPercent?: number;
  }>;
}): Record<string, number | null> {
  const out: Record<string, number | null> = {};

  for (const result of args.results || []) {
    const hasRuntimeData =
      (typeof result.totalFiatBalance === 'number' &&
        result.totalFiatBalance > 0) ||
      !(result.liveFiatTotal > 0);

    out[result.keyId] = hasRuntimeData
      ? normalizeDisplayPercentage(result.totalPnlPercent)
      : null;
  }

  return out;
}

export default buildKeyPercentageDifferenceMap;
