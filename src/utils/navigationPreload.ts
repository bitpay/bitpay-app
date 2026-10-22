export const getSinglePreloadCandidate = <T>(
  items: readonly T[],
  isEligible: (item: T) => boolean,
): T | undefined => {
  let candidate: T | undefined;

  for (const item of items) {
    if (!isEligible(item)) {
      continue;
    }
    if (candidate !== undefined) {
      return undefined;
    }
    candidate = item;
  }

  return candidate;
};
