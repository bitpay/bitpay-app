import React from 'react';
import {act, fireEvent, render, waitFor} from '@test/render';
import GlobalSelect from './GlobalSelect';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGetEmailRecipientAddress = jest.fn();
const mockCreateProposalAndBuildTxDetails = jest.fn(
  (..._args: unknown[]) => new Promise(() => undefined),
);

const mockWallet = {
  id: 'wallet-1',
  keyId: 'key-1',
  currencyAbbreviation: 'btc',
  chain: 'btc',
  network: 'livenet',
  receiveAddress: 'receive-address',
  balance: {sat: 100000},
  hideWallet: false,
  hideWalletByAccount: false,
  credentials: {copayerId: 'copayer-1'},
  isComplete: () => true,
};

const mockAccount = {
  id: 'account-1',
  keyId: 'key-1',
  chains: ['btc'],
  wallets: [{id: 'wallet-1', copayerId: 'copayer-1'}],
  accountName: 'Bitcoin',
  accountNumber: 0,
  receiveAddress: 'receive-address',
};

const mockState = {
  WALLET: {
    keys: {
      'key-1': {
        id: 'key-1',
        keyName: 'Main key',
        backupComplete: true,
        wallets: [mockWallet],
      },
    },
  },
  RATE: {rates: {}},
  APP: {
    defaultAltCurrency: {isoCode: 'USD'},
    hideAllBalances: false,
    homeCarouselConfig: [],
  },
};

const mockDispatch: jest.Mock = jest.fn(action =>
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action,
);

jest.mock('@shopify/flash-list', () => {
  const {createElement, Fragment} = require('react');
  return {
    FlashList: ({
      data,
      renderItem,
    }: {
      data: unknown[];
      renderItem: (info: {item: unknown; index: number}) => unknown;
    }) =>
      createElement(
        Fragment,
        null,
        data.map((item, index) =>
          createElement(Fragment, {key: index}, renderItem({item, index})),
        ),
      ),
  };
});

jest.mock('../../../components/chain-search/ChainSearch', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/list/AccountListRow', () => {
  const {createElement} = require('react');
  const {Pressable} = require('react-native');
  return {
    __esModule: true,
    default: ({
      accountItem,
      onPress,
    }: {
      accountItem: {id: string};
      onPress: () => void;
    }) =>
      createElement(Pressable, {testID: `account-${accountItem.id}`, onPress}),
  };
});

jest.mock('../../../store/wallet/utils/wallet', () => ({
  ...jest.requireActual('../../../store/wallet/utils/wallet'),
  buildAccountList: (
    _key: unknown,
    _isoCode: unknown,
    _rates: unknown,
    _dispatch: unknown,
    opts?: {filterByCustomWallets?: unknown[]},
  ) => (opts?.filterByCustomWallets?.length ? [mockAccount] : []),
  findWalletById: () => mockWallet,
}));

jest.mock('../../../store/wallet/utils/accountListCache', () => ({
  ...jest.requireActual('../../../store/wallet/utils/accountListCache'),
  buildAccountListSignature: () => '',
  getRatesRevision: () => 0,
  resolveAccountListSnapshot: ({build}: {build: () => unknown}) => build(),
}));

jest.mock('../../../store/wallet/effects/send/send', () => ({
  ...jest.requireActual('../../../store/wallet/effects/send/send'),
  createProposalAndBuildTxDetails: (...args: unknown[]) =>
    mockCreateProposalAndBuildTxDetails(...args),
}));

jest.mock('./send/sendTo.utils', () => ({
  ...jest.requireActual('./send/sendTo.utils'),
  getEmailRecipientAddress: (...args: unknown[]) =>
    mockGetEmailRecipientAddress(...args),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mockState),
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      key.replace(/{{(\w+)}}/g, (_match, name) => values?.[name] ?? ''),
  }),
}));

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useTokenContext: () => ({tokenOptionsByAddress: {}}),
}));

const navigation = {
  navigate: (...args: unknown[]) => mockNavigate(...args),
  setOptions: (...args: unknown[]) => mockSetOptions(...args),
  isFocused: () => true,
  addListener: () => () => undefined,
} as any;

const pickWalletAndEnterAmount = async (
  recipient: object,
  setButtonState: jest.Mock = jest.fn(),
) => {
  const {getByTestId} = render(
    <GlobalSelect
      navigation={navigation}
      route={{params: {context: 'scanner', recipient}} as any}
    />,
  );

  await act(async () => {
    fireEvent.press(getByTestId('account-account-1'));
  });

  const [, amountParams] = mockNavigate.mock.calls.find(
    ([screen]) => screen === 'WalletAmountScreen',
  );
  act(() => {
    amountParams.onAmountSelected('0.1', setButtonState, {sendMax: false});
  });
  return amountParams;
};

