import {Network} from '../../constants';
import {KycInfo} from './sumsub.reducer';

export enum SumSubActionTypes {
  SET_KYC = 'SumSub/SET_KYC',
  SET_SDK_STATUS = 'SumSub/SET_SDK_STATUS',
  RESET_KYC = 'SumSub/RESET_KYC',
}

interface SetKyc {
  type: typeof SumSubActionTypes.SET_KYC;
  payload: {network: Network; kyc: KycInfo | null};
}

interface SetSdkStatus {
  type: typeof SumSubActionTypes.SET_SDK_STATUS;
  payload: {network: Network; sdkStatus: string | null};
}

interface ResetKyc {
  type: typeof SumSubActionTypes.RESET_KYC;
  payload: {network: Network};
}

export type SumSubActionType = SetKyc | SetSdkStatus | ResetKyc;
