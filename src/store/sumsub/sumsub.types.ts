import {Network} from '../../constants';
import {KycInfo} from './sumsub.reducer';

export type KycUiState =
  | 'notStarted'
  | 'actionRequired'
  | 'denied'
  | 'inReview'
  | 'success';

export interface KycBannerAck {
  eid: string;
  state: KycUiState;
}

export enum SumSubActionTypes {
  SET_KYC = 'SumSub/SET_KYC',
  SET_SDK_STATUS = 'SumSub/SET_SDK_STATUS',
  SET_BANNER_ACK = 'SumSub/SET_BANNER_ACK',
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

interface SetBannerAck {
  type: typeof SumSubActionTypes.SET_BANNER_ACK;
  payload: {network: Network; ack: KycBannerAck};
}

interface ResetKyc {
  type: typeof SumSubActionTypes.RESET_KYC;
  payload: {network: Network};
}

export type SumSubActionType = SetKyc | SetSdkStatus | SetBannerAck | ResetKyc;
