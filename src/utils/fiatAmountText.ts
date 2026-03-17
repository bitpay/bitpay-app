export const DEFAULT_COMPACT_FIAT_TEXT_THRESHOLD = 11;

export const shouldUseCompactFiatAmountText = (
  formattedFiatAmount?: string,
  threshold = DEFAULT_COMPACT_FIAT_TEXT_THRESHOLD,
) => {
  return (formattedFiatAmount || '').length > threshold;
};
