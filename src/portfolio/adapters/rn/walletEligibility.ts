import type {Wallet} from '../../../store/wallet/wallet.models';

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

export const isPortfolioRuntimeMainnetLikeNetwork = (
  network: string | undefined,
): boolean => {
  const normalized = String(network || '')
    .trim()
    .toLowerCase();
  return normalized === 'livenet' || normalized === 'mainnet';
};

type PortfolioRuntimeWalletEligibilityEvaluation = {
  eligible: boolean;
  missingWalletId: boolean;
  missingCopayerId: boolean;
  missingRequestPrivKey: boolean;
  nonMainnetNetwork: boolean;
  pendingTssSession: boolean;
  incompleteCredentials: boolean;
};

export type PortfolioRuntimeWalletEligibilitySummary = {
  walletCount: number;
  eligibleWalletCount: number;
  excludedWalletCount: number;
  missingWalletIdCount: number;
  missingCopayerIdCount: number;
  missingRequestPrivKeyCount: number;
  nonMainnetNetworkCount: number;
  pendingTssSessionCount: number;
  incompleteCredentialsCount: number;
};

function evaluatePortfolioRuntimeWalletEligibility(
  wallet: Wallet,
): PortfolioRuntimeWalletEligibilityEvaluation {
  const credentials = (wallet as any)?.credentials;
  const walletId = sanitizeString(wallet?.id || credentials?.walletId);
  const copayerId = sanitizeString(credentials?.copayerId);
  const requestPrivKey = sanitizeString(credentials?.requestPrivKey);
  const network = sanitizeString(wallet?.network || credentials?.network);
  const pendingTssSession = !!(wallet as any)?.pendingTssSession;

  let incompleteCredentials = false;
  try {
    if (
      typeof credentials?.isComplete === 'function' &&
      !credentials.isComplete()
    ) {
      incompleteCredentials = true;
    }
  } catch {
    incompleteCredentials = true;
  }

  const missingWalletId = !walletId;
  const missingCopayerId = !copayerId;
  const missingRequestPrivKey = !requestPrivKey;
  const nonMainnetNetwork = !isPortfolioRuntimeMainnetLikeNetwork(network);

  return {
    eligible:
      !missingWalletId &&
      !missingCopayerId &&
      !missingRequestPrivKey &&
      !nonMainnetNetwork &&
      !pendingTssSession &&
      !incompleteCredentials,
    missingWalletId,
    missingCopayerId,
    missingRequestPrivKey,
    nonMainnetNetwork,
    pendingTssSession,
    incompleteCredentials,
  };
}

export const isPortfolioRuntimeEligibleWallet = (wallet: Wallet): boolean =>
  evaluatePortfolioRuntimeWalletEligibility(wallet).eligible;

export const summarizePortfolioRuntimeWalletEligibility = (
  wallets: Wallet[] | undefined,
): PortfolioRuntimeWalletEligibilitySummary => {
  const summary: PortfolioRuntimeWalletEligibilitySummary = {
    walletCount: 0,
    eligibleWalletCount: 0,
    excludedWalletCount: 0,
    missingWalletIdCount: 0,
    missingCopayerIdCount: 0,
    missingRequestPrivKeyCount: 0,
    nonMainnetNetworkCount: 0,
    pendingTssSessionCount: 0,
    incompleteCredentialsCount: 0,
  };

  for (const wallet of wallets || []) {
    summary.walletCount += 1;
    const evaluation = evaluatePortfolioRuntimeWalletEligibility(wallet);
    if (evaluation.eligible) {
      summary.eligibleWalletCount += 1;
    } else {
      summary.excludedWalletCount += 1;
    }

    if (evaluation.missingWalletId) {
      summary.missingWalletIdCount += 1;
    }
    if (evaluation.missingCopayerId) {
      summary.missingCopayerIdCount += 1;
    }
    if (evaluation.missingRequestPrivKey) {
      summary.missingRequestPrivKeyCount += 1;
    }
    if (evaluation.nonMainnetNetwork) {
      summary.nonMainnetNetworkCount += 1;
    }
    if (evaluation.pendingTssSession) {
      summary.pendingTssSessionCount += 1;
    }
    if (evaluation.incompleteCredentials) {
      summary.incompleteCredentialsCount += 1;
    }
  }

  return summary;
};
