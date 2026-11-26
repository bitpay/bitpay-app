import {
  getTransakHeadlessConfirmButtonKind,
  getTransakHeadlessRedirectResult,
  getTransakHeadlessRedirectUrls,
  getTransakHeadlessUnsupportedTermsIds,
  isSameTransakHeadlessQuoteForCustomer,
  isSameTransakHeadlessTermsIds,
  isTransakHeadlessKycEnabled,
  isTransakHeadlessPaymentMethodEnabled,
} from './transak-utils';
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';

const headlessConfig: BuyCryptoConfig = {
  transak: {config: {embeddedBuyDisabled: false}},
};

describe('isTransakHeadlessPaymentMethodEnabled', () => {
  it('is enabled for cards unless the config turns it off', () => {
    expect(
      isTransakHeadlessPaymentMethodEnabled('creditCard', headlessConfig, 'US'),
    ).toBe(true);
    expect(
      isTransakHeadlessPaymentMethodEnabled('debitCard', headlessConfig, 'DE'),
    ).toBe(true);
    expect(
      isTransakHeadlessPaymentMethodEnabled('creditCard', undefined, 'US'),
    ).toBe(true);
  });

  it('is disabled when the config turns it off', () => {
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'creditCard',
        {transak: {config: {embeddedBuyDisabled: true}}},
        'US',
      ),
    ).toBe(false);
  });

  it('is disabled in the UK and for other payment methods', () => {
    expect(
      isTransakHeadlessPaymentMethodEnabled('creditCard', headlessConfig, 'GB'),
    ).toBe(false);
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'sepaBankTransfer',
        headlessConfig,
        'DE',
      ),
    ).toBe(false);
  });

  it('enables the wallets only where the device supports them', () => {
    const support = {applePaySupported: true, googlePaySupported: true};
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'applePay',
        headlessConfig,
        'US',
        support,
      ),
    ).toBe(true);
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'googlePay',
        headlessConfig,
        'US',
        support,
      ),
    ).toBe(true);
    expect(
      isTransakHeadlessPaymentMethodEnabled('applePay', headlessConfig, 'US'),
    ).toBe(false);
    expect(
      isTransakHeadlessPaymentMethodEnabled('googlePay', headlessConfig, 'US'),
    ).toBe(false);
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'applePay',
        headlessConfig,
        'GB',
        support,
      ),
    ).toBe(false);
  });

  it('turns each payment method off on its own', () => {
    const config: BuyCryptoConfig = {
      transak: {
        config: {
          paymentMethods: {
            cardEmbedded: {disabled: true},
            applePayEmbedded: {disabled: true},
          },
        },
      },
    };
    const support = {applePaySupported: true, googlePaySupported: true};
    expect(
      isTransakHeadlessPaymentMethodEnabled('creditCard', config, 'US'),
    ).toBe(false);
    expect(
      isTransakHeadlessPaymentMethodEnabled('applePay', config, 'US', support),
    ).toBe(false);
    expect(
      isTransakHeadlessPaymentMethodEnabled('googlePay', config, 'US', support),
    ).toBe(true);
    expect(
      isTransakHeadlessPaymentMethodEnabled(
        'googlePay',
        {transak: {config: {embeddedBuyDisabled: true}}},
        'US',
        support,
      ),
    ).toBe(false);
  });
});

describe('isTransakHeadlessKycEnabled', () => {
  it('is enabled unless the config turns it off', () => {
    expect(isTransakHeadlessKycEnabled(undefined)).toBe(true);
    expect(isTransakHeadlessKycEnabled(headlessConfig)).toBe(true);
    expect(
      isTransakHeadlessKycEnabled({
        transak: {config: {headlessKycDisabled: false}},
      }),
    ).toBe(true);
  });

  it('is disabled when the config turns it off', () => {
    expect(
      isTransakHeadlessKycEnabled({
        transak: {config: {headlessKycDisabled: true}},
      }),
    ).toBe(false);
  });
});

