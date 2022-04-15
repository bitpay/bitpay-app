import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseDashboard from '../components/CoinbaseDashboard';
import CoinbaseIntro from '../components/CoinbaseIntro';
import {
  coinbaseParseErrorToString,
  coinbaseLinkAccount,
} from '../../../store/coinbase';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {sleep} from '../../../utils/helper-methods';
import {updatePortfolioBalance} from '../../../store/wallet/wallet.actions';

export type CoinbaseRootScreenParamList =
  | {
      code?: string;
      state?: string;
    }
  | undefined;

type CoinbaseRootScreenProps = StackScreenProps<
  CoinbaseStackParamList,
  'CoinbaseRoot'
>;

const CoinbaseRoot: React.FC<CoinbaseRootScreenProps> = ({
  navigation,
  route,
}) => {
  const dispatch = useAppDispatch();

  const tokenError = useAppSelector(
    ({COINBASE}) => COINBASE.getAccessTokenError,
  );
  const tokenStatus = useAppSelector(
    ({COINBASE}) => COINBASE.getAccessTokenStatus,
  );
  const token = useAppSelector(({COINBASE}) => COINBASE.token[COINBASE_ENV]);
  const [isDashboardEnabled, setIsDashboardEnabled] = useState(!!token);

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = coinbaseParseErrorToString(error);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: 'Coinbase Error',
          message: errMsg,
          enableBackdropDismiss: true,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    (async () => {
      const {code, state} = route.params || {};

      if (!token && code && state) {
        await sleep(1000);
        dispatch(
          showOnGoingProcessModal(OnGoingProcessMessages.CONNECTING_COINBASE),
        );
        await dispatch(coinbaseLinkAccount(code, state));
        // reset params to prevent re-triggering flow based on cached params when disconnecting
        navigation.setParams({code: undefined, state: undefined});
      }

      if (token || tokenStatus === 'success') {
        await sleep(1000);
        dispatch(dismissOnGoingProcessModal());
        setIsDashboardEnabled(true);
      }

      if (tokenError) {
        dispatch(dismissOnGoingProcessModal());
        showError(tokenError);
        setIsDashboardEnabled(false);
      }
    })();
  }, [dispatch, route.params, token, tokenError, tokenStatus, showError]);

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CoinbaseDashboard : CoinbaseIntro;
  }, [isDashboardEnabled]);

  return <DashboardOrIntro />;
};

export default CoinbaseRoot;
