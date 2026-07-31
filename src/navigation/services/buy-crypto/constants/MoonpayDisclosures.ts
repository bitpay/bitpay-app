// MoonPay's embedded Buy Quote returns paymentDisclosures as {id, version} only.
// Each disclosure maps to an array of segments (plain text or tappable link)
// so the UI can render them inline with individually pressable links.
// Verbatim copy sourced from: https://dev.moonpay.com/platform/overview/going-live

import {
  MoonpayPaymentDisclosure,
  MoonpayPaymentDisclosureId,
} from '../../../../store/buy-crypto/buy-crypto.models';

/** A plain-text run within a disclosure. */
export type DisclosureTextSegment = {type: 'text'; value: string};

/** A tappable link run within a disclosure. */
export type DisclosureLinkSegment = {type: 'link'; label: string; url: string};

export type DisclosureSegment = DisclosureTextSegment | DisclosureLinkSegment;

export interface MoonpayDisclosureCopy {
  segments: DisclosureSegment[];
  isFallback: boolean;
}

export const MOONPAY_TERMS_URL = 'https://www.moonpay.com/legal/terms';
export const MOONPAY_PRIVACY_URL =
  'https://www.moonpay.com/legal/privacy_policy';
export const MOONPAY_LEGAL_URL = 'https://www.moonpay.com/legal';
export const MOONPAY_WHITEPAPER_URL =
  'https://dev.moonpay.com/docs/list-of-supported-cryptocurrencies';

const DISCLOSURE_COPY: Record<MoonpayPaymentDisclosureId, DisclosureSegment[]> =
  {
    // Shown to customers in US states that require transaction-finality notice (NY, WA).
    'us-transaction-finality': [
      {type: 'text', value: "I agree to MoonPay's "},
      {type: 'link', label: 'Terms of Use', url: MOONPAY_TERMS_URL},
      {
        type: 'text',
        value:
          ' and understand that, once executed, this transaction cannot be cancelled, recalled, refunded, or otherwise undone. Fraudulent transactions may result in the loss of funds with no recourse.',
      },
    ],

    // Shown to EEA customers buying a MiCA-compliant crypto asset.
    'eea-crypto-asset-risk': [
      {
        type: 'text',
        value:
          'By continuing, you agree to transact with MoonPay Europe, subject to its ',
      },
      {type: 'link', label: 'Terms of Use', url: MOONPAY_TERMS_URL},
      {type: 'text', value: ' and '},
      {type: 'link', label: 'Privacy Policy', url: MOONPAY_PRIVACY_URL},
      {
        type: 'text',
        value:
          '. Crypto-assets can be risky and values may decrease quickly. Transfers are irreversible once broadcast to the blockchain. The quoted exchange rate may include a spread. ',
      },
      {type: 'link', label: 'Learn more', url: MOONPAY_LEGAL_URL},
      {type: 'text', value: ' and '},
      {
        type: 'link',
        label: 'review the whitepaper',
        url: MOONPAY_WHITEPAPER_URL,
      },
      {type: 'text', value: ' (if available).'},
    ],

    // Shown to EEA customers buying a stablecoin that is NOT MiCA-compliant (e.g. USDT, DAI, PYUSD).
    'eea-unregulated-stablecoin-risk': [
      {
        type: 'text',
        value:
          'Important: You are about to transact in a stablecoin that is not MiCA-compliant, carries fewer safeguards, and may be difficult to sell. By continuing, you agree to transact with MoonPay Europe subject to its ',
      },
      {type: 'link', label: 'Terms of Use', url: MOONPAY_TERMS_URL},
      {type: 'text', value: ' and '},
      {type: 'link', label: 'Privacy Policy', url: MOONPAY_PRIVACY_URL},
      {
        type: 'text',
        value:
          '. Transfers are irreversible once broadcast to the blockchain. The quoted exchange rate may include a spread. ',
      },
      {type: 'link', label: 'Learn more', url: MOONPAY_LEGAL_URL},
      {type: 'text', value: ' and '},
      {
        type: 'link',
        label: 'review the whitepaper',
        url: MOONPAY_WHITEPAPER_URL,
      },
      {type: 'text', value: ' (if available).'},
    ],

    // Shown when the customer buys a DeFi token via Gateway (USA, excluding NY and WA).
    // Gateway purchases are two-step: buy stablecoin from MoonPay, then swap on a DEX.
    'gateway-token': [
      {type: 'text', value: 'By proceeding, you agree to two steps under '},
      {type: 'link', label: 'these terms', url: MOONPAY_TERMS_URL},
      {
        type: 'text',
        value:
          ': (1) Buying stablecoin from MoonPay and (2) Swapping stablecoin for your chosen destination asset via a decentralised exchange.',
      },
    ],
  };

// Fallback used when an unknown disclosure id is received.
// Per MoonPay spec, partners should render a conservative message and alert their team.
// Links point to the canonical MoonPay documents as required by the terms-acceptance guide:
// https://dev.moonpay.com/platform/guides/terms-acceptance
const CONSERVATIVE_DISCLOSURE_SEGMENTS: DisclosureSegment[] = [
  {
    type: 'text',
    value: 'By continuing, you agree to transact with MoonPay subject to its ',
  },
  {type: 'link', label: 'Terms of Use', url: MOONPAY_TERMS_URL},
  {type: 'text', value: ' and '},
  {type: 'link', label: 'Privacy Policy', url: MOONPAY_PRIVACY_URL},
  {type: 'text', value: '.'},
];

export const getMoonpayDisclosureCopy = (
  disclosure: MoonpayPaymentDisclosure,
): MoonpayDisclosureCopy => {
  const segments = DISCLOSURE_COPY[disclosure.id];
  if (!segments) {
    return {segments: CONSERVATIVE_DISCLOSURE_SEGMENTS, isFallback: true};
  }
  return {segments, isFallback: false};
};

// Geo-specific disclosure ids that, when present in the API response, already
// satisfy the legal requirement — no supplemental LegalText block is needed.
const GEO_DISCLOSURE_IDS: MoonpayPaymentDisclosureId[] = [
  'us-transaction-finality',
  'eea-crypto-asset-risk',
  'eea-unregulated-stablecoin-risk',
];

/**
 * Returns the segments for the supplemental LegalText block rendered below the
 * payment frame. Returns null when the API response already contains a
 * geo-specific disclosure that covers the requirement.
 *
 * Priority:
 * 1. Any of the geo-specific ids is present in the API response → null.
 * 2. isNYorWA is true → us-transaction-finality copy (verbatim fallback).
 * 3. Otherwise → generic Terms of Use / Privacy Policy notice.
 */
export const getMoonpayDefaultDisclosure = (
  disclosures: MoonpayPaymentDisclosure[] | undefined | null,
  isNYorWA: boolean,
): DisclosureSegment[] | null => {
  const hasGeoDisclosure = disclosures?.some(d =>
    (GEO_DISCLOSURE_IDS as string[]).includes(d.id),
  );
  if (hasGeoDisclosure) {
    return null;
  }
  if (isNYorWA) {
    return DISCLOSURE_COPY['us-transaction-finality'];
  }
  return CONSERVATIVE_DISCLOSURE_SEGMENTS;
};
