import {Wallet} from '../../../wallet/wallet.models';
import {TransakHeadlessGetQuoteRequestData} from '../../buy-crypto.models';
import {
  isTransakHeadlessOverLimit,
  prepareTransakHeadlessCheckout,
  TransakHeadlessError,
  transakHeadlessGetOrderQuote,
  transakHeadlessSendOtp,
  TransakHeadlessUnavailableError,
} from './transak-headless';

const quoteRequestData: TransakHeadlessGetQuoteRequestData = {
  env: 'sandbox',
  fiatCurrency: 'EUR',
  cryptoCurrency: 'ETH',
  network: 'ethereum',
  paymentMethod: 'credit_debit_card',
  fiatAmount: 100,
  partnerCustomerId: 'wallet-id',
  partnerOrderId: 'external-id',
};

const quote = {
  quoteId: 'quote-id',
  conversionPrice: 0.0003,
  fiatAmount: 100,
  cryptoAmount: 0.03,
  totalFee: 5,
  network: 'ethereum',
  termsIds: [],
};

const ok = (data: any) => Promise.resolve({body: {data}});

const createWallet = (overrides: {[method: string]: jest.Mock} = {}) => {
  const wallet = {
    transakHeadlessSendOtp: jest.fn(),
    transakHeadlessGetQuote: jest.fn(() => ok(quote)),
    transakHeadlessGetKycRequirement: jest.fn(() =>
      ok({
        status: 'APPROVED',
        kycType: 'STANDARD',
        isAllowedToPlaceOrder: true,
      }),
    ),
    transakHeadlessGetUserLimits: jest.fn(() =>
      ok({
        limits: {1: 500, 30: 1000, 365: 2000},
        remaining: {1: 500, 30: 1000, 365: 2000},
        exceeded: {1: false, 30: false, 365: false},
      }),
    ),
    transakHeadlessGetActiveOrders: jest.fn(() => ok([])),
    transakHeadlessCancelOrder: jest.fn(() => ok({status: 'CANCELLED'})),
    transakHeadlessGetSavedCards: jest.fn(() =>
      ok({
        paymentInstruments: {
          credit_debit_card: {
            cards: [{paymentIdentifierId: 'card-id', last4: '1234'}],
          },
        },
      }),
    ),
    ...overrides,
  };
  return wallet as unknown as Wallet & typeof wallet;
};

describe('Transak headless responses', () => {
  it('returns the data of a successful response', async () => {
    const wallet = createWallet({
      transakHeadlessSendOtp: jest.fn(() => ok({stateToken: 'state-token'})),
    });
    await expect(
      transakHeadlessSendOtp(wallet, {env: 'sandbox', email: 'a@b.com'}),
    ).resolves.toEqual({stateToken: 'state-token'});
  });

  it('turns a Transak error body into a TransakHeadlessError', async () => {
    const wallet = createWallet({
      transakHeadlessSendOtp: jest.fn(() =>
        Promise.resolve({
          body: {
            error: {
              statusCode: 422,
              message: 'KYC not approved',
              errorCode: 6002,
            },
          },
        }),
      ),
    });
    const promise = transakHeadlessSendOtp(wallet, {
      env: 'sandbox',
      email: 'a@b.com',
    });
    await expect(promise).rejects.toBeInstanceOf(TransakHeadlessError);
    await expect(promise).rejects.toMatchObject({
      statusCode: 422,
      errorCode: 6002,
      message: 'KYC not approved',
    });
  });

  it('turns a top level error status into a TransakHeadlessError', async () => {
    const wallet = createWallet({
      transakHeadlessSendOtp: jest.fn(() =>
        Promise.resolve({body: {statusCode: 401, message: 'Unauthorized'}}),
      ),
    });
    await expect(
      transakHeadlessSendOtp(wallet, {env: 'sandbox', email: 'a@b.com'}),
    ).rejects.toMatchObject({statusCode: 401});
  });
});

describe('transakHeadlessGetOrderQuote', () => {
  it('requests the quote as the user', async () => {
    const wallet = createWallet();
    await transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token');
    expect(wallet.transakHeadlessGetQuote).toHaveBeenCalledWith({
      ...quoteRequestData,
      userAccessToken: 'user-token',
    });
    expect(wallet.transakHeadlessGetKycRequirement).toHaveBeenCalledWith({
      env: 'sandbox',
      userAccessToken: 'user-token',
      quoteId: 'quote-id',
    });
  });

  it('reads the KYC status from data.kyc.status', async () => {
    const wallet = createWallet({
      transakHeadlessGetKycRequirement: jest.fn(() =>
        ok({kyc: {status: 'APPROVED', type: 'SIMPLE'}}),
      ),
    });
    await expect(
      transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token'),
    ).resolves.toMatchObject({quote: {quoteId: 'quote-id'}});
  });

  it('prefers data.kyc.status over data.status', async () => {
    const wallet = createWallet({
      transakHeadlessGetKycRequirement: jest.fn(() =>
        ok({status: 'APPROVED', kyc: {status: 'SUBMITTED'}}),
      ),
    });
    await expect(
      transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token'),
    ).rejects.toBeInstanceOf(TransakHeadlessUnavailableError);
  });

  it('rejects a KYC that is not approved even if Transak allows the order', async () => {
    const wallet = createWallet({
      transakHeadlessGetKycRequirement: jest.fn(() =>
        ok({
          status: 'NOT_SUBMITTED',
          kycType: 'SIMPLE',
          isAllowedToPlaceOrder: true,
        }),
      ),
    });
    await expect(
      transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token'),
    ).rejects.toThrow('kyc: NOT_SUBMITTED (SIMPLE)');
  });

  it('rejects an approved KYC that is not allowed to place the order', async () => {
    const wallet = createWallet({
      transakHeadlessGetKycRequirement: jest.fn(() =>
        ok({status: 'APPROVED', isAllowedToPlaceOrder: false}),
      ),
    });
    await expect(
      transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token'),
    ).rejects.toBeInstanceOf(TransakHeadlessUnavailableError);
  });

  it('rejects a quote with disclaimers the app cannot show', async () => {
    const wallet = createWallet({
      transakHeadlessGetQuote: jest.fn(() =>
        ok({...quote, termsIds: ['MICA_EEA_BUY', 'NEW_DISCLAIMER']}),
      ),
    });
    await expect(
      transakHeadlessGetOrderQuote(wallet, quoteRequestData, 'user-token'),
    ).rejects.toThrow('terms: NEW_DISCLAIMER');
    expect(wallet.transakHeadlessGetKycRequirement).not.toHaveBeenCalled();
  });
});

