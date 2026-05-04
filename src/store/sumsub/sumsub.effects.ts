import {Effect} from '../index';
import {SumSubApi, SUMSUB_DEV_TOKEN} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';
import {LogActions} from '../log';
import {SumSubActions} from './index';

export const startKycVerification =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const network = APP.network;
    const user = BITPAY_ID.user[network];
    const apiToken = BITPAY_ID.apiToken[network];

    if (!user || !apiToken) {
      dispatch(
        LogActions.error('[SumSub] Cannot start KYC — user not logged in'),
      );
      return;
    }

    const userId = user.eid;

    const useDevToken = __DEV__ && !!SUMSUB_DEV_TOKEN;

    const getAccessToken = async (): Promise<string> => {
      if (useDevToken) {
        dispatch(
          LogActions.debug('[SumSub] Using manually set SUMSUB_DEV_TOKEN'),
        );
        return SUMSUB_DEV_TOKEN;
      }
      const {token} = await SumSubApi.fetchAccessToken(
        network,
        apiToken,
        userId,
      );
      return token;
    };

    try {
      const accessToken = await getAccessToken();

      const result = await launchSumSubSdk(accessToken, getAccessToken);

      dispatch(
        LogActions.debug(`[SumSub] SDK closed — status: ${result.status}`),
      );

      const verificationStatuses: string[] = [
        'Initial',
        'Incomplete',
        'Pending',
        'Approved',
        'TemporarilyDeclined',
        'FinallyRejected',
      ];
      if (result.status && verificationStatuses.includes(result.status)) {
        dispatch(SumSubActions.setKycStatus(network, result.status as any));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error(`[SumSub] SDK error: ${msg}`));
    }
  };
