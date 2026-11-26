import {Wallet} from '../../../wallet/wallet.models';
import {
  TransakEnv,
  TransakHeadlessGetQuoteRequestData,
  TransakHeadlessKycRequirementData,
  TransakHeadlessOrderData,
  TransakHeadlessPaymentMethod,
  TransakHeadlessQuoteData,
  TransakHeadlessSavedCard,
  TransakHeadlessSendOtpData,
  TransakHeadlessTransactionSessionData,
  TransakHeadlessUserLimitsData,
  TransakHeadlessVerifyOtpData,
  TransakStatusKey,
} from '../../buy-crypto.models';
import {getTransakHeadlessUnsupportedTermsIds} from '../../../../navigation/services/buy-crypto/utils/transak-utils';

// Transak's Whitelabel API answers errors with a body instead of a failed
// request, and BWS passes it through, so it is turned into an error here.
export class TransakHeadlessError extends Error {
  statusCode?: number;
  errorCode?: number;

  constructor(message: string, statusCode?: number, errorCode?: number) {
    super(message);
    this.name = 'TransakHeadlessError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

// Documented error codes the app reacts to.
export const TRANSAK_HEADLESS_ERROR_CODES = {
  INVALID_AUTH_TOKEN: 1002,
  USER_NOT_ONBOARDED: 1023,
  ACCOUNT_DISABLED: 2030,
  KYC_UPGRADE_REQUIRED: 4003,
  FCA_CRITERIA_NOT_MET: 4016,
  KYC_NOT_APPROVED: 6002,
  FEATURE_NOT_ENABLED: 6003,
  KYC_NOT_APPROVED_FOR_TRANSACTION: 6012,
  LOCATION_DATA_REQUIRED: 6014,
};

export class TransakHeadlessUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'TransakHeadlessUnavailableError';
  }
}

export const TRANSAK_HEADLESS_CANCEL_REASON = 'cancel';

export const isTransakHeadlessUnauthorized = (err: unknown): boolean =>
  err instanceof TransakHeadlessError &&
  (err.statusCode === 401 ||
    err.errorCode === TRANSAK_HEADLESS_ERROR_CODES.INVALID_AUTH_TOKEN);

const unwrap = <T>(response: any): T => {
  const body = response?.body ?? response;
  const error =
    body?.error && typeof body.error === 'object'
      ? body.error
      : typeof body?.statusCode === 'number' && body.statusCode >= 400
      ? body
      : undefined;
  if (error) {
    throw new TransakHeadlessError(
      typeof error.message === 'string' ? error.message : 'Unknown error',
      error.statusCode,
      error.errorCode,
    );
  }
  return (body?.data ?? body?.response ?? body) as T;
};

export const transakHeadlessSendOtp = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; email: string},
): Promise<TransakHeadlessSendOtpData> =>
  unwrap(await wallet.transakHeadlessSendOtp(requestData));

export const transakHeadlessVerifyOtp = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    email: string;
    otp: string;
    stateToken: string;
  },
): Promise<TransakHeadlessVerifyOtpData> =>
  unwrap(await wallet.transakHeadlessVerifyOtp(requestData));

export const transakHeadlessGetQuote = async (
  wallet: Wallet,
  requestData: TransakHeadlessGetQuoteRequestData & {userAccessToken: string},
): Promise<TransakHeadlessQuoteData> =>
  unwrap(await wallet.transakHeadlessGetQuote(requestData));

export const transakHeadlessGetKycRequirement = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; userAccessToken: string; quoteId: string},
): Promise<TransakHeadlessKycRequirementData> =>
  unwrap(await wallet.transakHeadlessGetKycRequirement(requestData));

export const transakHeadlessGetUserLimits = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    userAccessToken: string;
    kycType: string;
    fiatCurrency: string;
    paymentCategory: TransakHeadlessPaymentMethod;
  },
): Promise<TransakHeadlessUserLimitsData> =>
  unwrap(await wallet.transakHeadlessGetUserLimits(requestData));

export const transakHeadlessGetActiveOrders = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; userAccessToken: string},
): Promise<TransakHeadlessOrderData[]> => {
  const orders = unwrap<TransakHeadlessOrderData[]>(
    await wallet.transakHeadlessGetActiveOrders(requestData),
  );
  return Array.isArray(orders) ? orders : [];
};

export const transakHeadlessCancelOrder = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    userAccessToken: string;
    orderId: string;
    cancelReason: string;
  },
): Promise<TransakHeadlessOrderData> =>
  unwrap(await wallet.transakHeadlessCancelOrder(requestData));

export const transakHeadlessGetSavedCards = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; userAccessToken: string},
): Promise<TransakHeadlessSavedCard[]> => {
  const data = unwrap<{
    paymentInstruments?: {
      credit_debit_card?: {cards?: TransakHeadlessSavedCard[]};
    };
  }>(await wallet.transakHeadlessGetSavedCards(requestData));
  return data?.paymentInstruments?.credit_debit_card?.cards ?? [];
};

