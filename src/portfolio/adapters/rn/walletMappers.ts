import type {
  StoredWallet,
  WalletCredentials,
  WalletSummary,
} from '../../core/types';
import type {Wallet} from '../../../store/wallet/wallet.models';
import {
  getPortfolioWalletTokenAddress,
  getWalletLiveAtomicBalance,
} from '../../../utils/portfolio/assets';
import {
  getAtomicDecimals,
  normalizeWalletUnitDecimals,
} from '../../core/format';

export {
  isPortfolioRuntimeEligibleWallet,
  isPortfolioRuntimeMainnetLikeNetwork,
  summarizePortfolioRuntimeWalletEligibility,
  type PortfolioRuntimeWalletEligibilitySummary,
} from './walletEligibility';

export type PortfolioWalletCredentialsSnapshot = WalletCredentials & {
  walletId: string;
  walletName?: string;
  chain?: string;
  coin?: string;
  network?: string;
  receiveAddress?: string;
  copayerId?: string;
  requestPrivKey?: string;
  requestPubKey?: string;
  token?: {
    address?: string;
    symbol?: string;
  };
  multisigEthInfo?: {
    multisigContractAddress?: string;
  };
};

const sanitizeString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim() || undefined : undefined;

export const extractPortfolioWalletCredentialsSnapshot = (
  wallet: Wallet,
): PortfolioWalletCredentialsSnapshot => {
  const credentials = (wallet as any)?.credentials;
  const serialized = (() => {
    try {
      if (typeof credentials?.toObj === 'function') {
        return credentials.toObj();
      }
      return JSON.parse(JSON.stringify(credentials || {}));
    } catch {
      return {};
    }
  })() as Record<string, any>;

  const walletId = String(
    serialized?.walletId || wallet?.id || credentials?.walletId || '',
  ).trim();
  const walletName =
    sanitizeString(wallet?.walletName) ||
    sanitizeString(serialized?.walletName);
  const chain =
    sanitizeString(wallet?.chain) || sanitizeString(serialized?.chain);
  const network =
    sanitizeString(wallet?.network) || sanitizeString(serialized?.network);
  const receiveAddress =
    sanitizeString((wallet as any)?.receiveAddress) ||
    sanitizeString(serialized?.receiveAddress);
  const tokenAddress =
    sanitizeString(wallet?.tokenAddress) ||
    sanitizeString(serialized?.token?.address) ||
    sanitizeString(serialized?.tokenAddress);
  const currencyAbbreviation =
    sanitizeString(wallet?.currencyAbbreviation) ||
    sanitizeString(serialized?.token?.symbol) ||
    sanitizeString(serialized?.coin) ||
    chain;

  return {
    ...serialized,
    walletId,
    walletName,
    chain,
    coin: currencyAbbreviation,
    network,
    receiveAddress,
    copayerId: sanitizeString(serialized?.copayerId),
    requestPrivKey: sanitizeString(serialized?.requestPrivKey),
    requestPubKey: sanitizeString(serialized?.requestPubKey),
    token: tokenAddress
      ? {
          ...(serialized?.token || {}),
          address: tokenAddress,
          symbol: currencyAbbreviation,
        }
      : serialized?.token,
    multisigEthInfo: serialized?.multisigEthInfo
      ? {
          ...serialized.multisigEthInfo,
          multisigContractAddress: sanitizeString(
            serialized?.multisigEthInfo?.multisigContractAddress,
          ),
        }
      : undefined,
  };
};

export const toPortfolioWalletSummary = (args: {
  wallet: Wallet;
  unitDecimals?: number;
}): WalletSummary => {
  const {wallet, unitDecimals} = args;
  const credentials = extractPortfolioWalletCredentialsSnapshot(wallet);
  const walletId = String(wallet?.id || credentials?.walletId || '').trim();
  const walletName =
    sanitizeString(wallet?.walletName) ||
    sanitizeString(credentials?.walletName) ||
    walletId ||
    'Wallet';
  const chain = String(wallet?.chain || credentials?.chain || '')
    .trim()
    .toLowerCase();
  const network = String(wallet?.network || credentials?.network || '')
    .trim()
    .toLowerCase();
  const tokenAddress =
    sanitizeString(wallet?.tokenAddress) ||
    sanitizeString(credentials?.token?.address);
  const currencyAbbreviation = String(
    wallet?.currencyAbbreviation ||
      credentials?.token?.symbol ||
      credentials?.coin ||
      chain,
  )
    .trim()
    .toLowerCase();
  const normalizedUnitDecimals = normalizeWalletUnitDecimals(unitDecimals);
  const liveBalanceUnitDecimals =
    normalizedUnitDecimals ??
    getAtomicDecimals({
      ...credentials,
      chain,
      coin: currencyAbbreviation,
    });
  const balanceAtomic = getWalletLiveAtomicBalance({
    wallet,
    unitDecimals: liveBalanceUnitDecimals,
  }).toString();
  const balanceFormatted = String(
    (wallet as any)?.balance?.crypto || '0',
  ).replace(/,/g, '');

  const summary: WalletSummary = {
    walletId,
    walletName,
    chain,
    network,
    currencyAbbreviation,
    tokenAddress,
    balanceAtomic,
    balanceFormatted,
  };

  if (typeof normalizedUnitDecimals === 'number') {
    summary.unitDecimals = normalizedUnitDecimals;
  }

  return summary;
};

export const getPortfolioWalletTokenAddressForDecimals = (
  wallet: Wallet,
): string | undefined => {
  return (
    getPortfolioWalletTokenAddress(wallet) ||
    sanitizeString((wallet as any)?.credentials?.token?.address) ||
    sanitizeString((wallet as any)?.credentials?.tokenAddress)
  );
};

export const getPortfolioWalletCredentialTokenDecimals = (
  wallet: Wallet,
): number | undefined =>
  normalizeWalletUnitDecimals((wallet as any)?.credentials?.token?.decimals);

export const resolvePortfolioWalletUnitDecimalsFromPrecision = (args: {
  wallet: Wallet;
  precisionUnitDecimals?: unknown;
}): number | undefined => {
  const unitDecimals =
    normalizeWalletUnitDecimals(args.precisionUnitDecimals) ??
    getPortfolioWalletCredentialTokenDecimals(args.wallet);
  if (typeof unitDecimals === 'number') {
    return unitDecimals;
  }

  if (getPortfolioWalletTokenAddressForDecimals(args.wallet)) {
    return undefined;
  }

  return getAtomicDecimals({
    chain: args.wallet?.chain,
    coin: args.wallet?.currencyAbbreviation,
  });
};

export const toPortfolioStoredWallet = (args: {
  wallet: Wallet;
  unitDecimals?: number;
  addedAt?: number;
}): StoredWallet => {
  return {
    walletId: String(args.wallet?.id || '').trim(),
    credentials: extractPortfolioWalletCredentialsSnapshot(args.wallet),
    summary: toPortfolioWalletSummary({
      wallet: args.wallet,
      unitDecimals: args.unitDecimals,
    }),
    addedAt:
      typeof args.addedAt === 'number' && Number.isFinite(args.addedAt)
        ? args.addedAt
        : Date.now(),
  };
};
