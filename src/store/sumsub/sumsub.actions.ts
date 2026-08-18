import {Network} from '../../constants';
import {KycInfo} from './sumsub.reducer';
import {
  KycBannerAck,
  SumSubActionType,
  SumSubActionTypes,
} from './sumsub.types';

export const setKyc = (
  network: Network,
  kyc: KycInfo | null,
): SumSubActionType => ({
  type: SumSubActionTypes.SET_KYC,
  payload: {network, kyc},
});

export const setSdkStatus = (
  network: Network,
  sdkStatus: string | null,
): SumSubActionType => ({
  type: SumSubActionTypes.SET_SDK_STATUS,
  payload: {network, sdkStatus},
});

export const setKycBannerAck = (
  network: Network,
  ack: KycBannerAck,
): SumSubActionType => ({
  type: SumSubActionTypes.SET_BANNER_ACK,
  payload: {network, ack},
});

export const resetKyc = (network: Network): SumSubActionType => ({
  type: SumSubActionTypes.RESET_KYC,
  payload: {network},
});
