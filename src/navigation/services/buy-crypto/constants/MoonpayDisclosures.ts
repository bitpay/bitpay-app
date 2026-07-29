// MoonPay's embedded Buy Quote returns paymentDisclosures as {id, version} only

import {
  MoonpayPaymentDisclosure,
  MoonpayPaymentDisclosureId,
} from '../../../../store/buy-crypto/buy-crypto.models';

export interface MoonpayDisclosureCopy {
  text: string;
  url?: string;
  isFallback: boolean;
}

const DISCLOSURE_COPY: Record<
  MoonpayPaymentDisclosureId,
  Omit<MoonpayDisclosureCopy, 'isFallback'>
> = {
  'us-transaction-finality': {
    text: '[TODO] us-transaction-finality',
  },
  'eea-crypto-asset-risk': {
    text: '[TODO] eea-crypto-asset-risk',
  },
  'eea-unregulated-stablecoin-risk': {
    text: '[TODO] eea-unregulated-stablecoin-risk',
  },
  'gateway-token': {
    text: 'Your payment will be processed by MoonPay. By continuing you authorise MoonPay to process this transaction.',
  },
};

const CONSERVATIVE_DISCLOSURE =
  'By continuing, you acknowledge the terms and risks associated with this transaction as provided by MoonPay.';

export const getMoonpayDisclosureCopy = (
  disclosure: MoonpayPaymentDisclosure,
): MoonpayDisclosureCopy => {
  const copy = DISCLOSURE_COPY[disclosure.id];
  if (!copy) {
    return {text: CONSERVATIVE_DISCLOSURE, isFallback: true};
  }
  return {...copy, isFallback: false};
};