describe('isTransakHeadlessOverLimit', () => {
  it('is over the limit when a period is exceeded', () => {
    expect(
      isTransakHeadlessOverLimit({exceeded: {1: false, 30: true}}, 10),
    ).toBe(true);
  });

  it('is over the limit when the amount is above what remains', () => {
    expect(isTransakHeadlessOverLimit({remaining: {1: 50, 30: 500}}, 100)).toBe(
      true,
    );
  });

  it('is within the limit otherwise', () => {
    expect(
      isTransakHeadlessOverLimit(
        {remaining: {1: 500, 30: 500}, exceeded: {1: false, 30: false}},
        100,
      ),
    ).toBe(false);
  });
});

describe('prepareTransakHeadlessCheckout', () => {
  it('is ready with the quote and the saved cards', async () => {
    const wallet = createWallet();
    const preparation = await prepareTransakHeadlessCheckout(
      wallet,
      quoteRequestData,
      'user-token',
    );
    expect(preparation).toMatchObject({
      status: 'ready',
      quote: {quoteId: 'quote-id'},
      savedCards: [{paymentIdentifierId: 'card-id', last4: '1234'}],
    });
    expect(wallet.transakHeadlessGetUserLimits).toHaveBeenCalledWith({
      env: 'sandbox',
      userAccessToken: 'user-token',
      kycType: 'STANDARD',
      fiatCurrency: 'EUR',
    });
  });

  it('is unavailable when the KYC is not approved', async () => {
    const wallet = createWallet({
      transakHeadlessGetKycRequirement: jest.fn(() =>
        ok({status: 'ADDITIONAL_FORMS_REQUIRED', isAllowedToPlaceOrder: true}),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token'),
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'kyc: ADDITIONAL_FORMS_REQUIRED (-)',
    });
  });

  it('is unauthorized when Transak rejects the session', async () => {
    const wallet = createWallet({
      transakHeadlessGetQuote: jest.fn(() =>
        Promise.resolve({
          body: {error: {statusCode: 401, message: 'Unauthorized'}},
        }),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token'),
    ).resolves.toEqual({status: 'unauthorized'});
  });

  it('is unavailable when the amount is over the user limits', async () => {
    const wallet = createWallet({
      transakHeadlessGetUserLimits: jest.fn(() =>
        ok({remaining: {1: 50, 30: 1000, 365: 2000}}),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token'),
    ).resolves.toEqual({status: 'unavailable', reason: 'limits: exceeded'});
  });

  it('goes on if the user limits cannot be read', async () => {
    const wallet = createWallet({
      transakHeadlessGetUserLimits: jest.fn(() =>
        Promise.reject(new Error('Network error')),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token'),
    ).resolves.toMatchObject({status: 'ready'});
  });

  it('is unavailable without cancelling when another active order exists', async () => {
    const wallet = createWallet({
      transakHeadlessGetActiveOrders: jest.fn(() =>
        ok([{orderId: 'widget-order', status: 'AWAITING_PAYMENT_FROM_USER'}]),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token', {
        ownOrderIds: ['headless-order'],
      }),
    ).resolves.toEqual({
      status: 'unavailable',
      reason: 'active order: widget-order',
    });
    expect(wallet.transakHeadlessCancelOrder).not.toHaveBeenCalled();
  });

  it('cancels its own abandoned order and goes on', async () => {
    const onOwnOrderCancelled = jest.fn();
    const wallet = createWallet({
      transakHeadlessGetActiveOrders: jest.fn(() =>
        ok([{orderId: 'headless-order', status: 'AWAITING_PAYMENT_FROM_USER'}]),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token', {
        ownOrderIds: ['headless-order'],
        onOwnOrderCancelled,
      }),
    ).resolves.toMatchObject({status: 'ready'});
    expect(wallet.transakHeadlessCancelOrder).toHaveBeenCalledWith({
      env: 'sandbox',
      userAccessToken: 'user-token',
      orderId: 'headless-order',
      cancelReason: 'cancel',
    });
    expect(onOwnOrderCancelled).toHaveBeenCalledWith(
      'headless-order',
      'CANCELLED',
    );
  });

  it('is unavailable when its own abandoned order cannot be cancelled', async () => {
    const wallet = createWallet({
      transakHeadlessGetActiveOrders: jest.fn(() =>
        ok([{orderId: 'headless-order', status: 'AWAITING_PAYMENT_FROM_USER'}]),
      ),
      transakHeadlessCancelOrder: jest.fn(() =>
        Promise.resolve({
          body: {error: {statusCode: 400, message: 'Invalid Order id'}},
        }),
      ),
    });
    await expect(
      prepareTransakHeadlessCheckout(wallet, quoteRequestData, 'user-token', {
        ownOrderIds: ['headless-order'],
      }),
    ).resolves.toMatchObject({status: 'unavailable'});
  });
});
