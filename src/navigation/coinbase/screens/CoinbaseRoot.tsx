import React, {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {StackScreenProps} from '@react-navigation/stack';
import {RootState} from '../../../store';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {CoinbaseStackParamList} from '../CoinbaseStack';
import CoinbaseDashboard from '../components/CoinbaseDashboard';
import CoinbaseIntro from '../components/CoinbaseIntro';
import {CoinbaseEffects} from '../../../store/coinbase';
import {useAppDispatch} from '../../../utils/hooks';
import {CoinbaseErrorsProps} from '../../../api/coinbase/coinbase.types';
import CoinbaseAPI from '../../../api/coinbase';

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
  const token = useSelector(({COINBASE}: RootState) => COINBASE.token);
  const [isDashboardEnabled, setIsDashboardEnabled] = useState(!!token);

  let {code, state} = route.params || {};

  const showError = async (error: CoinbaseErrorsProps) => {
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
  };

  useEffect(() => {
    if (token) {
      setIsDashboardEnabled(true);
    } else if (tokenError) {
      showError(tokenError);
      setIsDashboardEnabled(false);
    } else if (code && state) {
      dispatch(CoinbaseEffects.linkCoinbaseAccount(code, state));
    } else {
      setIsDashboardEnabled(false);
    }
  }, [dispatch, code, state, token, tokenError]);

  const DashboardOrIntro = useMemo(() => {
    return isDashboardEnabled ? CoinbaseDashboard : CoinbaseIntro;
  }, [isDashboardEnabled]);

  return <DashboardOrIntro token={token} />;
};

export default CoinbaseRoot;
