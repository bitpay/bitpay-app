// BWC derives a token wallet id as `${walletId}-${token.address}` and keeps the
// address casing: lowercased for EVM contracts, Base58 as-is for SVM mints.
export const buildTokenWalletId = (
  baseWalletId: string,
  tokenAddress: string,
): string => `${baseWalletId}-${tokenAddress}`;

export const findByTokenWalletId = <T>(
  items: T[] | undefined,
  tokenWalletId: string,
  getId: (item: T) => string | undefined,
): T | undefined => {
  if (!items?.length) {
    return undefined;
  }

  const exactMatch = items.find(item => getId(item) === tokenWalletId);

  if (exactMatch) {
    return exactMatch;
  }

  const lowerCasedTokenWalletId = tokenWalletId.toLowerCase();

  return items.find(
    item => getId(item)?.toLowerCase() === lowerCasedTokenWalletId,
  );
};

export const getTokenAddressFromTokenWalletId = (
  baseWalletId: string,
  tokenWalletId: string,
): string | undefined => {
  const prefix = `${baseWalletId}-`;

  const belongsToBaseWallet =
    tokenWalletId.startsWith(prefix) ||
    tokenWalletId.toLowerCase().startsWith(prefix.toLowerCase());

  if (!belongsToBaseWallet) {
    return undefined;
  }

  return tokenWalletId.slice(prefix.length) || undefined;
};

export const getBaseWalletIdFromTokenWalletId = (
  tokenWalletId: string,
  tokenAddress: string,
): string | undefined => {
  const suffix = `-${tokenAddress}`;

  const carriesTokenAddress =
    tokenWalletId.endsWith(suffix) ||
    tokenWalletId.toLowerCase().endsWith(suffix.toLowerCase());

  if (!carriesTokenAddress) {
    return undefined;
  }

  return tokenWalletId.slice(0, -suffix.length) || undefined;
};
