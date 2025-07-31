import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {BillGroupParamList} from '../BillGroup';
import {ShopEffects} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {METHOD_ENVS} from '../../../../../constants/config';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {getBillAccountEventParamsForMultipleBills} from '../utils';

const ConnectBills = ({
  navigation,
  route,
}: NativeStackScreenProps<BillGroupParamList, 'ConnectBills'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [isWebViewShown, setIsWebViewShown] = useState(true);
  const [token, setToken] = useState('');
  const appNetwork = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[appNetwork]);
  const billPayAccounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[appNetwork],
  ) as BillPayAccount[];
  const [currentBillPayAccountIds] = useState(
    billPayAccounts.map(({id}) => id),
  );
  const [publicAccountToken, setPublicAccountToken] = useState('');
  const [exiting, setExiting] = useState(false);
  const apiToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.apiToken[appNetwork],
  );
  const [isInitialApplication] = useState(!user?.methodVerified);

  useLayoutEffect(() => {
    dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const getToken = async () => {
      const authElementToken = await dispatch(
        ShopEffects.startGetMethodToken({tokenType: route.params.tokenType}),
      );
      setToken(authElementToken);
      if (isInitialApplication) {
        return fetchMethodEntityIdIfNeeded();
      }
      dispatch(
        Analytics.track('Bill Pay - Launched Method Modal', {
          methodModalType: route.params.tokenType,
        }),
      );
    };
    getToken().catch(err => {
      dispatch(dismissOnGoingProcessModal());
      navigation.pop();
      dispatch(
        AppActions.showBottomNotificationModal(
          CustomErrorMessage({
            title: t('Could not connect bills'),
            errMsg: err.message,
          }),
        ),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAccountsAndExit = async () => {
    if (exiting) {
      if (isInitialApplication) {
        dispatch(Analytics.track('Bill Pay - Exited Application'));
      }
      return;
    }
    setExiting(true);
    dispatch(dismissOnGoingProcessModal());
    if (publicAccountToken) {
      await dispatch(
        ShopEffects.exchangeMethodAccountToken(publicAccountToken),
      );
    }
    if (isInitialApplication) {
      fetchMethodEntityIdIfNeeded().then(updatedUser => {
        if (updatedUser?.methodVerified) {
          dispatch(Analytics.track('Bill Pay - Successful Application'));
        }
        dispatch(Analytics.track('Bill Pay - Exited Application'));
      });
    }

    const latestAccounts = await dispatch(
      ShopEffects.startGetBillPayAccounts(),
    );
    const newAccounts = latestAccounts.filter(
      ({id}) => !currentBillPayAccountIds.includes(id),
    );
    if (newAccounts.length > 0) {
      dispatch(
        Analytics.track(
          'Bill Pay - Connected Bill',
          getBillAccountEventParamsForMultipleBills(newAccounts),
        ),
      );
    }
    navigation.popToTop();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const fetchMethodEntityIdIfNeeded = async () => {
    if (user?.methodEntityId && user?.methodVerified) {
      return user;
    }
    return dispatch(BitPayIdEffects.startFetchBasicInfo(apiToken))
      .then(updatedUser => updatedUser)
      .catch(() => user);
  };

  const handleNavigationStateChange = (event: any) => {
    if (event.url.startsWith('methodelements://')) {
      const searchParams = new URLSearchParams(`?${event.url.split('?')[1]}`);
      const params = Object.fromEntries(searchParams);
      const op = searchParams.get('op');
      setPublicAccountToken(params.public_account_token || publicAccountToken);
      switch (op) {
        case 'open':
          dispatch(dismissOnGoingProcessModal());
          break;
        case 'exit':
          refreshAccountsAndExit();
          break;
        case 'success':
          break;
        default:
      }

      return false;
    }

    return true;
  };
  return (
    <>
      {isWebViewShown && token ? (
        <WebView
          style={{marginTop: Platform.OS === 'android' ? insets.top : 0}}
          source={{
            uri: `https://elements.${METHOD_ENVS[appNetwork]}.methodfi.com/?token=${token}`,
          }}
          originWhitelist={['https://*', 'methodelements://*']}
          onShouldStartLoadWithRequest={handleNavigationStateChange}
          onError={_ => {
            setIsWebViewShown(false);
            setTimeout(() => {
              setIsWebViewShown(true);
            }, 1000);
          }}
        />
      ) : null}
    </>
  );
};

export default ConnectBills;