describe('getTransakHeadlessRedirectResult', () => {
  const {successUrl, failureUrl} = getTransakHeadlessRedirectUrls('order-id');

  it('reads the result of the redirect URLs', () => {
    expect(getTransakHeadlessRedirectResult(successUrl)).toBe('success');
    expect(getTransakHeadlessRedirectResult(failureUrl)).toBe('failure');
  });

  it('reads the result when Transak adds its own parameters', () => {
    expect(
      getTransakHeadlessRedirectResult(`${successUrl}&orderId=transak-order`),
    ).toBe('success');
  });

  it('reads the result of the app deep link', () => {
    expect(
      getTransakHeadlessRedirectResult(
        'bitpay://transak?partnerOrderId=order-id&headlessResult=failure',
      ),
    ).toBe('failure');
  });

  it('ignores any other URL', () => {
    expect(
      getTransakHeadlessRedirectResult(
        'https://3ds.example.com/?headlessResult=success',
      ),
    ).toBe(undefined);
    expect(
      getTransakHeadlessRedirectResult(
        successUrl.replace('headlessResult=success', 'headlessResult=other'),
      ),
    ).toBe(undefined);
  });
});

describe('Transak headless disclaimers', () => {
  it('finds the disclaimers the app cannot show', () => {
    expect(
      getTransakHeadlessUnsupportedTermsIds([
        'MICA_EEA_BUY',
        'NEW_DISCLAIMER',
        'US_TERMS_RETURNING',
      ]),
    ).toEqual(['NEW_DISCLAIMER']);
    expect(getTransakHeadlessUnsupportedTermsIds(undefined)).toEqual([]);
  });

  it('picks the button label the disclaimers require', () => {
    expect(
      getTransakHeadlessConfirmButtonKind([
        'ZEROHASH_USER_AGREEMENT',
        'TRANSAK_TERMS_OF_SERVICE',
      ]),
    ).toBe('agreeAndConfirm');
    expect(getTransakHeadlessConfirmButtonKind(['COINME_USER_AGREEMENT'])).toBe(
      'agreeAndConfirm',
    );
    expect(getTransakHeadlessConfirmButtonKind(['US_TERMS_RETURNING'])).toBe(
      'confirm',
    );
    expect(
      getTransakHeadlessConfirmButtonKind(['ZEROHASH_USER_AGREEMENT']),
    ).toBe('confirm');
    expect(
      getTransakHeadlessConfirmButtonKind([
        'MICA_EEA_BUY',
        'GB_INVESTMENT_RISK_WARNING',
      ]),
    ).toBe(undefined);
    expect(getTransakHeadlessConfirmButtonKind([])).toBe(undefined);
  });

  it('compares the disclaimers of two quotes in order', () => {
    expect(isSameTransakHeadlessTermsIds(['A', 'B'], ['A', 'B'])).toBe(true);
    expect(isSameTransakHeadlessTermsIds(undefined, [])).toBe(true);
    expect(isSameTransakHeadlessTermsIds(['A', 'B'], ['B', 'A'])).toBe(false);
    expect(isSameTransakHeadlessTermsIds(['A'], [])).toBe(false);
  });
});

describe('isSameTransakHeadlessQuoteForCustomer', () => {
  const shown = {
    fiatAmount: 100,
    cryptoAmount: 0.001,
    totalFee: 4.5,
    termsIds: ['TRANSAK_TERMS_OF_SERVICE'],
  };

  it('is the same quote when amounts and disclaimers match', () => {
    expect(isSameTransakHeadlessQuoteForCustomer(shown, {...shown})).toBe(true);
  });

  it('is the same quote when only the estimated crypto amount changes', () => {
    const fresh = {...shown, cryptoAmount: 0.00099};
    expect(isSameTransakHeadlessQuoteForCustomer(shown, fresh)).toBe(true);
  });

  it('is a different quote when the fee or the total changes', () => {
    expect(
      isSameTransakHeadlessQuoteForCustomer(shown, {...shown, totalFee: 5}),
    ).toBe(false);
    expect(
      isSameTransakHeadlessQuoteForCustomer(shown, {...shown, fiatAmount: 101}),
    ).toBe(false);
  });

  it('is a different quote when the disclaimers change', () => {
    expect(
      isSameTransakHeadlessQuoteForCustomer(shown, {...shown, termsIds: []}),
    ).toBe(false);
  });
});
