import React, {useEffect, useState} from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import WebView from 'react-native-webview';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BillStackParamList} from '../BillStack';
import {ShopEffects} from '../../../../../store/shop';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {startOnGoingProcessModal} from '../../../../../store/app/app.effects';
import {dismissOnGoingProcessModal} from '../../../../../store/app/app.actions';
import {APP_NETWORK, METHOD_ENV} from '../../../../../constants/config';
import {AppActions} from '../../../../../store/app';
import {CustomErrorMessage} from '../../../../wallet/components/ErrorMessages';
import {useTranslation} from 'react-i18next';
import {BitPayIdEffects} from '../../../../../store/bitpay-id';

const ConnectBills = ({
  navigation,
}: StackScreenProps<BillStackParamList, 'ConnectBills'>) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const [isWebViewShown, setIsWebViewShown] = useState(true);
  const [token, setToken] = useState('');
  const [exiting, setExiting] = useState(false);
  const apiToken = useAppSelector(
    ({BITPAY_ID}) => BITPAY_ID.apiToken[APP_NETWORK],
  );

  useEffect(() => {
    dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const getToken = async () => {
      const authElementToken = await dispatch(
        ShopEffects.startGetAuthElementToken(),
      );
      setToken(authElementToken);
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
      return;
    }
    setExiting(true);
    dispatch(dismissOnGoingProcessModal());
    await Promise.all([
      dispatch(ShopEffects.startGetBillPayAccounts()),
      dispatch(BitPayIdEffects.startFetchBasicInfo(apiToken)),
    ]);
    navigation.pop();
  };

  const handleNavigationStateChange = (event: any) => {
    if (event.url.startsWith('methodelements://')) {
      const searchParams = new URLSearchParams(`?${event.url.split('?')[1]}`);
      const params = Object.fromEntries(searchParams);
      const op = searchParams.get('op');
      let response = {...params};

      if (params.accounts) {
        response.accounts = JSON.parse(params.accounts);
      }

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
          style={{marginTop: insets.top}}
          source={{
            uri: `https://elements.${METHOD_ENV}.methodfi.com/?token=${token}`,
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
