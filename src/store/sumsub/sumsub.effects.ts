import {t} from 'i18next';
import {Effect} from '../index';
import {SumSubApi} from '../../api/sumsub';
import {launchSumSubSdk} from '../../lib/sumsub';
import {LogActions} from '../log';
import {SumSubActions} from './index';
import {KycInfo} from './sumsub.reducer';
import {showBottomNotificationModal} from '../app/app.actions';
import {CustomErrorMessage} from '../../navigation/wallet/components/ErrorMessages';
import {deriveKycUiState} from './sumsub.selectors';
import {ongoingProcessManager} from '../../managers/OngoingProcessManager';
import {sleep} from '../../utils/helper-methods';

const MODAL_HANDOFF_DELAY = 600;

// Fetches the backend KYC object and stores it verbatim. No-op when logged out.
export const startGetKycStatus =
  (): Effect<Promise<KycInfo | null>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID, SUMSUB} = getState();
    const network = APP.network;
    const user = BITPAY_ID.user[network];
    const apiToken = BITPAY_ID.apiToken[network];

    if (!user || !apiToken) {
      return SUMSUB.kyc[network];
    }

    try {
      const kyc = await SumSubApi.fetchKycStatus(apiToken);
      dispatch(SumSubActions.setKyc(network, kyc));
      // Backend past notStarted is authoritative → drop the stale SDK fallback.
      if (kyc?.status && kyc.status !== 'notStarted') {
        dispatch(SumSubActions.setSdkStatus(network, null));
      }
      if (
        user.eid &&
        getState().SUMSUB.bannerAck?.[network]?.eid !== user.eid
      ) {
        dispatch(
          SumSubActions.setKycBannerAck(network, {
            eid: user.eid,
            state: deriveKycUiState(kyc, getState().SUMSUB.sdkStatus[network]),
          }),
        );
      }
      return kyc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error(`[SumSub] Failed to fetch KYC status: ${msg}`));
      return getState().SUMSUB.kyc[network];
    }
  };

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
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: t(
              'Please log in to your BitPay account to verify your identity.',
            ),
          }),
        ),
      );
      return;
    }

    const getAccessToken = (): Promise<string | null> =>
      SumSubApi.fetchAccessToken(apiToken);

    try {
      ongoingProcessManager.show('GENERAL_AWAITING');
      let accessToken: string | null;
      try {
        accessToken = await getAccessToken();
      } finally {
        ongoingProcessManager.hide();
      }

      if (!accessToken) {
        dispatch(
          LogActions.info(
            '[SumSub] No access token returned — KYC not available for this user.',
          ),
        );
        await sleep(MODAL_HANDOFF_DELAY);
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              title: t('Verification unavailable'),
              errMsg: t(
                "Identity verification isn't available for your account at this time. Please contact support if you need help.",
              ),
            }),
          ),
        );
        return;
      }

      // onTokenExpired must resolve to a string; coerce a null refresh to ''.
      const onTokenExpired = async (): Promise<string> =>
        (await getAccessToken()) || '';

      const locale = (APP.defaultLanguage || 'en').split('-')[0];

      const result = await launchSumSubSdk(accessToken, onTokenExpired, locale);

      dispatch(
        LogActions.debug(`[SumSub] SDK closed — status: ${result.status}`),
      );

      if (result.status === 'Failed') {
        const errMsg =
          result.errorMsg || 'The verification process encountered an error.';
        dispatch(
          LogActions.error(
            `[SumSub] SDK failed — errorType: ${result.errorType}, errorMsg: ${result.errorMsg}`,
          ),
        );
        dispatch(showBottomNotificationModal(CustomErrorMessage({errMsg})));
        return;
      }

      // Re-fetch the backend object (authoritative; also clears stale sdkStatus).
      const backendKyc = await dispatch(startGetKycStatus());

      // If the backend still lags on notStarted, keep the SDK status as a
      // fallback so a cancelled-midway user shows "action required", not
      // notStarted (which would re-trigger the Get Verified modal).
      const backendCaughtUp =
        !!backendKyc?.status && backendKyc.status !== 'notStarted';
      if (!backendCaughtUp) {
        dispatch(SumSubActions.setSdkStatus(network, result.status ?? null));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(LogActions.error(`[SumSub] SDK error: ${msg}`));
      await sleep(MODAL_HANDOFF_DELAY);
      dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: t('The verification process encountered an error.'),
          }),
        ),
      );
    }
  };
