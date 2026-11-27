import {
  getTransakHeadlessConfirmButtonKind,
  getTransakHeadlessConnectionWallet,
  getTransakHeadlessFallbackReason,
  getTransakHeadlessRedirectResult,
  getTransakHeadlessRedirectUrls,
  getTransakHeadlessUnsupportedTermsIds,
  getTransakLegalUrls,
  isSameTransakHeadlessQuoteForCustomer,
  isSameTransakHeadlessTermsIds,
  isTransakHeadlessConnectionEnabled,
  isTransakHeadlessKycEnabled,
  isTransakHeadlessPaidStatus,
  isTransakHeadlessPaymentMethodEnabled,
} from './transak-utils';
import {BuyCryptoConfig} from '../../../../store/external-services/external-services.types';
import {Key, Wallet} from '../../../../store/wallet/wallet.models';

const headlessConfig: BuyCryptoConfig = {
  transak: {config: {headlessBuyDisabled: false}},
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
        {transak: {config: {headlessBuyDisabled: true}}},
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
        {transak: {config: {headlessBuyDisabled: true}}},
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

describe('isTransakHeadlessConnectionEnabled', () => {
  it('is enabled when a headless payment method can be used', () => {
    expect(isTransakHeadlessConnectionEnabled(headlessConfig, 'US')).toBe(true);
    expect(
      isTransakHeadlessConnectionEnabled(
        {
          transak: {
            config: {
              paymentMethods: {
                cardEmbedded: {disabled: true},
                applePayEmbedded: {disabled: true},
              },
            },
          },
        },
        'US',
        {googlePaySupported: true},
      ),
    ).toBe(true);
  });

  it('is disabled when Transak or its headless flow is turned off', () => {
    expect(
      isTransakHeadlessConnectionEnabled(
        {transak: {config: {headlessBuyDisabled: true}}},
        'US',
      ),
    ).toBe(false);
    expect(
      isTransakHeadlessConnectionEnabled({transak: {disabled: true}}, 'US'),
    ).toBe(false);
    expect(
      isTransakHeadlessConnectionEnabled({transak: {removed: true}}, 'US'),
    ).toBe(false);
    expect(isTransakHeadlessConnectionEnabled({disabled: true}, 'US')).toBe(
      false,
    );
  });

  it('is disabled in the UK', () => {
    expect(isTransakHeadlessConnectionEnabled(headlessConfig, 'GB')).toBe(
      false,
    );
  });

  it('is disabled when no headless payment method can be used', () => {
    expect(
      isTransakHeadlessConnectionEnabled(
        {
          transak: {
            config: {
              paymentMethods: {
                cardEmbedded: {disabled: true},
              },
            },
          },
        },
        'US',
      ),
    ).toBe(false);
  });
});

describe('getTransakHeadlessConnectionWallet', () => {
  const makeWallet = (id: string, complete = true): Wallet =>
    ({
      id,
      credentials: {},
      isComplete: () => complete,
    } as unknown as Wallet);
  const makeKey = (wallets: Wallet[], backupComplete = true): Key =>
    ({wallets, backupComplete} as unknown as Key);

  it('returns the first complete wallet of a backed up key', () => {
    expect(
      getTransakHeadlessConnectionWallet({
        key1: makeKey([makeWallet('notBackedUp')], false),
        key2: makeKey([makeWallet('incomplete', false), makeWallet('ready')]),
      })?.id,
    ).toBe('ready');
  });

  it('returns nothing without a usable wallet', () => {
    expect(getTransakHeadlessConnectionWallet({})).toBeUndefined();
    expect(
      getTransakHeadlessConnectionWallet({
        key1: makeKey([makeWallet('notBackedUp')], false),
        key2: makeKey([makeWallet('incomplete', false)]),
      }),
    ).toBeUndefined();
  });
});

describe('getTransakHeadlessFallbackReason', () => {
  it('drops order IDs and Transak error messages', () => {
    expect(getTransakHeadlessFallbackReason('active order: abc-123')).toBe(
      'active order',
    );
    expect(
      getTransakHeadlessFallbackReason('400/6003: Feature is not enabled'),
    ).toBe('transak error 400/6003');
    expect(getTransakHeadlessFallbackReason('-/-: Something went wrong')).toBe(
      'transak error -/-',
    );
    expect(getTransakHeadlessFallbackReason('request: Network Error')).toBe(
      'request error',
    );
  });

  it('keeps the reasons that have no variable data', () => {
    for (const reason of [
      'kyc: SUBMITTED (STANDARD)',
      'limits: exceeded',
      'terms: NEW_DISCLAIMER',
      'sign-in skipped',
      'session rejected',
      'apple_pay form error',
    ]) {
      expect(getTransakHeadlessFallbackReason(reason)).toBe(reason);
    }
  });
});

describe('getTransakLegalUrls', () => {
  it('uses the US terms for US users', () => {
    expect(getTransakLegalUrls('US')).toEqual({
      termsUrl: 'https://transak.com/terms-of-service-us',
      privacyUrl: 'https://transak.com/privacy-policy',
    });
  });

  it('uses the EU terms for EU and other EEA users', () => {
    const euUrls = {
      termsUrl: 'https://transak.com/eu/terms-of-service-eu',
      privacyUrl: 'https://transak.com/eu/privacy-policy-eu',
    };
    expect(getTransakLegalUrls('DE')).toEqual(euUrls);
    expect(getTransakLegalUrls('es')).toEqual(euUrls);
    expect(getTransakLegalUrls('NO')).toEqual(euUrls);
    expect(getTransakLegalUrls('IS')).toEqual(euUrls);
    expect(getTransakLegalUrls('LI')).toEqual(euUrls);
  });

  it('uses the global terms for everyone else', () => {
    const globalUrls = {
      termsUrl: 'https://transak.com/terms-of-service',
      privacyUrl: 'https://transak.com/privacy-policy',
    };
    expect(getTransakLegalUrls('GB')).toEqual(globalUrls);
    expect(getTransakLegalUrls('CH')).toEqual(globalUrls);
    expect(getTransakLegalUrls(undefined)).toEqual(globalUrls);
  });
});

describe('isTransakHeadlessPaidStatus', () => {
  it('is paid once Transak moved the order past the payment', () => {
    expect(isTransakHeadlessPaidStatus('PAYMENT_DONE_MARKED_BY_USER')).toBe(
      true,
    );
    expect(isTransakHeadlessPaidStatus('PROCESSING')).toBe(true);
    expect(isTransakHeadlessPaidStatus('PENDING_DELIVERY_FROM_TRANSAK')).toBe(
      true,
    );
    expect(
      isTransakHeadlessPaidStatus('ON_HOLD_PENDING_DELIVERY_FROM_TRANSAK'),
    ).toBe(true);
    expect(isTransakHeadlessPaidStatus('COMPLETED')).toBe(true);
  });

  it('is not paid while awaiting payment, failed, unknown or missing', () => {
    expect(isTransakHeadlessPaidStatus('AWAITING_PAYMENT_FROM_USER')).toBe(
      false,
    );
    expect(isTransakHeadlessPaidStatus('FAILED')).toBe(false);
    expect(isTransakHeadlessPaidStatus('CANCELLED')).toBe(false);
    expect(isTransakHeadlessPaidStatus('pending')).toBe(false);
    expect(isTransakHeadlessPaidStatus('paymentRequestSent')).toBe(false);
    expect(isTransakHeadlessPaidStatus('ORDER_CREATED' as any)).toBe(false);
    expect(isTransakHeadlessPaidStatus(undefined)).toBe(false);
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
