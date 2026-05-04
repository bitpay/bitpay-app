/**
 * Tests for sumsub.selectors.ts
 */

import {Network} from '../../constants';
import {KycInfo} from './sumsub.reducer';
import {
  deriveKycUiState,
  isKycEligibleToStart,
  selectCanStartKyc,
  selectKycInfo,
  selectKycUiState,
  selectSdkStatus,
} from './sumsub.selectors';

const kyc = (partial: Partial<KycInfo>): KycInfo => ({
  path: 'sumsub',
  provider: 'sumsub',
  ...partial,
});

describe('deriveKycUiState — backend precedence', () => {
  it('maps backend statuses to UI states', () => {
    expect(deriveKycUiState(kyc({status: 'approved'}))).toBe('success');
    expect(deriveKycUiState(kyc({status: 'rejected'}))).toBe('denied');
    expect(deriveKycUiState(kyc({status: 'requiresAction'}))).toBe(
      'actionRequired',
    );
    expect(deriveKycUiState(kyc({status: 'notStarted'}))).toBe('notStarted');
  });

  it('treats missing info/undefined status as notStarted', () => {
    expect(deriveKycUiState(null)).toBe('notStarted');
    expect(deriveKycUiState(undefined)).toBe('notStarted');
    expect(deriveKycUiState(kyc({}))).toBe('notStarted');
  });

  it('falls back to inReview for any in-flight/unknown backend status', () => {
    expect(deriveKycUiState(kyc({status: 'pendingReview'}))).toBe('inReview');
    expect(deriveKycUiState(kyc({status: 'inProgress'}))).toBe('inReview');
    expect(deriveKycUiState(kyc({status: 'somethingNew'}))).toBe('inReview');
  });
});

describe('deriveKycUiState — SDK fallback while backend lags', () => {
  it('uses the SDK status only when the backend is still notStarted', () => {
    expect(deriveKycUiState(kyc({status: 'notStarted'}), 'Incomplete')).toBe(
      'actionRequired',
    );
    expect(
      deriveKycUiState(kyc({status: 'notStarted'}), 'TemporarilyDeclined'),
    ).toBe('actionRequired');
    expect(deriveKycUiState(kyc({status: 'notStarted'}), 'Pending')).toBe(
      'inReview',
    );
  });

  it('caps terminal SDK outcomes at inReview until the backend confirms', () => {
    expect(deriveKycUiState(kyc({status: 'notStarted'}), 'Approved')).toBe(
      'inReview',
    );
    expect(
      deriveKycUiState(kyc({status: 'notStarted'}), 'FinallyRejected'),
    ).toBe('inReview');
  });

  it('ignores an SDK status once the backend has advanced', () => {
    // Backend wins — the SDK fallback is not consulted.
    expect(deriveKycUiState(kyc({status: 'approved'}), 'Incomplete')).toBe(
      'success',
    );
  });

  it('treats a bare Initial / unknown SDK status as no signal', () => {
    expect(deriveKycUiState(kyc({status: 'notStarted'}), 'Initial')).toBe(
      'notStarted',
    );
    expect(deriveKycUiState(kyc({status: 'notStarted'}), null)).toBe(
      'notStarted',
    );
  });
});

