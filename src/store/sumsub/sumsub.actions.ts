import {Network} from '../../constants';
import {SumSubKycStatus} from './sumsub.reducer';
import {SumSubActionType, SumSubActionTypes} from './sumsub.types';

export const setKycStatus = (
  network: Network,
  status: SumSubKycStatus,
): SumSubActionType => ({
  type: SumSubActionTypes.SET_KYC_STATUS,
  payload: {network, status},
});

export const resetKycStatus = (network: Network): SumSubActionType => ({
  type: SumSubActionTypes.RESET_KYC_STATUS,
  payload: {network},
});
