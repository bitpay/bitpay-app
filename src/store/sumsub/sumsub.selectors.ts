import {RootState} from '../index';
import {KycInfo} from './sumsub.reducer';

export type KycUiState =
  | 'notStarted'
  | 'actionRequired'
  | 'denied'
  | 'inReview'
  | 'success';

// Backend `status` (camelCase) → UI; unknown in-flight states → 'inReview'.
const backendStatusToUiState = (status?: string): KycUiState => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'denied';
    case 'requiresAction':
      return 'actionRequired';
    case 'notStarted':
    case undefined:
      return 'notStarted';
    default:
      return 'inReview';
  }
};

// SDK `status` (PascalCase) → UI, capped at 'inReview' (never show verified/
// denied from the SDK — wait for the backend). null = no useful signal.
const sdkStatusToUiState = (sdkStatus?: string | null): KycUiState | null => {
  switch (sdkStatus) {
    case 'Incomplete':
    case 'TemporarilyDeclined':
      return 'actionRequired';
    case 'Pending':
    case 'Approved':
    case 'FinallyRejected':
      return 'inReview';
    default:
      return null;
  }
};

// Backend wins once past notStarted; while it lags, the SDK status fills the gap.
export const deriveKycUiState = (
  kyc?: KycInfo | null,
  sdkStatus?: string | null,
): KycUiState => {
  const backendState = backendStatusToUiState(kyc?.status);
  if (backendState !== 'notStarted') {
    return backendState;
  }
  return sdkStatusToUiState(sdkStatus) ?? 'notStarted';
};

// Prompt gate: email verified, SumSub flow (path 'sumsub', provider null/unset
// or 'sumsub' — null means not yet engaged; a foreign provider is the excluded
// legacy one), backend eligible (notStarted + tier -1), and no in-progress SDK.
export const isKycEligibleToStart = (
  kyc?: KycInfo | null,
  sdkStatus?: string | null,
  userVerified?: boolean,
): boolean =>
  !!userVerified &&
  kyc?.path === 'sumsub' &&
  (!kyc?.provider || kyc?.provider === 'sumsub') &&
  kyc?.status === 'notStarted' &&
  kyc?.tier === -1 &&
  sdkStatusToUiState(sdkStatus) === null;

export const selectKycInfo = (state: RootState): KycInfo | null =>
  state.SUMSUB?.kyc?.[state.APP.network] ?? null;

export const selectSdkStatus = (state: RootState): string | null =>
  state.SUMSUB?.sdkStatus?.[state.APP.network] ?? null;

export const selectKycUiState = (state: RootState): KycUiState =>
  deriveKycUiState(selectKycInfo(state), selectSdkStatus(state));

export const selectCanStartKyc = (state: RootState): boolean =>
  isKycEligibleToStart(
    selectKycInfo(state),
    selectSdkStatus(state),
    state.BITPAY_ID?.user?.[state.APP.network]?.verified,
  );
