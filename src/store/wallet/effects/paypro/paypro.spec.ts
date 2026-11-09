import configureTestStore from '@test/store';
import {BwcProvider} from '../../../../lib/bwc';
import {Network} from '../../../../constants';
import {BASE_BITPAY_URLS} from '../../../../constants/config';
import {GetPayProDetails, GetPayProOptions} from './paypro';

// The real BWC PayProV2 class, so the trusted domains come from BWC itself.
const PayProV2 = BwcProvider.getInstance().getPayProV2();

const REJECTED_URLS = [
  'http://bitpay.com/i/abc',
  'https://evil.com/i/abc',
  'https://www.bitpay.com/i/abc',
  'https://pay.bitpay.com/i/abc',
  'https://evilbitpay.com/i/abc',
  'https://bitpay.com.evil.com/i/abc',
  // parser differential: the RN polyfill sees bitpay.com, BWC sees evil.com
  'https://bitpay.com\\@evil.com/i/abc',
  'https://bitpay.com@evil.com/i/abc',
  'https://evil.com@bitpay.com/i/abc',
  'https://bitpay.com\t.evil.com/i/abc',
  'bitcoin:?r=https://evil.com/i/abc',
  'not a url',
  '',
];

const ACCEPTED_URLS = [
  'https://bitpay.com/i/abc',
  'https://test.bitpay.com/i/abc',
  'https://staging.bitpay.com/i/abc',
  'https://BitPay.com/i/abc',
];

describe('PayPro host check', () => {
  let getPaymentOptions: jest.SpyInstance;
  let selectPaymentOption: jest.SpyInstance;

  beforeEach(() => {
    getPaymentOptions = jest
      .spyOn(PayProV2, 'getPaymentOptions')
      .mockResolvedValue({paymentOptions: []} as any);
    selectPaymentOption = jest
      .spyOn(PayProV2, 'selectPaymentOption')
      .mockResolvedValue({instructions: []} as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getDetails = (paymentUrl: string) =>
    GetPayProDetails({paymentUrl, coin: 'btc', chain: 'btc'});

  describe('GetPayProOptions', () => {
    it.each(REJECTED_URLS)('does not contact %j', async url => {
      const store = configureTestStore({});
      await expect(store.dispatch(GetPayProOptions(url))).rejects.toThrow(
        'This payment request does not come from BitPay',
      );
      expect(getPaymentOptions).not.toHaveBeenCalled();
    });

    it.each(ACCEPTED_URLS)('contacts %s', async url => {
      const store = configureTestStore({});
      await store.dispatch(GetPayProOptions(url));
      expect(getPaymentOptions).toHaveBeenCalledWith({paymentUrl: url});
    });
  });

  describe('GetPayProDetails', () => {
    it.each(REJECTED_URLS)('does not contact %j', async url => {
      const store = configureTestStore({});
      await expect(store.dispatch(getDetails(url))).rejects.toThrow(
        'This payment request does not come from BitPay',
      );
      expect(selectPaymentOption).not.toHaveBeenCalled();
    });

    it.each(ACCEPTED_URLS)('contacts %s', async url => {
      const store = configureTestStore({});
      await store.dispatch(getDetails(url));
      expect(selectPaymentOption).toHaveBeenCalledWith(
        expect.objectContaining({paymentUrl: url}),
      );
    });
  });

  it('accepts a domain added to the trusted keys', async () => {
    const originalKeys = PayProV2.trustedKeys;
    PayProV2.trustedKeys = {
      ...originalKeys,
      regtestKey: {domains: ['bitpay.regtest']},
    } as any;
    try {
      const store = configureTestStore({});
      await store.dispatch(GetPayProOptions('https://bitpay.regtest/i/abc'));
      expect(getPaymentOptions).toHaveBeenCalledTimes(1);
    } finally {
      PayProV2.trustedKeys = originalKeys;
    }
  });

  describe('regtest BitPay over http', () => {
    const originalKeys = PayProV2.trustedKeys;
    const originalBase = BASE_BITPAY_URLS[Network.regtest];

    beforeEach(() => {
      PayProV2.trustedKeys = {
        ...originalKeys,
        regtestKey: {domains: ['localhost']},
      } as any;
      BASE_BITPAY_URLS[Network.regtest] = 'http://localhost:8088';
    });

    afterEach(() => {
      PayProV2.trustedKeys = originalKeys;
      BASE_BITPAY_URLS[Network.regtest] = originalBase;
    });

    it('accepts http on the configured regtest host', async () => {
      const store = configureTestStore({});
      await store.dispatch(GetPayProOptions('http://localhost:8088/i/abc'));
      expect(getPaymentOptions).toHaveBeenCalledTimes(1);
    });

    it('still rejects http on any other trusted host', async () => {
      const store = configureTestStore({});
      await expect(
        store.dispatch(GetPayProOptions('http://bitpay.com/i/abc')),
      ).rejects.toThrow('This payment request does not come from BitPay');
      expect(getPaymentOptions).not.toHaveBeenCalled();
    });
  });
});