describe('GlobalSelect recipient flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the payment URI options after the amount is entered', async () => {
    await pickWalletAndEnterAmount({
      address: 'bc1-recipient',
      currency: 'btc',
      chain: 'btc',
      network: 'livenet',
      type: 'address',
      opts: {message: 'Invoice 42'},
    });

    expect(mockCreateProposalAndBuildTxDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet: mockWallet,
        recipient: expect.objectContaining({address: 'bc1-recipient'}),
        message: 'Invoice 42',
        sendMax: false,
      }),
    );
  });

  it('resets the Amount button once Confirm is open', async () => {
    mockCreateProposalAndBuildTxDetails.mockResolvedValueOnce({
      txDetails: {},
      txp: {},
    });
    const setButtonState = jest.fn();

    await pickWalletAndEnterAmount(
      {
        address: 'bc1-recipient',
        currency: 'btc',
        chain: 'btc',
        network: 'livenet',
        type: 'address',
      },
      setButtonState,
    );

    await waitFor(() => expect(setButtonState).toHaveBeenLastCalledWith(null), {
      timeout: 2000,
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'Confirm',
      expect.objectContaining({amount: 0.1}),
    );
    expect(setButtonState.mock.calls.map(([state]) => state)).toEqual([
      'loading',
      'success',
      null,
    ]);
  });

  it('titles the wallet list as the source of the payment', () => {
    render(
      <GlobalSelect
        navigation={navigation}
        route={
          {
            params: {
              context: 'scanner',
              recipient: {
                address: 'bc1-recipient',
                currency: 'btc',
                chain: 'btc',
              },
            },
          } as any
        }
      />,
    );

    const {headerTitle} = mockSetOptions.mock.lastCall[0];
    const {getByText} = render(headerTitle());
    expect(getByText('Sending from')).toBeTruthy();
  });

  it('offers to buy the recipient currency when no wallet can pay it', () => {
    const {getByText} = render(
      <GlobalSelect
        navigation={navigation}
        route={
          {
            params: {
              context: 'scanner',
              recipient: {
                address: 'D-recipient',
                currency: 'doge',
                chain: 'doge',
                network: 'livenet',
              },
            },
          } as any
        }
      />,
    );

    expect(
      getByText(
        'There are no wallets with enough funds on the Dogecoin network.',
      ),
    ).toBeTruthy();

    fireEvent.press(getByText('Buy Crypto'));

    expect(mockNavigate).toHaveBeenCalledWith('BuyAndSellRoot', {
      context: 'buyCrypto',
      currencyAbbreviation: 'doge',
      chain: 'doge',
    });
  });

  it('does not offer to buy for a testnet recipient', () => {
    const {getByText, queryByText} = render(
      <GlobalSelect
        navigation={navigation}
        route={
          {
            params: {
              context: 'scanner',
              recipient: {
                address: 'tb1-recipient',
                currency: 'btc',
                chain: 'btc',
                network: 'testnet',
              },
            },
          } as any
        }
      />,
    );

    expect(
      getByText(
        'There are no wallets with enough funds on the Bitcoin network.',
      ),
    ).toBeTruthy();
    expect(queryByText('Buy Crypto')).toBeNull();
  });

  const renderEmailRecipient = () =>
    render(
      <GlobalSelect
        navigation={navigation}
        route={
          {
            params: {
              context: 'contact',
              recipient: {
                email: 'bob@example.com',
                type: 'address',
                network: 'livenet',
              },
            },
          } as any
        }
      />,
    );

  it('sends to the address the email registered for the chosen wallet', async () => {
    mockGetEmailRecipientAddress.mockReturnValueOnce(
      Promise.resolve('bc1-email-address'),
    );
    const {getByTestId} = renderEmailRecipient();

    await act(async () => {
      fireEvent.press(getByTestId('account-account-1'));
    });

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        'WalletAmountScreen',
        expect.objectContaining({
          wallet: mockWallet,
          sendTo: expect.objectContaining({
            address: 'bc1-email-address',
            email: 'bob@example.com',
          }),
        }),
      ),
    );
    expect(mockGetEmailRecipientAddress).toHaveBeenCalledWith(
      'bob@example.com',
      mockWallet,
    );
  });

  it('stops before Amount when the email has no address for the chosen wallet', async () => {
    mockGetEmailRecipientAddress.mockReturnValueOnce(
      Promise.resolve(undefined),
    );
    const {getByTestId} = renderEmailRecipient();

    await act(async () => {
      fireEvent.press(getByTestId('account-account-1'));
    });

    await waitFor(
      () =>
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              title: 'Unable to Send to Contact',
            }),
          }),
        ),
      {timeout: 2000},
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'WalletAmountScreen',
      expect.anything(),
    );
  });
});
