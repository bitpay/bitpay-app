import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseDashboard from '../components/CoinbaseDashboard';
import CoinbaseIntro from '../components/CoinbaseIntro';
import {
  coinbaseParseErrorToString,
  coinbaseLinkAccount,
  clearErrorStatus,
} from '../../../store/coinbase';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import {COINBASE_ENV} from '../../../api/coinbase/coinbase.constants';
import {sleep} from '../../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../store/app/app.effects';

export type CoinbaseRootScreenParamList =
  | {
      code?: string;
      state?: string;
    }
  | undefined;

type CoinbaseRootScreenProps = NativeStackScreenProps<
  CoinbaseStackParamList,
  'CoinbaseRoot'
>;

const CoinbaseRoot: React.FC<CoinbaseRootScreenProps> = ({
  navigation,
  route,
}) => {
  const {t} = useTranslation();
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
          title: t('Coinbase error'),
          message: errMsg,
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('OK'),
              action: () => {
                dispatch(clearErrorStatus());
                navigation.goBack();
              },
              primary: true,
            },
          ],
        }),
      );
    },
    [dispatch, navigation, t],
  );

  useEffect(() => {
    (async () => {
      const {code, state} = route.params || {};

      if (!token && code && state && tokenStatus !== 'failed') {
        await sleep(1000);
        dispatch(startOnGoingProcessModal('CONNECTING_COINBASE'));
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
        setIsDashboardEnabled(false);
        await sleep(1000);
        showError(tokenError);
      }
    })();
  }, [
    navigation,
    dispatch,
    route.params,
    token,
    tokenError,
    tokenStatus,
    showError,
    t,
  ]);

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CoinbaseDashboard : CoinbaseIntro;
  }, [isDashboardEnabled]);

  return <DashboardOrIntro />;
};

export default CoinbaseRoot;
