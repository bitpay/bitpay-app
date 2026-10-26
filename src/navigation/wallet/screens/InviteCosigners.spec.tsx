import React from 'react';
import {render} from '@test/render';
import InviteCosigners from './InviteCosigners';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockState: {WALLET: {keys: Record<string, any>}} = {
  WALLET: {keys: {}},
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('react-navigation-backhandler', () => ({
  useAndroidBackHandler: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock(
  '../../../store/wallet/effects/create-multisig/create-multisig',
  () => ({
    startTSSCeremony: jest.fn(),
    addCoSignerToTSS: jest.fn(),
    cancelTSSCeremony: jest.fn(() => ({type: 'TEST/CANCEL_TSS_CEREMONY'})),
  }),
);

jest.mock('../WalletGroup', () => ({
  WalletScreens: {BACKUP_SHARED_KEY: 'BackupSharedKey'},
}));

const keyId = 'pending-tss-key';

const makePendingTssKey = () => ({
  id: keyId,
  wallets: [{id: `pending-tss-${keyId}-btc`, pendingTssSession: true}],
  tssSession: {
    m: 2,
    n: 2,
    walletName: 'Shared Wallet',
    status: 'collecting_copayers',
    copayers: [
      {partyId: 1, pubKey: '', name: 'Co-Signer 2', status: 'pending'},
    ],
  },
});

const screen = () => (
  <InviteCosigners
    navigation={mockNavigation as any}
    route={
      {
        key: 'InviteCosigners',
        name: 'InviteCosigners',
        params: {keyId},
      } as any
    }
  />
);

describe('InviteCosigners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.WALLET.keys = {[keyId]: makePendingTssKey()};
  });

  it('keeps rendering when its key is deleted while it is mounted', () => {
    const {rerender, toJSON} = render(screen());

    mockState.WALLET.keys = {};

    expect(() => rerender(screen())).not.toThrow();
    expect(toJSON()).toBeNull();
  });
});
