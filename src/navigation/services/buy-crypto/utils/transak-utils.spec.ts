import {
  getTransakHeadlessConfirmButtonKind,
  getTransakHeadlessRedirectResult,
  getTransakHeadlessRedirectUrls,
  getTransakHeadlessUnsupportedTermsIds,
  isSameTransakHeadlessTermsIds,
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
      isTransakHeadlessPaymentMethodEnabled('applePay', headlessConfig, 'US'),
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