// Cards and Google Pay need the redirect URLs for 3DS; Apple Pay takes none.
export const transakHeadlessCreateTransactionSession = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    userAccessToken: string;
    quoteId: string;
    walletAddress: string;
    successUrl?: string;
    failureUrl?: string;
    config?: {
      colorMode?: 'DARK' | 'LIGHT';
      colors?: {[key: string]: string};
      borderRadius?: string;
      height?: string;
    };
  },
): Promise<TransakHeadlessTransactionSessionData> =>
  unwrap(await wallet.transakHeadlessCreateTransactionSession(requestData));

export const transakHeadlessCreateKycSession = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    userAccessToken: string;
    quoteId: string;
    config?: {
      colorMode?: 'DARK' | 'LIGHT';
      colors?: {[key: string]: string};
    };
  },
): Promise<TransakHeadlessTransactionSessionData> =>
  unwrap(await wallet.transakHeadlessCreateKycSession(requestData));

export const transakHeadlessCreateOrder = async (
  wallet: Wallet,
  requestData:
    | {env: TransakEnv; userAccessToken: string; requestId: string}
    | {
        env: TransakEnv;
        userAccessToken: string;
        quoteId: string;
        walletAddress: string;
        paymentIdentifierId: string;
        successUrl: string;
        failureUrl: string;
      },
): Promise<TransakHeadlessOrderData> =>
  unwrap(await wallet.transakHeadlessCreateOrder(requestData));

export const transakHeadlessGetOrderDetails = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; userAccessToken: string; orderId: string},
): Promise<TransakHeadlessOrderData> =>
  unwrap(await wallet.transakHeadlessGetOrderDetails(requestData));

export const getTransakHeadlessKycStatus = (
  kyc: TransakHeadlessKycRequirementData | undefined,
): string | undefined => kyc?.kyc?.status ?? kyc?.status;

export const getTransakHeadlessKycType = (
  kyc: TransakHeadlessKycRequirementData | undefined,
): string | undefined => kyc?.kyc?.type ?? kyc?.kycType;

export const isTransakHeadlessOverLimit = (
  limits: TransakHeadlessUserLimitsData | undefined,
  fiatAmount: number,
): boolean =>
  Object.values(limits?.exceeded ?? {}).some(exceeded => exceeded) ||
  Object.values(limits?.remaining ?? {}).some(
    remaining => typeof remaining === 'number' && remaining < fiatAmount,
  );

export const isTransakHeadlessKycApproved = (
  kyc: TransakHeadlessKycRequirementData | undefined,
): boolean =>
  getTransakHeadlessKycStatus(kyc) === 'APPROVED' &&
  kyc?.isAllowedToPlaceOrder !== false;

// Forms still to be filled in, which the TransakKyc component can collect.
// Any other status (in review, rejected...) is left to the widget.
const TRANSAK_HEADLESS_KYC_FORM_STATUSES: (string | undefined)[] = [
  'NOT_SUBMITTED',
  'ADDITIONAL_FORMS_REQUIRED',
];

const getTransakHeadlessKycUnavailableReason = (
  kyc: TransakHeadlessKycRequirementData | undefined,
): string =>
  `kyc: ${getTransakHeadlessKycStatus(kyc) ?? 'unknown'} (${
    getTransakHeadlessKycType(kyc) ?? '-'
  })`;

// The KYC requirement is always read with a new quote: Transak asks for one
// per check, and a quote only lasts about a minute.
export const transakHeadlessGetQuoteAndKyc = async (
  wallet: Wallet,
  quoteRequestData: TransakHeadlessGetQuoteRequestData,
  userAccessToken: string,
): Promise<{
  quote: TransakHeadlessQuoteData;
  kyc: TransakHeadlessKycRequirementData;
}> => {
  const quote = await transakHeadlessGetQuote(wallet, {
    ...quoteRequestData,
    userAccessToken,
  });
  if (!quote?.quoteId) {
    throw new TransakHeadlessUnavailableError('quote: no quoteId');
  }

  const unsupportedTermsIds = getTransakHeadlessUnsupportedTermsIds(
    quote.termsIds,
  );
  if (unsupportedTermsIds.length) {
    throw new TransakHeadlessUnavailableError(
      `terms: ${unsupportedTermsIds.join(', ')}`,
    );
  }

  const kyc = await transakHeadlessGetKycRequirement(wallet, {
    env: quoteRequestData.env,
    userAccessToken,
    quoteId: quote.quoteId,
  });
  return {quote, kyc};
};

export const transakHeadlessGetOrderQuote = async (
  wallet: Wallet,
  quoteRequestData: TransakHeadlessGetQuoteRequestData,
  userAccessToken: string,
): Promise<{
  quote: TransakHeadlessQuoteData;
  kyc: TransakHeadlessKycRequirementData;
}> => {
  const {quote, kyc} = await transakHeadlessGetQuoteAndKyc(
    wallet,
    quoteRequestData,
    userAccessToken,
  );
  if (!isTransakHeadlessKycApproved(kyc)) {
    throw new TransakHeadlessUnavailableError(
      getTransakHeadlessKycUnavailableReason(kyc),
    );
  }
  return {quote, kyc};
};

