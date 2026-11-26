import {TransakHeadlessPaymentMethod} from '../../../store/buy-crypto/buy-crypto.models';
import {
  getTransakHeadlessDisclaimerParagraphs,
  TransakHeadlessDisclaimerSegment,
} from './TransakHeadlessDisclaimers';

const toText = (paragraphs: TransakHeadlessDisclaimerSegment[][]): string[] =>
  paragraphs.map(paragraph =>
    paragraph
      .map(segment => (typeof segment === 'string' ? segment : segment.text))
      .join(''),
  );

const toLinks = (
  paragraphs: TransakHeadlessDisclaimerSegment[][],
): [string, string][] =>
  paragraphs.flatMap(paragraph =>
    paragraph.flatMap(segment =>
      typeof segment === 'string'
        ? []
        : [[segment.text, segment.url] as [string, string]],
    ),
  );

const TRANSAK_LINKS: [string, string][] = [
  ['Terms of Service', 'https://transak.com/terms-of-service-us'],
  ['Regulatory Disclosures', 'https://transak.com/compliance'],
  ['Privacy Policy', 'https://transak.com/privacy-policy'],
  ['US Privacy Notice', 'https://transak.com/privacy-notice-us'],
];

const COINME_LINKS: [string, string][] = [
  [
    'licensed money transmitter',
    'https://help.coinme.com/en/articles/9039706-licensing',
  ],
  [
    'Terms of Service',
    'https://help.coinme.com/en/articles/9039676-terms-of-service',
  ],
  [
    'Privacy Policy',
    'https://help.coinme.com/en/articles/9039704-privacy-policy',
  ],
  ['Disclosures', 'https://help.coinme.com/en/articles/10535881-disclosures'],
  ['Terms of Service', 'https://transak.com/terms-of-service-us'],
  ['Privacy Policy', 'https://transak.com/privacy-policy'],
  ['US Privacy Notice', 'https://transak.com/privacy-notice-us'],
];

const AGREEMENT_ACTIONS: [TransakHeadlessPaymentMethod, string][] = [
  ['credit_debit_card', 'By clicking “Agree and Confirm Order,”'],
  ['apple_pay', 'By clicking on the Apple Pay button,'],
  ['google_pay', 'By clicking on the Google Pay button,'],
];

const PAYMENT_METHODS = AGREEMENT_ACTIONS.map(([method]) => method);

