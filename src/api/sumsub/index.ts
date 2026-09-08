import BitPayIdApi from '../bitpay';

// Signed /api/v2 RPC methods (map to BitPayUser.* server-side, same channel DI uses).
export const GET_KYC_ACCESS_TOKEN_METHOD = 'getKycAccessToken';
export const GET_KYC_STATUS_METHOD = 'getKycStatus';

export interface KycActiveAttempt {
  targetTier?: number;
  level?: string;
  status?: string;
  reviewOutcome?: string;
  reviewedAt?: string;
  startedAt?: string;
  updatedAt?: string;
}

// Backend `getKycStatus` payload. `status`: notStarted | approved | pendingReview
// | rejected, or an in-flight SumSub state (inProgress, requiresAction, …).
export interface KycStatusResponse {
  path?: string;
  provider?: string | null;
  tier?: number;
  status?: string;
  activeAttempt?: KycActiveAttempt | null;
  legacy?: {complianceAppStatus?: string; alreadyApproved?: boolean} | null;
  applicantId?: string;
}

// Mints a SumSub SDK token. Resolves null when the user is not eligible (no
// shopper product, shopper tier 1, or already KYC tier ≥1).
const fetchAccessToken = async (apiToken: string): Promise<string | null> => {
  const result = await BitPayIdApi.apiCall(
    apiToken,
    GET_KYC_ACCESS_TOKEN_METHOD,
    {},
  );
  // apiCall does `res.data.data || res.data`, so a null token surfaces as the
  // `{data: null}` envelope. Only a non-empty string is a real token.
  const token = typeof result === 'string' && result ? result : null;
  console.log(
    '[SumSub] getKycAccessToken →',
    token ? `token(len ${token.length})` : 'null (not eligible)',
  );
  return token;
};

// Fetches the authoritative KYC status (same payload as REST GET /kyc/status).
const fetchKycStatus = async (apiToken: string): Promise<KycStatusResponse> => {
  const result = await BitPayIdApi.apiCall(apiToken, GET_KYC_STATUS_METHOD, {});
  console.log('[SumSub] getKycStatus →', JSON.stringify(result));
  return result;
};

export const SumSubApi = {
  fetchAccessToken,
  fetchKycStatus,
};
