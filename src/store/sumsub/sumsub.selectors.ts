import {RootState} from '../index';
import {KycInfo} from './sumsub.reducer';
import {KycBannerAck, KycUiState} from './sumsub.types';

export type {KycBannerAck, KycUiState};

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

// SumSub flow: path 'sumsub' and provider null/unset or 'sumsub' — null means
// not yet engaged; a foreign provider is the excluded legacy one. Users whose
// approval came from the legacy compliance path must never see SumSub UI.
export const isSumsubKycFlow = (kyc?: KycInfo | null): boolean =>
  kyc?.path === 'sumsub' && (!kyc?.provider || kyc?.provider === 'sumsub');

// Prompt gate: email verified, SumSub flow, backend eligible (notStarted +
// tier -1), and no in-progress SDK.
export const isKycEligibleToStart = (
  kyc?: KycInfo | null,
  sdkStatus?: string | null,
  userVerified?: boolean,
): boolean =>
  !!userVerified &&
  isSumsubKycFlow(kyc) &&
  kyc?.status === 'notStarted' &&
  kyc?.tier === -1 &&
  sdkStatusToUiState(sdkStatus) === null;

// Banners that stay up for as long as the KYC sits in that state — they are not
// dismissible and must never be suppressed by an acknowledgement.
const PERSISTENT_BANNER_STATES: KycUiState[] = ['actionRequired', 'inReview'];

// Banners that announce an outcome. They are events, not standing state, so
// they are shown once per transition and then acknowledged.
const ONE_SHOT_BANNER_STATES: KycUiState[] = ['success', 'denied'];

export const isOneShotBannerState = (state: KycUiState): boolean =>
  ONE_SHOT_BANNER_STATES.includes(state);

export const selectKycInfo = (state: RootState): KycInfo | null =>
  state.SUMSUB?.kyc?.[state.APP.network] ?? null;

export const selectSdkStatus = (state: RootState): string | null =>
  state.SUMSUB?.sdkStatus?.[state.APP.network] ?? null;

export const selectKycUiState = (state: RootState): KycUiState =>
  deriveKycUiState(selectKycInfo(state), selectSdkStatus(state));

export const selectKycBannerAck = (state: RootState): KycBannerAck | null =>
  state.SUMSUB?.bannerAck?.[state.APP.network] ?? null;

// The state the home banner should announce, or null for no banner.
//
// One-shot banners require a prior acknowledgement for this account to compare
// against: without one there is no observed transition, only the value the app
// loaded with, and announcing that is what made the banner permanent (RN-2877).
// The baseline is seeded on the first `startGetKycStatus` of an account.
export const selectKycBannerState = (state: RootState): KycUiState | null => {
  const user = state.BITPAY_ID?.user?.[state.APP.network];
  if (!user?.verified) {
    return null;
  }

  const kyc = selectKycInfo(state);
  if (!isSumsubKycFlow(kyc)) {
    return null;
  }

  const uiState = deriveKycUiState(kyc, selectSdkStatus(state));

  if (PERSISTENT_BANNER_STATES.includes(uiState)) {
    return uiState;
  }
  // notStarted is handled by the Get Verified modal, not the banner.
  if (!isOneShotBannerState(uiState)) {
    return null;
  }

  const ack = selectKycBannerAck(state);
  if (!ack || ack.eid !== user.eid || ack.state === uiState) {
    return null;
  }
  return uiState;
};

export const selectCanStartKyc = (state: RootState): boolean =>
  isKycEligibleToStart(
    selectKycInfo(state),
    selectSdkStatus(state),
    state.BITPAY_ID?.user?.[state.APP.network]?.verified,
  );
