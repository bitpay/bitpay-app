import {Network} from '../../constants';
import {SumSubKycStatus} from './sumsub.reducer';

export enum SumSubActionTypes {
  SET_KYC_STATUS = 'SumSub/SET_KYC_STATUS',
  RESET_KYC_STATUS = 'SumSub/RESET_KYC_STATUS',
}

interface SetKycStatus {
  type: typeof SumSubActionTypes.SET_KYC_STATUS;
  payload: {network: Network; status: SumSubKycStatus};
}

interface ResetKycStatus {
  type: typeof SumSubActionTypes.RESET_KYC_STATUS;
  payload: {network: Network};
}

export type SumSubActionType = SetKycStatus | ResetKycStatus;
