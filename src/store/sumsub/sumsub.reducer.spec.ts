/**
 * Tests for sumsub.reducer.ts and sumsub.actions.ts
 */

import {Network} from '../../constants';
import {KycInfo, sumSubReducer, SumSubState} from './sumsub.reducer';
import {setKyc, setSdkStatus, resetKyc} from './sumsub.actions';
import {SumSubActionTypes} from './sumsub.types';

const emptyMap = {
  [Network.mainnet]: null,
  [Network.testnet]: null,
  [Network.regtest]: null,
};

const notStarted: KycInfo = {
  path: 'sumsub',
  provider: null,
  tier: -1,
  status: 'notStarted',
  activeAttempt: null,
};

const approved: KycInfo = {path: 'sumsub', tier: 0, status: 'approved'};

const seed = (partial: Partial<SumSubState>): SumSubState => ({
  kyc: {...emptyMap},
  sdkStatus: {...emptyMap},
  bannerAck: {...emptyMap},
  ...partial,
});

describe('sumsub action creators', () => {
  it('setKyc builds a SET_KYC action', () => {
    expect(setKyc(Network.mainnet, notStarted)).toEqual({
      type: SumSubActionTypes.SET_KYC,
      payload: {network: Network.mainnet, kyc: notStarted},
    });
  });

  it('setSdkStatus builds a SET_SDK_STATUS action', () => {
    expect(setSdkStatus(Network.mainnet, 'Incomplete')).toEqual({
      type: SumSubActionTypes.SET_SDK_STATUS,
      payload: {network: Network.mainnet, sdkStatus: 'Incomplete'},
    });
  });

  it('resetKyc builds a RESET_KYC action', () => {
    expect(resetKyc(Network.testnet)).toEqual({
      type: SumSubActionTypes.RESET_KYC,
      payload: {network: Network.testnet},
    });
  });
});

describe('sumSubReducer', () => {
  it('returns the initial state for an unknown action', () => {
    const state = sumSubReducer(undefined, {type: 'UNKNOWN'} as any);
    expect(state.kyc).toEqual(emptyMap);
    expect(state.sdkStatus).toEqual(emptyMap);
  });

  it('SET_KYC stores the whole object for the given network', () => {
    const state = sumSubReducer(undefined, setKyc(Network.mainnet, notStarted));
    expect(state.kyc[Network.mainnet]).toBe(notStarted);
    expect(state.kyc[Network.testnet]).toBeNull();
  });

  it('SET_SDK_STATUS stores the raw SDK status for the given network', () => {
    const state = sumSubReducer(
      undefined,
      setSdkStatus(Network.mainnet, 'Incomplete'),
    );
    expect(state.sdkStatus[Network.mainnet]).toBe('Incomplete');
    expect(state.sdkStatus[Network.testnet]).toBeNull();
  });

  it('SET_KYC does not affect other networks', () => {
    const seeded = seed({kyc: {...emptyMap, [Network.testnet]: approved}});
    const state = sumSubReducer(seeded, setKyc(Network.mainnet, notStarted));
    expect(state.kyc[Network.mainnet]).toBe(notStarted);
    expect(state.kyc[Network.testnet]).toBe(approved);
  });

  it('RESET_KYC clears both kyc and sdkStatus for only the given network', () => {
    const seeded = seed({
      kyc: {
        ...emptyMap,
        [Network.mainnet]: approved,
        [Network.testnet]: notStarted,
      },
      sdkStatus: {
        ...emptyMap,
        [Network.mainnet]: 'Incomplete',
        [Network.testnet]: 'Pending',
      },
    });
    const state = sumSubReducer(seeded, resetKyc(Network.mainnet));
    expect(state.kyc[Network.mainnet]).toBeNull();
    expect(state.sdkStatus[Network.mainnet]).toBeNull();
    expect(state.kyc[Network.testnet]).toBe(notStarted);
    expect(state.sdkStatus[Network.testnet]).toBe('Pending');
  });

  it('rehydrates missing kyc/sdkStatus maps before applying an action', () => {
    // Simulates a persisted state shape from before these maps existed.
    const legacy = {} as SumSubState;
    const state = sumSubReducer(legacy, setKyc(Network.mainnet, approved));
    expect(state.kyc[Network.mainnet]).toBe(approved);
    expect(state.sdkStatus[Network.mainnet]).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const prev = sumSubReducer(undefined, {type: '@@INIT'} as any);
    const next = sumSubReducer(prev, setKyc(Network.mainnet, approved));
    expect(next).not.toBe(prev);
    expect(prev.kyc[Network.mainnet]).toBeNull();
  });
});
