import {
  Key,
  TransactionProposal,
  Wallet,
} from '../../../store/wallet/wallet.models';

export type GroupedTxpsByWallet = {
  id: string;
  walletId: string;
  txps: TransactionProposal[];
  needSign: boolean;
};

export type TransactionProposalNotificationSection = {
  title: string;
  type: 'pending' | 'accepted' | 'rejected';
  data: GroupedTxpsByWallet[];
};

type ProposalBucket = 'unsent' | 'pending' | 'accepted' | 'rejected';

const getWalletLookup = (wallets: Wallet[]) => {
  const walletById = new Map<string, Wallet>();

  for (const wallet of wallets) {
    if (wallet.id) {
      walletById.set(wallet.id, wallet);
    }
    if (wallet.credentials?.walletId) {
      walletById.set(wallet.credentials.walletId, wallet);
    }
  }

  return walletById;
};

const classifyProposal = (
  proposal: TransactionProposal,
): {bucket: ProposalBucket; proposal: TransactionProposal} => {
  const action = proposal.actions?.find(
    proposalAction => proposalAction.copayerId === proposal.copayerId,
  );
  const actionType = action?.type as unknown as string | undefined;
  const pendingForUs =
    (!action || actionType === 'failed') && proposal.status === 'pending';

  if (proposal.requiredSignatures === 1) {
    return {
      bucket: proposal.payProUrl ? 'rejected' : 'unsent',
      proposal: {...proposal, pendingForUs},
    };
  }

  if (actionType === 'accept') {
    return {
      bucket: 'accepted',
      proposal: {...proposal, pendingForUs, statusForUs: 'accepted'},
    };
  }

  if (actionType === 'reject') {
    return {
      bucket: 'rejected',
      proposal: {...proposal, pendingForUs, statusForUs: 'rejected'},
    };
  }

  return {
    bucket: 'pending',
    proposal: {...proposal, pendingForUs, statusForUs: 'pending'},
  };
};

const groupProposalsByWallet = ({
  proposals,
  sectionId,
  walletById,
  keys,
}: {
  proposals: TransactionProposal[];
  sectionId: ProposalBucket;
  walletById: Map<string, Wallet>;
  keys: Record<string, Key>;
}): GroupedTxpsByWallet[] => {
  const proposalsByWallet = new Map<string, TransactionProposal[]>();

  for (const proposal of proposals) {
    const walletProposals = proposalsByWallet.get(proposal.walletId);
    if (walletProposals) {
      walletProposals.push(proposal);
    } else {
      proposalsByWallet.set(proposal.walletId, [proposal]);
    }
  }

  const groups: GroupedTxpsByWallet[] = [];
  for (const [proposalWalletId, walletProposals] of proposalsByWallet) {
    const wallet = walletById.get(proposalWalletId);
    if (!wallet) {
      continue;
    }

    const walletKey = keys[wallet.keyId];
    const canBeSigned = !!walletKey && !walletKey.isReadOnly;
    groups.push({
      id: sectionId + ':' + wallet.id,
      walletId: wallet.id,
      txps: walletProposals,
      needSign:
        canBeSigned &&
        walletProposals.some(
          proposal =>
            proposal.statusForUs === 'pending' && !!proposal.amountStr,
        ),
    });
  }

  return groups;
};

export const buildTransactionProposalNotificationSections = ({
  keys,
  wallets,
  walletId,
  translate,
}: {
  keys: Record<string, Key>;
  wallets: Wallet[];
  walletId?: string;
  translate: (key: string) => string;
}): TransactionProposalNotificationSection[] => {
  const buckets: Record<ProposalBucket, TransactionProposal[]> = {
    unsent: [],
    pending: [],
    accepted: [],
    rejected: [],
  };

  for (const wallet of wallets) {
    if (
      walletId &&
      wallet.id !== walletId &&
      wallet.credentials?.walletId !== walletId
    ) {
      continue;
    }

    for (const pendingProposal of wallet.pendingTxps || []) {
      const classified = classifyProposal(pendingProposal);
      buckets[classified.bucket].push(classified.proposal);
    }
  }

  const walletById = getWalletLookup(wallets);
  const sectionDefinitions: Array<{
    id: ProposalBucket;
    title: string;
    type: TransactionProposalNotificationSection['type'];
  }> = [
    {
      id: 'unsent',
      title: translate('Unsent Transactions'),
      type: 'pending',
    },
    {
      id: 'pending',
      title: translate('Payment Proposal'),
      type: 'pending',
    },
    {id: 'accepted', title: translate('Accepted'), type: 'accepted'},
    {id: 'rejected', title: translate('Rejected'), type: 'rejected'},
  ];

  return sectionDefinitions.flatMap(section => {
    const proposals = buckets[section.id];
    if (!proposals.length) {
      return [];
    }

    const data = groupProposalsByWallet({
      proposals,
      sectionId: section.id,
      walletById,
      keys,
    });

    return data.length
      ? [{title: section.title, type: section.type, data}]
      : [];
  });
};
