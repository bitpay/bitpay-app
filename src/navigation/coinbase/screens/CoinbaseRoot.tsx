import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {StackScreenProps} from '@react-navigation/stack';
import {RootState} from '../../../store';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseDashboard from '../components/CoinbaseDashboard';
import CoinbaseIntro from '../components/CoinbaseIntro';
import {CoinbaseEffects} from '../../../store/coinbase';
import {useAppDispatch} from '../../../utils/hooks';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import CoinbaseAPI from '../../../api/coinbase';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';

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

const CoinbaseRoot: React.FC<CoinbaseRootScreenProps> = ({route}) => {
  const dispatch = useAppDispatch();

  const tokenError = useSelector<RootState, CoinbaseErrorsProps | null>(
    ({COINBASE}) => COINBASE.getAccessTokenError,
  );
  const tokenStatus = useSelector<RootState, 'success' | 'failed' | null>(
    ({COINBASE}) => COINBASE.getAccessTokenStatus,
  );
  const token = useSelector(
    ({COINBASE}: RootState) => COINBASE.token[COINBASE_ENV],
  );
  const [isDashboardEnabled, setIsDashboardEnabled] = useState(!!token);

  let {code, state} = route.params || {};

  const showError = useCallback(
    (error: CoinbaseErrorsProps) => {
      const errMsg = CoinbaseAPI.parseErrorToString(error);
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
    if (!token && code && state) {
      dispatch(CoinbaseEffects.linkCoinbaseAccount(code, state));
      dispatch(
        showOnGoingProcessModal(OnGoingProcessMessages.CONNECTING_COINBASE),
      );
    }

    if (token || tokenStatus === 'success') {
      dispatch(dismissOnGoingProcessModal());
      setIsDashboardEnabled(true);
    }

    if (tokenError) {
      dispatch(dismissOnGoingProcessModal());
      showError(tokenError);
      setIsDashboardEnabled(false);
    }
  }, [dispatch, code, state, token, tokenError, tokenStatus, showError]);

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CoinbaseDashboard : CoinbaseIntro;
  }, [isDashboardEnabled]);

  return <DashboardOrIntro />;
};

export default CoinbaseRoot;