describe('isKycEligibleToStart', () => {
  // 3rd arg is userVerified (email verified); true unless the test is about it.
  const eligible = kyc({status: 'notStarted', tier: -1});

  it('is true for verified + notStarted + tier -1 + no SDK progress', () => {
    expect(isKycEligibleToStart(eligible, null, true)).toBe(true);
    expect(isKycEligibleToStart(eligible, 'Initial', true)).toBe(true);
  });

  it('is false when the email is not verified', () => {
    expect(isKycEligibleToStart(eligible, null, false)).toBe(false);
    expect(isKycEligibleToStart(eligible, null, undefined)).toBe(false);
  });

  it('is true when provider is null/unset (fresh SumSub user)', () => {
    expect(
      isKycEligibleToStart(
        kyc({status: 'notStarted', tier: -1, provider: null}),
        null,
        true,
      ),
    ).toBe(true);
    expect(
      isKycEligibleToStart(
        kyc({status: 'notStarted', tier: -1, provider: undefined}),
        null,
        true,
      ),
    ).toBe(true);
  });

  it('is false when the SDK reports an in-progress session', () => {
    expect(isKycEligibleToStart(eligible, 'Incomplete', true)).toBe(false);
    expect(isKycEligibleToStart(eligible, 'Pending', true)).toBe(false);
  });

  it('is false when the tier is not -1', () => {
    expect(
      isKycEligibleToStart(kyc({status: 'notStarted', tier: 0}), null, true),
    ).toBe(false);
    expect(
      isKycEligibleToStart(
        kyc({status: 'notStarted', tier: undefined}),
        null,
        true,
      ),
    ).toBe(false);
  });

  it('is false when the user belongs to a different KYC provider', () => {
    expect(
      isKycEligibleToStart(
        kyc({status: 'notStarted', tier: -1, provider: 'other'}),
        null,
        true,
      ),
    ).toBe(false);
    expect(
      isKycEligibleToStart(
        kyc({status: 'notStarted', tier: -1, path: 'passfort'}),
        null,
        true,
      ),
    ).toBe(false);
  });

  it('is false when KYC is already started/approved', () => {
    expect(
      isKycEligibleToStart(kyc({status: 'approved', tier: 0}), null, true),
    ).toBe(false);
    expect(isKycEligibleToStart(null, null, true)).toBe(false);
    expect(isKycEligibleToStart(undefined, null, true)).toBe(false);
  });
});

describe('selectors read the current network slice', () => {
  const buildState = (
    info: KycInfo | null,
    sdkStatus: string | null = null,
    verified = true,
  ): any => ({
    APP: {network: Network.mainnet},
    BITPAY_ID: {user: {[Network.mainnet]: {verified}}},
    SUMSUB: {
      kyc: {
        [Network.mainnet]: info,
        [Network.testnet]: null,
        [Network.regtest]: null,
      },
      sdkStatus: {
        [Network.mainnet]: sdkStatus,
        [Network.testnet]: null,
        [Network.regtest]: null,
      },
    },
  });

  it('selectKycInfo / selectSdkStatus return the active network values', () => {
    const info = kyc({status: 'notStarted', tier: -1});
    expect(selectKycInfo(buildState(info, 'Incomplete'))).toBe(info);
    expect(selectSdkStatus(buildState(info, 'Incomplete'))).toBe('Incomplete');
    expect(selectSdkStatus(buildState(info))).toBeNull();
  });

  it('selectKycUiState combines backend + SDK for the active network', () => {
    expect(selectKycUiState(buildState(kyc({status: 'approved'})))).toBe(
      'success',
    );
    expect(
      selectKycUiState(buildState(kyc({status: 'notStarted'}), 'Incomplete')),
    ).toBe('actionRequired');
    expect(selectKycUiState(buildState(null))).toBe('notStarted');
  });

  it('selectCanStartKyc reflects eligibility incl. the SDK signal', () => {
    expect(
      selectCanStartKyc(buildState(kyc({status: 'notStarted', tier: -1}))),
    ).toBe(true);
    expect(
      selectCanStartKyc(
        buildState(kyc({status: 'notStarted', tier: -1}), 'Incomplete'),
      ),
    ).toBe(false);
    expect(
      selectCanStartKyc(buildState(kyc({status: 'notStarted', tier: 0}))),
    ).toBe(false);
  });

  it('selectCanStartKyc is false when the email is not verified', () => {
    expect(
      selectCanStartKyc(
        buildState(kyc({status: 'notStarted', tier: -1}), null, false),
      ),
    ).toBe(false);
  });
});