describe('getTransakHeadlessDisclaimerParagraphs', () => {
  it.each(AGREEMENT_ACTIONS)(
    'shows the Transak terms of service for %s',
    (paymentMethod, action) => {
      const paragraphs = getTransakHeadlessDisclaimerParagraphs(
        'TRANSAK_TERMS_OF_SERVICE',
        paymentMethod,
      );
      expect(toText(paragraphs)).toEqual([
        `${action} I confirm I have read, understand, and agree to Transak’s Terms of Service, Regulatory Disclosures, Privacy Policy, and US Privacy Notice.`,
      ]);
      expect(toLinks(paragraphs)).toEqual(TRANSAK_LINKS);
    },
  );

  it.each(AGREEMENT_ACTIONS)(
    'shows the Coinme user agreement for %s',
    (paymentMethod, action) => {
      const paragraphs = getTransakHeadlessDisclaimerParagraphs(
        'COINME_USER_AGREEMENT',
        paymentMethod,
      );
      expect(toText(paragraphs)).toEqual([
        'Your transactions are executed by Coinme Inc. a licensed money transmitter.',
        `${action} I confirm I have read, understand, and agree to Coinme’s Terms of Service, Privacy Policy, and Disclosures, and to Transak’s Terms of Service, Privacy Policy, and US Privacy Notice.`,
      ]);
      expect(toLinks(paragraphs)).toEqual(COINME_LINKS);
    },
  );

  it.each(PAYMENT_METHODS)(
    'shows the same returning US user text for %s',
    paymentMethod => {
      expect(
        toText(
          getTransakHeadlessDisclaimerParagraphs(
            'US_TERMS_RETURNING',
            paymentMethod,
          ),
        ),
      ).toEqual([
        'You cannot cancel or reverse this order once confirmed. Check the destination address; funds sent to a wrong address cannot be recovered.',
      ]);
    },
  );

  it.each(PAYMENT_METHODS)(
    'shows the same Zero Hash user agreement for %s',
    paymentMethod => {
      const paragraphs = getTransakHeadlessDisclaimerParagraphs(
        'ZEROHASH_USER_AGREEMENT',
        paymentMethod,
      );
      expect(toText(paragraphs)).toEqual([
        'I have read, understand, and agree to the: (1) zerohash and zerohash Liquidity Services User Agreement; (2) zerohash Regulatory Disclosures; and (3) zerohash Privacy Notice.',
        'I further consent to zerohash sharing my data or information with Transak. The data or information shared may include, without limitation, the personal information I provide to zerohash during the application and onboarding process. I understand that I may review how zerohash utilizes or shares my data in the Privacy Notice referenced above, and that I may contact zerohash at privacy@zerohash.com if I have any questions or wish to amend my consent.',
        'I also understand that the value of any cryptocurrency, including digital assets pegged to fiat currency, commodities, or any other asset, are not guaranteed and may go to zero at any time and without warning. Orders may not be canceled or reversed once submitted by you. If a withdrawal request is being made, you are requesting an on-chain transaction that is not reversible or recallable. You are responsible for reviewing the recipient address and ensuring it is the correct address for the selected asset for withdrawal. The estimated network fee is an approximation and the actual network fee applied on a withdrawal may differ. Fraudulent transactions may result in the loss of money with no recourse.',
      ]);
      expect(toLinks(paragraphs)).toEqual([
        [
          'zerohash and zerohash Liquidity Services User Agreement',
          'https://www.zerohash.com/transak',
        ],
        [
          'zerohash Regulatory Disclosures',
          'https://docs.zerohash.com/page/us-licenses-and-disclosures',
        ],
        [
          'zerohash Privacy Notice',
          'https://docs.zerohash.com/page/privacy-policy',
        ],
        ['privacy@zerohash.com', 'mailto:privacy@zerohash.com'],
      ]);
    },
  );

  it('shows the MiCA buy and sell disclaimers', () => {
    expect(
      toText(
        getTransakHeadlessDisclaimerParagraphs('MICA_EEA_BUY', 'apple_pay'),
      ),
    ).toEqual([
      'The exchange rate is an estimate and may change. You may receive more or less crypto. Your order and exchange rate become final when we receive your payment.',
    ]);
    expect(
      toText(
        getTransakHeadlessDisclaimerParagraphs(
          'MICA_EEA_SELL',
          'credit_debit_card',
        ),
      ),
    ).toEqual([
      'The exchange rate is an estimate and may change. You may receive more or less money. Your order and exchange rate become final when we receive your crypto.',
    ]);
  });

  it('shows the UK investment risk warning', () => {
    const paragraphs = getTransakHeadlessDisclaimerParagraphs(
      'GB_INVESTMENT_RISK_WARNING',
      'google_pay',
    );
    expect(toText(paragraphs)).toEqual([
      'Don’t invest unless you’re prepared to lose all the money you invest. This is a high-risk investment and you should not expect to be protected if something goes wrong.',
      'Take 2 mins to learn more',
    ]);
    expect(toLinks(paragraphs)).toEqual([
      ['Take 2 mins to learn more', 'https://transak.com/crypto-risk-summary'],
    ]);
  });

  it('shows nothing for an unknown terms ID', () => {
    expect(
      getTransakHeadlessDisclaimerParagraphs('NEW_DISCLAIMER', 'apple_pay'),
    ).toEqual([]);
  });
});
