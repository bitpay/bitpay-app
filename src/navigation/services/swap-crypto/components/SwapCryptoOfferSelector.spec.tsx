import React from 'react';
import {act, render, waitFor} from '@test/render';
import SwapCryptoOfferSelector, {
  SwapCryptoOffer,
} from './SwapCryptoOfferSelector';

let mockState: any;
const mockDispatch: any = jest.fn((action: any) =>
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action,
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({navigate: jest.fn(), dispatch: jest.fn()}),
  useIsFocused: () => true,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock('../../../../utils/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: jest.fn(() => ({type: 'TRACK'}))},
}));

jest.mock('../../../../store/wallet/effects/address/address', () => ({
  createWalletAddress:
    ({wallet}: {wallet: {chain: string}}) =>
    async () =>
      `${wallet.chain}-address`,
}));

jest.mock('../../../../components/modal/base/sheet/SheetModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Captured from https://api-v2.swaps.xyz/api/getQuote: 0.05 ETH (Ethereum) -> BTC
const ethToBtcQuote = {
  vmId: 'evm',
  amountIn: {
    amount: '50000000000000000',
    decimals: 18,
    symbol: 'ETH',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
  },
  amountInMax: {amount: '50000000000000000', decimals: 18, symbol: 'ETH'},
  amountOut: {amount: '142580', decimals: 8, symbol: 'BTC'},
  amountOutMin: {amount: '142580', decimals: 8, symbol: 'BTC'},
  protocolFee: {
    amount: '0',
    decimals: 18,
    symbol: 'ETH',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
  },
  applicationFee: {
    amount: '500000000000000',
    decimals: 18,
    symbol: 'ETH',
    chainId: 1,
    address: '0x0000000000000000000000000000000000000000',
  },
  exchangeRate: 0.028516,
  estimatedTxTime: 25,
  estimatedPriceImpact: -0.008651,
  requiresTokenApproval: false,
  requiresRegisterTransaction: true,
};

// Captured from https://api-v2.swaps.xyz/api/getQuote: 0.00001 BTC -> ETH
const amountTooLowQuote = {
  success: false,
  error: {
    code: 'AMOUNT_TOO_LOW',
    message: 'The specified amount is too low.',
    statusCode: 400,
    details: {minAmount: 0.00002232},
  },
};

const coin = (currencyAbbreviation: string, chain: string) => ({
  currencyAbbreviation,
  symbol: currencyAbbreviation,
  chain,
  name: currencyAbbreviation,
  supportedBy: {moonpay: true},
});

const makeWallet = (currencyAbbreviation: string, chain: string, quote: any) =>
  ({
    id: `${chain}-wallet`,
    currencyAbbreviation,
    chain,
    network: 'livenet',
    balance: {cryptoSpendable: '100'},
    moonpaySwapGetQuote: jest.fn().mockResolvedValue({body: quote}),
  } as any);

const renderSelector = (
  walletFrom: any,
  walletTo: any,
  amountFrom: number,
  onSelectOffer: (offer: SwapCryptoOffer | undefined) => void,
) =>
  render(
    <SwapCryptoOfferSelector
      amountFrom={amountFrom}
      coinFrom={walletFrom.currencyAbbreviation}
      chainFrom={walletFrom.chain}
      coinTo={walletTo.currencyAbbreviation}
      chainTo={walletTo.chain}
      selectedWalletFrom={walletFrom}
      selectedWalletTo={walletTo}
      swapCryptoConfig={undefined}
      preSetPartner={'moonpay'}
      preLoadPartnersData={
        {
          changelly: {key: 'changelly', supportedCoins: []},
          thorswap: {key: 'thorswap', supportedCoins: []},
          moonpay: {
            key: 'moonpay',
            showOffer: true,
            disabled: false,
            supportedCoins: [coin('eth', 'eth'), coin('btc', 'btc')],
            limits: {min: 0.00000001, max: undefined},
          },
        } as any
      }
      onSelectOffer={onSelectOffer}
      setOffersLoading={jest.fn()}
      swapLimits={{minAmount: 0.00000001}}
    />,
  );

// The selector debounces quotes by 100ms. Let that timer and the quote promise
// settle inside act so React flushes the resulting state updates
const flushQuotes = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
  });

describe('SwapCryptoOfferSelector - MoonPay', () => {
  beforeEach(() => {
    mockState = {
      RATE: {rates: {}},
      APP: {defaultAltCurrency: {isoCode: 'USD'}},
      WALLET: {customTokenDataByAddress: {}},
    };
  });

  it('quotes an EVM swap and selects the MoonPay offer', async () => {
    const walletFrom = makeWallet('eth', 'eth', ethToBtcQuote);
    const walletTo = makeWallet('btc', 'btc', undefined);
    const onSelectOffer = jest.fn();

    renderSelector(walletFrom, walletTo, 0.05, onSelectOffer);
    await flushQuotes();

    await waitFor(() =>
      expect(onSelectOffer).toHaveBeenLastCalledWith(
        expect.objectContaining({key: 'moonpay'}),
      ),
    );

    expect(walletFrom.moonpaySwapGetQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        srcChainId: 1,
        srcToken: '0x0000000000000000000000000000000000000000',
        dstChainId: 999000313,
        dstToken: '0x0000000000000000000000000000000000000000',
        amount: '50000000000000000',
        swapDirection: 'exact-amount-in',
        slippage: 100,
        returnDepositAddress: false,
      }),
    );

    const offer: SwapCryptoOffer = onSelectOffer.mock.calls.at(-1)[0];
    expect(offer.amountReceiving).toBe('0.0014258');
    expect(offer.fee).toBeCloseTo(0.0005);
    expect(offer.estimatedTime).toBe('0h 0m 25s');
  });

  it('asks for a deposit address when swapping from a non-EVM chain', async () => {
    const walletFrom = makeWallet('btc', 'btc', amountTooLowQuote);
    const walletTo = makeWallet('eth', 'eth', undefined);
    const onSelectOffer = jest.fn();

    renderSelector(walletFrom, walletTo, 0.00001, onSelectOffer);
    await flushQuotes();

    await waitFor(() =>
      expect(walletFrom.moonpaySwapGetQuote).toHaveBeenCalledWith(
        expect.objectContaining({
          srcChainId: 999000313,
          dstChainId: 1,
          amount: '1000',
          returnDepositAddress: true,
          // Same refund address getAction sends, so both price one route
          refundTo: 'btc-address',
        }),
      ),
    );
  });

  it('does not select an offer when MoonPay rejects the amount', async () => {
    const walletFrom = makeWallet('btc', 'btc', amountTooLowQuote);
    const walletTo = makeWallet('eth', 'eth', undefined);
    const onSelectOffer = jest.fn();

    const {findByText} = renderSelector(
      walletFrom,
      walletTo,
      0.00001,
      onSelectOffer,
    );
    await flushQuotes();

    expect(
      await findByText(
        'There are currently no offers that satisfy your request. Please try again later.',
      ),
    ).toBeTruthy();
    expect(onSelectOffer).not.toHaveBeenCalledWith(
      expect.objectContaining({key: 'moonpay'}),
    );
  });
});
