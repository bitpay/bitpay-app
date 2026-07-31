import {buildTransactionProposalNotificationSections} from './transactionProposalNotificationsModel';

const makeProposal = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'proposal-1',
    walletId: 'bwc-wallet-1',
    copayerId: 'copayer-1',
    actions: [],
    status: 'pending',
    statusForUs: '',
    pendingForUs: false,
    requiredSignatures: 2,
    amountStr: '1 BTC',
    ...overrides,
  } as any);

const makeWallet = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'wallet-1',
    keyId: 'key-1',
    credentials: {walletId: 'bwc-wallet-1'},
    pendingTxps: [],
    ...overrides,
  } as any);
const keys = {'key-1': {id: 'key-1', isReadOnly: false}} as any;
const translate = (key: string) => key;

describe('buildTransactionProposalNotificationSections', () => {
  it('builds stable wallet group ids without mutating Redux proposals', () => {
    const proposal = makeProposal();
    const wallet = makeWallet({pendingTxps: [proposal]});

    const first = buildTransactionProposalNotificationSections({
      keys,
      wallets: [wallet],
      translate,
    });
    const second = buildTransactionProposalNotificationSections({
      keys,
      wallets: [wallet],
      translate,
    });

    expect(first[0].data[0].id).toBe('pending:wallet-1');
    expect(second[0].data[0].id).toBe(first[0].data[0].id);
    expect(first[0].data[0].needSign).toBe(true);
    expect(first[0].data[0].txps[0]).not.toBe(proposal);
    expect(proposal.statusForUs).toBe('');
    expect(proposal.pendingForUs).toBe(false);
  });

  it('groups proposals by their derived status', () => {
    const wallet = makeWallet({
      pendingTxps: [
        makeProposal({
          id: 'accepted',
          actions: [{copayerId: 'copayer-1', type: 'accept'}],
        }),
        makeProposal({
          id: 'rejected',
          actions: [{copayerId: 'copayer-1', type: 'reject'}],
        }),
      ],
    });

    const sections = buildTransactionProposalNotificationSections({
      keys,
      wallets: [wallet],
      translate,
    });

    expect(sections.map(section => section.type)).toEqual([
      'accepted',
      'rejected',
    ]);
  });

  it('filters proposals for a specific wallet', () => {
    const wallet = makeWallet({pendingTxps: [makeProposal()]});
    const otherWallet = {
      ...wallet,
      id: 'wallet-2',
      credentials: {walletId: 'bwc-wallet-2'},
      pendingTxps: [makeProposal({id: 'other', walletId: 'bwc-wallet-2'})],
    };

    const sections = buildTransactionProposalNotificationSections({
      keys,
      wallets: [wallet, otherWallet as any],
      walletId: 'bwc-wallet-2',
      translate,
    });

    expect(sections[0].data).toHaveLength(1);
    expect(sections[0].data[0].walletId).toBe('wallet-2');
  });

  it('does not offer signing for a read-only key', () => {
    const wallet = makeWallet({pendingTxps: [makeProposal()]});

    const sections = buildTransactionProposalNotificationSections({
      keys: {'key-1': {...keys['key-1'], isReadOnly: true}},
      wallets: [wallet],
      translate,
    });

    expect(sections[0].data[0].needSign).toBe(false);
  });

  it('keeps single-signature proposals in their original buckets', () => {
    const wallet = makeWallet({
      pendingTxps: [
        makeProposal({id: 'unsent', requiredSignatures: 1}),
        makeProposal({
          id: 'paypro',
          requiredSignatures: 1,
          payProUrl: 'https://merchant.example/pay',
        }),
      ],
    });

    const sections = buildTransactionProposalNotificationSections({
      keys,
      wallets: [wallet],
      translate,
    });

    expect(sections.map(section => section.title)).toEqual([
      'Unsent Transactions',
      'Rejected',
    ]);
  });
});
