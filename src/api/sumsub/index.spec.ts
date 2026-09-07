/**
 * Tests for src/api/sumsub/index.ts (the signed /api/v2 RPC wrappers)
 */

import {
  SumSubApi,
  GET_KYC_ACCESS_TOKEN_METHOD,
  GET_KYC_STATUS_METHOD,
  START_KYC_ATTEMPT_METHOD,
} from './index';
import BitPayIdApi from '../bitpay';

jest.mock('../bitpay', () => ({
  __esModule: true,
  default: {apiCall: jest.fn()},
}));

const mockApiCall = BitPayIdApi.apiCall as jest.Mock;

const API_TOKEN = 'api-token-xyz';
const ACCESS_TOKEN = 'sumsub-access-token';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SumSubApi.fetchAccessToken', () => {
  it('mints the token via the signed /api/v2 RPC', async () => {
    mockApiCall.mockResolvedValue(ACCESS_TOKEN);

    await SumSubApi.fetchAccessToken(API_TOKEN);

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith(
      API_TOKEN,
      GET_KYC_ACCESS_TOKEN_METHOD,
      {},
    );
  });

  it('resolves with the bare access token string', async () => {
    mockApiCall.mockResolvedValue(ACCESS_TOKEN);

    await expect(SumSubApi.fetchAccessToken(API_TOKEN)).resolves.toBe(
      ACCESS_TOKEN,
    );
  });

  it('resolves null when the user is not eligible (bare null)', async () => {
    mockApiCall.mockResolvedValue(null);

    await expect(SumSubApi.fetchAccessToken(API_TOKEN)).resolves.toBeNull();
  });

  it('resolves null when apiCall returns the {data:null} envelope', async () => {
    // apiCall does `res.data.data || res.data`, so a null token surfaces as the
    // envelope object rather than null.
    mockApiCall.mockResolvedValue({data: null});

    await expect(SumSubApi.fetchAccessToken(API_TOKEN)).resolves.toBeNull();
  });

  it('does not swallow errors from the RPC', async () => {
    mockApiCall.mockRejectedValue(new Error('token endpoint down'));

    await expect(SumSubApi.fetchAccessToken(API_TOKEN)).rejects.toThrow(
      'token endpoint down',
    );
  });
});

describe('SumSubApi.fetchKycStatus', () => {
  it('fetches the status via the signed /api/v2 RPC', async () => {
    const payload = {path: 'sumsub', status: 'approved', tier: 1};
    mockApiCall.mockResolvedValue(payload);

    const result = await SumSubApi.fetchKycStatus(API_TOKEN);

    expect(mockApiCall).toHaveBeenCalledWith(
      API_TOKEN,
      GET_KYC_STATUS_METHOD,
      {},
    );
    expect(result).toEqual(payload);
  });
});

describe('SumSubApi.startKycAttempt', () => {
  it('marks the attempt as started via the signed /api/v2 RPC', async () => {
    mockApiCall.mockResolvedValue({success: true});

    await expect(SumSubApi.startKycAttempt(API_TOKEN)).resolves.toBeUndefined();

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall).toHaveBeenCalledWith(
      API_TOKEN,
      START_KYC_ATTEMPT_METHOD,
      {platform: 'mobile'},
    );
  });

  it('does not swallow errors from the RPC', async () => {
    mockApiCall.mockRejectedValue(new Error('attempt endpoint down'));

    await expect(SumSubApi.startKycAttempt(API_TOKEN)).rejects.toThrow(
      'attempt endpoint down',
    );
  });
});
