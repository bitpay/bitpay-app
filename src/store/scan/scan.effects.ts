import {WalletScreens} from '../../navigation/wallet/WalletStack';
import {navigationRef} from '../../Root';
import {Effect} from '../index';
import {GetPayProOptions} from '../wallet/effects/paypro/paypro';
import {GetPayProUrl} from '../wallet/utils/decode-uri';
import {
  IsValidPayPro,
  isValidWalletConnectUri,
  isValidSimplexUri,
  isValidWyreUri,
} from '../wallet/utils/validations';
import {APP_NAME} from '../../constants/config';
import {BuyCryptoActions} from '../buy-crypto';
import {
  simplexIncomingData,
  wyrePaymentData,
} from '../buy-crypto/buy-crypto.models';
import analytics from '@segment/analytics-react-native';
import {LogActions} from '../log';
import {startOnGoingProcessModal} from '../app/app.effects';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {dismissOnGoingProcessModal} from '../app/app.actions';
import {sleep} from '../../utils/helper-methods';

export const incomingData =
  (data: string): Effect<Promise<void>> =>
  async dispatch => {
    // TODO incoming data handler
    if (IsValidPayPro(data)) {
      dispatch(
        startOnGoingProcessModal(
          OnGoingProcessMessages.FETCHING_PAYMENT_OPTIONS,
        ),
      );
      const payProUrl = GetPayProUrl(data);
      try {
        const payProOptions = await GetPayProOptions(payProUrl);
        dispatch(dismissOnGoingProcessModal());
        navigationRef.navigate('Wallet', {
          screen: WalletScreens.PAY_PRO_CONFIRM,
          params: {
            payProOptions,
          },
        });
      } catch (err) {
        dispatch(dismissOnGoingProcessModal());
        await sleep(300);
        throw err;
      }
    } else if (isValidWalletConnectUri(data)) {
      navigationRef.navigate('WalletConnect', {
        screen: 'Root',
        params: {
          uri: data,
        },
      });
    } else if (isValidSimplexUri(data)) {
      // Simplex
      dispatch(handleSimplexUri(data));
    } else if (isValidWyreUri(data)) {
      // Wyre
      dispatch(handleWyreUri(data));
    }
  };

const getParameterByName = (name: string, url: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) {
    return undefined;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

const handleSimplexUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Simplex URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const paymentId = getParameterByName('paymentId', res);
    if (!paymentId) {
      dispatch(LogActions.warn('No paymentId present. Do not redir'));
      return;
    }

    const success = getParameterByName('success', res);
    const quoteId = getParameterByName('quoteId', res);
    const userId = getParameterByName('userId', res);

    const stateParams: simplexIncomingData = {
      success,
      paymentId,
      quoteId,
      userId,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestSimplex({
        simplexIncomingData: stateParams,
      }),
    );

    const {APP, BITPAY_ID, BUY_CRYPTO} = getState();
    const user = BITPAY_ID.user[APP.network];
    const order = BUY_CRYPTO.simplex[paymentId];

    analytics.track('BitPay App - Successfully Complete Crypto Purchase ', {
      exchange: 'simplex',
      walletId: userId || '',
      fiatAmount: order?.fiat_total_amount || '',
      fiatCurrency: order?.fiat_total_amount_currency || '',
      coin: order?.coin || '',
      appUser: user?.eid || '',
    });

    navigationRef.navigate('ExternalServicesSettings', {
      screen: 'SimplexSettings',
      params: {
        incomingPaymentRequest: stateParams,
      },
    });
  };

const handleWyreUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Wyre URL: ' + data));

    if (data.indexOf(APP_NAME + '://wyreError') >= 0) {
      navigationRef.navigate('ExternalServicesSettings', {
        screen: 'WyreSettings',
        params: {
          paymentRequestError: true,
        },
      });
      return;
    }

    if (data === APP_NAME + '://wyre') {
      return;
    }
    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const orderId = getParameterByName('id', res);
    if (!orderId) {
      dispatch(LogActions.warn('No orderId present. Do not redir'));
      return;
    }

    const walletId = getParameterByName('walletId', res);
    const destCurrency = getParameterByName('destCurrency', res);
    const sourceCurrency = getParameterByName('sourceCurrency', res);
    const sourceAmount = getParameterByName('sourceAmount', res);

    const stateParams: wyrePaymentData = {
      orderId,
      transferId: getParameterByName('transferId', res),
      owner: getParameterByName('owner', res),
      accountId: getParameterByName('accountId', res),
      walletId,
      dest: getParameterByName('dest', res),
      destAmount: getParameterByName('destAmount', res),
      destCurrency,
      purchaseAmount: getParameterByName('purchaseAmount', res),
      sourceAmount,
      sourceCurrency,
      status: getParameterByName('status', res),
      createdAt: getParameterByName('createdAt', res),
      paymentMethodName: getParameterByName('paymentMethodName', res),
      blockchainNetworkTx: getParameterByName('blockchainNetworkTx', res),
      env: __DEV__ ? 'dev' : 'prod',
      created_on: Date.now(),
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestWyre({
        wyrePaymentData: stateParams,
      }),
    );

    const {APP, BITPAY_ID} = getState();
    const user = BITPAY_ID.user[APP.network];

    analytics.track('BitPay App - Successfully Complete Crypto Purchase ', {
      exchange: 'wyre',
      walletId: walletId || '',
      fiatAmount: sourceAmount || '',
      fiatCurrency: sourceCurrency || '',
      coin: destCurrency || '',
      appUser: user?.eid || '',
    });

    navigationRef.navigate('ExternalServicesSettings', {
      screen: 'WyreSettings',
      params: {
        incomingPaymentRequest: stateParams,
      },
    });
  };