export type TransakHeadlessPreparation =
  | {
      status: 'ready';
      quote: TransakHeadlessQuoteData;
      quoteFetchedAt: number;
      savedCards: TransakHeadlessSavedCard[];
    }
  // The customer has KYC forms to fill in: the TransakKyc component is shown
  // with this session before the checkout.
  | {status: 'kyc'; sessionId: string}
  // The stored session was rejected: it has to be discarded.
  | {status: 'unauthorized'}
  // Headless cannot run this purchase (KYC, limits, feature...): the widget
  // has to be used instead.
  | {status: 'unavailable'; reason: string};

// Everything needed to decide headless vs widget before showing any screen,
// so falling back never interrupts a checkout the customer already started.
export const prepareTransakHeadlessCheckout = async (
  wallet: Wallet,
  quoteRequestData: TransakHeadlessGetQuoteRequestData,
  userAccessToken: string,
  opts: {
    ownOrderIds?: string[];
    onOwnOrderCancelled?: (orderId: string, status: TransakStatusKey) => void;
    // Without it, a KYC that is not approved goes to the widget.
    kycSession?: {colorMode: 'DARK' | 'LIGHT'};
  } = {},
): Promise<TransakHeadlessPreparation> => {
  const env = quoteRequestData.env;
  try {
    const {quote, kyc} = await transakHeadlessGetQuoteAndKyc(
      wallet,
      quoteRequestData,
      userAccessToken,
    );
    const quoteFetchedAt = Date.now();

    if (!isTransakHeadlessKycApproved(kyc)) {
      if (
        !opts.kycSession ||
        !TRANSAK_HEADLESS_KYC_FORM_STATUSES.includes(
          getTransakHeadlessKycStatus(kyc),
        )
      ) {
        return {
          status: 'unavailable',
          reason: getTransakHeadlessKycUnavailableReason(kyc),
        };
      }
      const session = await transakHeadlessCreateKycSession(wallet, {
        env,
        userAccessToken,
        quoteId: quote.quoteId,
        config: {colorMode: opts.kycSession.colorMode},
      });
      if (!session?.sessionId) {
        return {status: 'unavailable', reason: 'kyc session: no sessionId'};
      }
      return {status: 'kyc', sessionId: session.sessionId};
    }

    const kycType = getTransakHeadlessKycType(kyc);
    if (kycType) {
      try {
        const limits = await transakHeadlessGetUserLimits(wallet, {
          env,
          userAccessToken,
          kycType,
          fiatCurrency: quoteRequestData.fiatCurrency,
          paymentCategory: quoteRequestData.paymentMethod,
        });
        if (isTransakHeadlessOverLimit(limits, quote.fiatAmount)) {
          return {status: 'unavailable', reason: 'limits: exceeded'};
        }
      } catch (err) {
        if (isTransakHeadlessUnauthorized(err)) {
          throw err;
        }
      }
    }

    const activeOrders = await transakHeadlessGetActiveOrders(wallet, {
      env,
      userAccessToken,
    });
    const ownOrderIds = opts.ownOrderIds ?? [];
    // Only our own unpaid orders are cancelled. Transak documents that active
    // orders are only AWAITING_PAYMENT_FROM_USER; any other status is left
    // untouched, since the customer may already have paid it.
    const otherOrder = activeOrders.find(
      order =>
        !ownOrderIds.includes(order.orderId) ||
        order.status !== 'AWAITING_PAYMENT_FROM_USER',
    );
    if (otherOrder) {
      return {
        status: 'unavailable',
        reason: `active order: ${otherOrder.orderId}`,
      };
    }
    for (const order of activeOrders) {
      const cancelled = await transakHeadlessCancelOrder(wallet, {
        env,
        userAccessToken,
        orderId: order.orderId,
        cancelReason: TRANSAK_HEADLESS_CANCEL_REASON,
      });
      opts.onOwnOrderCancelled?.(
        order.orderId,
        cancelled?.status ?? 'CANCELLED',
      );
    }

    let savedCards: TransakHeadlessSavedCard[] = [];
    if (quoteRequestData.paymentMethod === 'credit_debit_card') {
      try {
        savedCards = await transakHeadlessGetSavedCards(wallet, {
          env,
          userAccessToken,
        });
      } catch (err) {
        // Not being able to list saved cards still allows paying with a new one.
        if (isTransakHeadlessUnauthorized(err)) {
          throw err;
        }
      }
    }

    return {status: 'ready', quote, quoteFetchedAt, savedCards};
  } catch (err) {
    if (isTransakHeadlessUnauthorized(err)) {
      return {status: 'unauthorized'};
    }
    if (err instanceof TransakHeadlessUnavailableError) {
      return {status: 'unavailable', reason: err.message};
    }
    const code =
      err instanceof TransakHeadlessError
        ? `${err.statusCode ?? '-'}/${err.errorCode ?? '-'}`
        : 'request';
    return {
      status: 'unavailable',
      reason: `${code}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
