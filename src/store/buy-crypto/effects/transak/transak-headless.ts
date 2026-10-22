import {Wallet} from '../../../wallet/wallet.models';
import {
  TransakEnv,
  TransakHeadlessCardSessionData,
  TransakHeadlessGetQuoteRequestData,
  TransakHeadlessKycRequirementData,
  TransakHeadlessOrderData,
  TransakHeadlessQuoteData,
  TransakHeadlessSavedCard,
  TransakHeadlessSendOtpData,
  TransakHeadlessVerifyOtpData,
} from '../../buy-crypto.models';

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
  requestData: TransakHeadlessGetQuoteRequestData,
): Promise<TransakHeadlessQuoteData> =>
  unwrap(await wallet.transakHeadlessGetQuote(requestData));

export const transakHeadlessGetKycRequirement = async (
  wallet: Wallet,
  requestData: {env: TransakEnv; userAccessToken: string; quoteId: string},
): Promise<TransakHeadlessKycRequirementData> =>
  unwrap(await wallet.transakHeadlessGetKycRequirement(requestData));

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

export const transakHeadlessCreateCardSession = async (
  wallet: Wallet,
  requestData: {
    env: TransakEnv;
    userAccessToken: string;
    quoteId: string;
    walletAddress: string;
    successUrl: string;
    failureUrl: string;
    config?: {
      colorMode?: 'DARK' | 'LIGHT';
      colors?: {[key: string]: string};
    };
  },
): Promise<TransakHeadlessCardSessionData> =>
  unwrap(await wallet.transakHeadlessCreateCardSession(requestData));

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

export type TransakHeadlessPreparation =
  | {
      status: 'ready';
      quote: TransakHeadlessQuoteData;
      quoteFetchedAt: number;
      savedCards: TransakHeadlessSavedCard[];
    }
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
): Promise<TransakHeadlessPreparation> => {
  const env = quoteRequestData.env;
  try {
    const quote = await transakHeadlessGetQuote(wallet, quoteRequestData);
    if (!quote?.quoteId) {
      return {status: 'unavailable', reason: 'quote: no quoteId'};
    }
    const quoteFetchedAt = Date.now();

    const kyc = await transakHeadlessGetKycRequirement(wallet, {
      env,
      userAccessToken,
      quoteId: quote.quoteId,
    });
    if (!kyc?.isAllowedToPlaceOrder) {
      return {
        status: 'unavailable',
        reason: `kyc: ${kyc?.status ?? 'unknown'} (${kyc?.kycType ?? '-'})`,
      };
    }

    let savedCards: TransakHeadlessSavedCard[] = [];
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

    return {status: 'ready', quote, quoteFetchedAt, savedCards};
  } catch (err) {
    if (isTransakHeadlessUnauthorized(err)) {
      return {status: 'unauthorized'};
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
