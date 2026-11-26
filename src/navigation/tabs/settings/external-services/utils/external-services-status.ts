import {Effect} from '../../../../../store';
import {logManager} from '../../../../../managers/LogManager';
import {Key, Wallet} from '../../../../../store/wallet/wallet.models';
import {BuyCryptoActions} from '../../../../../store/buy-crypto';
import {SellCryptoActions} from '../../../../../store/sell-crypto';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {Analytics} from '../../../../../store/analytics/analytics.effects';
import {
  BanxaGetOrderDetailsRequestData,
  BanxaIncomingData,
  BanxaOrderDetailsData,
  BanxaPaymentData,
  MoonpayPaymentData,
  MoonpayTransactionDetailsEmbeddedData,
  MoonpayTransactionStage,
  SardineGetOrderDetailsRequestData,
  SardineIncomingData,
  SardinePaymentData,
  TransakAccessTokenData,
  TransakGetOrderDetailsRequestData,
  TransakIncomingData,
  TransakPaymentData,
} from '../../../../../store/buy-crypto/buy-crypto.models';
import {
  MoonpaySellOrderData,
  MoonpaySellTransactionDetails,
} from '../../../../../store/sell-crypto/models/moonpay-sell.models';
import {
  changellyTxData,
  thorswapTxData,
} from '../../../../../store/swap-crypto/swap-crypto.models';
import {
  ThorswapGetSwapTxData,
  ThorswapGetSwapTxRequestData,
  ThorswapTrackingStatus,
} from '../../../../../store/swap-crypto/models/thorswap.models';
import {
  getMoonpayEmbeddedCredentials,
  isMoonpayEmbeddedCredentialsValid,
} from '../../../../../store/buy-crypto/buy-crypto.effects';
import {
  moonpayGetSellTransactionDetails,
  moonpayGetTransactionDetailsEmbedded,
} from '../../../../../store/buy-crypto/effects/moonpay/moonpay';
import {banxaEnv} from '../../../../services/buy-crypto/utils/banxa-utils';
import {sardineEnv} from '../../../../services/buy-crypto/utils/sardine-utils';
import {transakEnv} from '../../../../services/buy-crypto/utils/transak-utils';
import {moonpaySellEnv} from '../../../../services/sell-crypto/utils/moonpay-sell-utils';
import {generateMessageId} from '../../../../services/swap-crypto/utils/changelly-utils';
import {thorswapEnv} from '../../../../services/swap-crypto/utils/thorswap-utils';
import {cloneDeep} from '../../../../../utils/object';

/*
 * Status refreshers for the external services history.
 *
 * Each one asks the provider for the latest state of a saved order, copies the
 * changes onto the object it receives and saves them to the store. The details
 * screens pass the order they show, so the screen sees the new values; the
 * history lists pass a copy of every order whose status can still change, so
 * the list shows the current status without opening each order.
 *
 * Without `force`, orders that are already in a final state are skipped.
 */

const walletIsSupported = (wallet: Wallet): boolean =>
  !!(wallet.credentials && wallet.isComplete());

const getAnySupportedWallet = (keys: {[key: string]: Key}) =>
  Object.values(keys)
    .filter(key => key.backupComplete)
    .flatMap(key => key.wallets ?? [])
    .find(walletIsSupported);

const errorToString = (err: unknown) =>
  err instanceof Error ? err.message : JSON.stringify(err);

/**
 * Refreshes the given orders one after the other. They go in sequence so that
 * a long history does not send a burst of requests to BWS at once.
 */
export const refreshPendingOrders = async <T>(
  orders: T[],
  refresh: (order: T) => Promise<unknown>,
) => {
  for (const order of orders) {
    await refresh(order);
  }
};

// ---------------------------------------------------------------------------
// Changelly
// ---------------------------------------------------------------------------

export const CHANGELLY_FINAL_STATUSES = [
  'finished',
  'refunded',
  'failed',
  'expired',
];

/** Returns true when the swap was updated. */
export const changellyRefreshTxStatus =
  (swapTx: changellyTxData, force?: boolean): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (CHANGELLY_FINAL_STATUSES.includes(swapTx.status) && !force) {
      return false;
    }

    const selectedWallet = getAnySupportedWallet(getState().WALLET.keys);
    if (!selectedWallet) {
      logManager.error('No supported wallet found for Changelly status');
      return false;
    }

    try {
      const reqData = {
        id: generateMessageId(),
        exchangeTxId: swapTx.exchangeTxId,
        useV2: true,
      };
      logManager.debug(
        'Making a Changelly request with body: ' + JSON.stringify(reqData),
      );
      const _raw = await selectedWallet.changellyGetStatus(reqData);
      const data = _raw?.body ?? _raw;

      if (data?.error) {
        logManager.error('Changelly getStatus Error: ' + data.error.message);
        return false;
      }
      if (data?.result && data.result != swapTx.status) {
        logManager.debug(
          `Updating Changelly status of ${swapTx.exchangeTxId} to: ${data.result}`,
        );
        swapTx.status = data.result;
        dispatch(
          SwapCryptoActions.successTxChangelly({
            changellyTxData: {...swapTx},
          }),
        );
        logManager.debug('Saved swap with: ' + JSON.stringify(swapTx));
        return true;
      }
    } catch (err) {
      logManager.error('Changelly getStatus Error: ' + errorToString(err));
    }
    return false;
  };

// ---------------------------------------------------------------------------
// Thorswap
// ---------------------------------------------------------------------------

const thorswapCompareAmounts = (
  amountTo: number,
  toAmount: string | number,
) => {
  if (typeof toAmount === 'number') {
    toAmount = toAmount.toString();
  }

  const amountToString = amountTo.toString();
  const decimalIndex = amountToString.indexOf('.');

  const decimalPlaces =
    decimalIndex === -1 ? 0 : amountToString.length - decimalIndex - 1;

  const roundedAmountTo = parseFloat(amountTo.toFixed(decimalPlaces));
  const roundedToAmount = parseFloat(
    parseFloat(toAmount).toFixed(decimalPlaces),
  );

  return roundedAmountTo === roundedToAmount;
};

export interface ThorswapRefreshResult {
  updated: boolean;
  /** Set when Thorswap answered without a result. */
  error?: {
    /** The provider's own message, when it sent a readable one. */
    message?: string;
  };
}

export const thorswapRefreshTxStatus =
  (
    swapTx: thorswapTxData,
    force?: boolean,
  ): Effect<Promise<ThorswapRefreshResult>> =>
  async (dispatch, getState) => {
    if (
      [
        ThorswapTrackingStatus.completed,
        ThorswapTrackingStatus.success,
      ].includes(swapTx.status) &&
      !force
    ) {
      return {updated: false};
    }

    const reqData: ThorswapGetSwapTxRequestData = {
      env: thorswapEnv,
      hash: swapTx.txHash,
    };

    const selectedWallet = getAnySupportedWallet(getState().WALLET.keys);
    if (!selectedWallet) {
      logManager.error('No supported wallet found for Thorswap status');
      return {updated: false};
    }

    try {
      const _raw = await selectedWallet.thorswapGetSwapTx(reqData);
      const swapTxData: ThorswapGetSwapTxData = _raw?.body ?? _raw;
      let shouldUpdate = false;
      if (swapTxData?.result) {
        if (
          swapTxData.result.legs &&
          swapTxData.result.legs.length === 1 &&
          swapTxData.result.legs[0].toAmount &&
          !thorswapCompareAmounts(
            swapTx.amountTo,
            swapTxData.result.legs[0].toAmount,
          )
        ) {
          logManager.debug(
            'Updating amountTo to: ' + swapTxData.result.legs[0].toAmount,
          );
          swapTx.amountTo = Number(swapTxData.result.legs[0].toAmount);
          shouldUpdate = true;
        }
        if (swapTxData.status && swapTxData.status != swapTx.status) {
          logManager.debug('Updating status to: ' + swapTxData.status);
          swapTx.status = swapTxData.status;
          shouldUpdate = true;
        }
        if (shouldUpdate) {
          dispatch(
            SwapCryptoActions.successTxThorswap({
              thorswapTxData: {...swapTx},
            }),
          );
          logManager.debug('Saved swap with: ' + JSON.stringify(swapTx));
        }
        return {updated: shouldUpdate};
      }

      if (!swapTxData) {
        logManager.error('Thorswap error: No swapTxData received');
        return {updated: false};
      }
      if (swapTxData.message && typeof swapTxData.message === 'string') {
        logManager.error('Thorswap error: ' + swapTxData.message);
      }
      if (swapTxData.error && typeof swapTxData.error === 'string') {
        logManager.error('Thorswap error: ' + swapTxData.error);
      }
      if (
        swapTxData.error?.message &&
        typeof swapTxData.error.message === 'string'
      ) {
        logManager.error('Thorswap error: ' + swapTxData.error.message);
      }
      if (swapTxData.errors) {
        logManager.error(JSON.stringify(swapTxData.errors));
      }
      return {
        updated: false,
        error: {
          message:
            swapTxData.code && swapTxData.type && swapTxData.message
              ? swapTxData.message
              : undefined,
        },
      };
    } catch (err) {
      logManager.error('Thorswap getStatus Error: ' + errorToString(err));
      return {updated: false};
    }
  };

// ---------------------------------------------------------------------------
// Banxa
// ---------------------------------------------------------------------------

export const banxaRefreshOrderDetails =
  (
    paymentRequest: BanxaPaymentData,
    force?: boolean,
  ): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (
      (['cancelled', 'complete', 'declined', 'expired', 'refunded'].includes(
        paymentRequest.status,
      ) ||
        !paymentRequest.order_id) &&
      !force
    ) {
      return false;
    }

    const selectedWallet = getAnySupportedWallet(getState().WALLET.keys);
    if (!selectedWallet) {
      logManager.error('No supported wallet found for Banxa order details');
      return false;
    }

    const requestData: BanxaGetOrderDetailsRequestData = {
      env: banxaEnv,
      order_id: paymentRequest.order_id,
    };

    try {
      const _data = await selectedWallet.banxaGetOrder(requestData);
      const data: BanxaOrderDetailsData | undefined = _data?.body ?? _data;

      if (!data?.data?.order) {
        logManager.error(
          'Banxa getOrderDetails Error: ' + (data?.message ?? 'No data'),
        );
        return false;
      }
      const orderData = data.data.order;
      let shouldUpdate = false;

      if (
        orderData.coin_amount &&
        typeof orderData.coin_amount === 'number' &&
        orderData.coin_amount > 0 &&
        orderData.coin_amount != paymentRequest.crypto_amount
      ) {
        logManager.debug(
          `Updating crypto_amount from: ${paymentRequest.crypto_amount} to: ${orderData.coin_amount}`,
        );
        paymentRequest.crypto_amount = orderData.coin_amount;
        shouldUpdate = true;
      }
      if (
        orderData.fiat_amount &&
        typeof orderData.fiat_amount === 'number' &&
        orderData.fiat_amount > 0 &&
        orderData.fiat_amount != paymentRequest.fiat_total_amount
      ) {
        logManager.debug(
          `Updating fiat_total_amount from: ${paymentRequest.fiat_total_amount} to: ${orderData.fiat_amount}`,
        );
        paymentRequest.fiat_total_amount = orderData.fiat_amount;
        let fiatBaseAmount: number = orderData.fiat_amount;
        if (
          orderData.payment_fee &&
          typeof orderData.payment_fee === 'number' &&
          orderData.payment_fee >= 0
        ) {
          fiatBaseAmount = orderData.fiat_amount - orderData.payment_fee;
          paymentRequest.fiat_base_amount = fiatBaseAmount;
        }
        if (
          orderData.network_fee &&
          typeof orderData.network_fee === 'number' &&
          orderData.network_fee >= 0
        ) {
          fiatBaseAmount = orderData.fiat_amount - orderData.network_fee;
          paymentRequest.fiat_base_amount = fiatBaseAmount;
        }
        logManager.debug(
          `Updating fiat_base_amount from: ${paymentRequest.fiat_base_amount} to: ${fiatBaseAmount}`,
        );
        shouldUpdate = true;
      }
      if (
        orderData.coin_code &&
        paymentRequest.coin !== orderData.coin_code.toUpperCase()
      ) {
        logManager.debug(
          `Updating coin from: ${
            paymentRequest.coin
          } to: ${orderData.coin_code.toUpperCase()}`,
        );
        paymentRequest.coin = orderData.coin_code.toUpperCase();
        shouldUpdate = true;
      }
      if (
        orderData.blockchain?.code &&
        paymentRequest.chain.toLowerCase() !==
          orderData.blockchain?.code.toLowerCase()
      ) {
        logManager.debug(
          `Updating chain from: ${
            paymentRequest.chain
          } to: ${orderData.blockchain.code.toLowerCase()}`,
        );
        paymentRequest.chain = orderData.blockchain.code.toLowerCase();
        shouldUpdate = true;
      }
      if (
        orderData.fiat_code &&
        paymentRequest.fiat_total_amount_currency !==
          orderData.fiat_code.toUpperCase()
      ) {
        logManager.debug(
          `Updating chain fiat_total_amount_currency: ${
            paymentRequest.fiat_total_amount_currency
          } to: ${orderData.fiat_code.toUpperCase()}`,
        );
        paymentRequest.fiat_total_amount_currency =
          orderData.fiat_code.toUpperCase();
        shouldUpdate = true;
      }
      if (
        orderData.ref &&
        (!paymentRequest.ref || paymentRequest.ref !== orderData.ref)
      ) {
        logManager.debug(
          `Updating ref from: ${paymentRequest.ref} to: ${orderData.ref}`,
        );
        paymentRequest.ref = orderData.ref;
        shouldUpdate = true;
      }
      if (
        orderData.tx_hash &&
        (!paymentRequest.transaction_id ||
          paymentRequest.transaction_id !== orderData.tx_hash)
      ) {
        logManager.debug(
          `Updating transaction_id from: ${paymentRequest.transaction_id} to: ${orderData.tx_hash}`,
        );
        paymentRequest.transaction_id = orderData.tx_hash;
        shouldUpdate = true;
      }
      if (
        orderData.status &&
        (!paymentRequest.status || paymentRequest.status !== orderData.status)
      ) {
        logManager.debug(
          `Updating status from: ${paymentRequest.status} to: ${orderData.status}`,
        );
        paymentRequest.status = orderData.status!;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const stateParams: BanxaIncomingData = {
          banxaExternalId: paymentRequest.external_id,
          banxaOrderId: paymentRequest.order_id,
          status: paymentRequest.status,
          cryptoAmount: paymentRequest.crypto_amount,
          fiatTotalAmount: paymentRequest.fiat_total_amount,
          fiatBaseAmount: paymentRequest.fiat_base_amount,
          coin: paymentRequest.coin,
          chain: paymentRequest.chain,
          fiatTotalAmountCurrency: paymentRequest.fiat_total_amount_currency,
          ref: paymentRequest.ref,
          transactionId: paymentRequest.transaction_id,
        };
        dispatch(
          BuyCryptoActions.updatePaymentRequestBanxa({
            banxaIncomingData: stateParams,
          }),
        );
        logManager.debug(
          'Saved payment request with: ' + JSON.stringify(paymentRequest),
        );
      }
      return shouldUpdate;
    } catch (err) {
      logManager.error('Banxa getOrderDetails Error: ' + JSON.stringify(err));
      return false;
    }
  };

// ---------------------------------------------------------------------------
// Sardine
// ---------------------------------------------------------------------------

export const sardineRefreshOrderDetails =
  (
    paymentRequest: SardinePaymentData,
    force?: boolean,
  ): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (
      (['Complete', 'Declined', 'Expired'].includes(paymentRequest.status) ||
        !paymentRequest.order_id) &&
      !force
    ) {
      return false;
    }

    const selectedWallet = getAnySupportedWallet(getState().WALLET.keys);
    if (!selectedWallet) {
      logManager.error('No supported wallet found for Sardine order details');
      return false;
    }

    const requestData: SardineGetOrderDetailsRequestData = {
      env: sardineEnv,
      orderId: paymentRequest.order_id,
    };

    try {
      const _rawData = await selectedWallet.sardineGetOrdersDetails(
        requestData,
      );
      const rawData = _rawData?.body ?? _rawData;
      const data = Array.isArray(rawData) ? rawData[0] : rawData;

      if (!data) {
        logManager.error('Sardine getOrderDetails Error: No data');
        return false;
      }
      let shouldUpdate = false;
      if (
        data.data?.quantity &&
        typeof data.data.quantity === 'number' &&
        data.data.quantity > 0 &&
        data.data.quantity != paymentRequest.crypto_amount
      ) {
        logManager.debug(
          `Updating crypto_amount from: ${paymentRequest.crypto_amount} to: ${data.data.quantity}`,
        );
        paymentRequest.crypto_amount = data.data.quantity;
        shouldUpdate = true;
      }
      if (!paymentRequest.order_id && data.id) {
        paymentRequest.order_id = data.id;
        shouldUpdate = true;
      }
      if (data.withdrawal?.txHash) {
        paymentRequest.transaction_id = data.withdrawal.txHash;
        shouldUpdate = true;
      }
      if (
        data.status &&
        (!paymentRequest.status || data.status != paymentRequest.status)
      ) {
        logManager.debug(
          `Updating status from: ${paymentRequest.status} to: ${data.status}`,
        );
        paymentRequest.status = data.status;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const stateParams: SardineIncomingData = {
          sardineExternalId: paymentRequest.external_id,
          status: paymentRequest.status,
          cryptoAmount: paymentRequest.crypto_amount,
          transactionId: paymentRequest.transaction_id,
        };
        dispatch(
          BuyCryptoActions.updatePaymentRequestSardine({
            sardineIncomingData: stateParams,
          }),
        );
        logManager.debug(
          'Saved payment request with: ' + JSON.stringify(paymentRequest),
        );
      }
      return shouldUpdate;
    } catch (err) {
      logManager.error('Sardine getOrderDetails Error: ' + JSON.stringify(err));
      return false;
    }
  };

// ---------------------------------------------------------------------------
// Transak
// ---------------------------------------------------------------------------

export const transakRefreshOrderDetails =
  (
    paymentRequest: TransakPaymentData,
    force?: boolean,
  ): Effect<Promise<boolean>> =>
  async (dispatch, getState) => {
    if (
      ['COMPLETED', 'CANCELLED', 'FAILED', 'REFUNDED', 'EXPIRED'].includes(
        paymentRequest.status,
      ) &&
      !force
    ) {
      return false;
    }

    if (!paymentRequest.order_id) {
      logManager.debug('Transak getOrderDetails Warn: No order_id');
      return false;
    }

    const allKeys = getState().WALLET.keys;
    // BWS only returns an order to the wallet that bought it (saved as user_id).
    const selectedWallet =
      Object.values(allKeys)
        .flatMap(key => key.wallets ?? [])
        .find(
          wallet =>
            wallet.id === paymentRequest.user_id && walletIsSupported(wallet),
        ) ?? getAnySupportedWallet(allKeys);

    if (!selectedWallet) {
      logManager.error('No supported wallet found for Transak order details');
      return false;
    }

    // Read on every call: a previous order in the same refresh may have just
    // saved a new token.
    const accessTokenTransak: TransakAccessTokenData | undefined =
      getState().BUY_CRYPTO.tokens?.transak?.[transakEnv];
    // eslint-disable-next-line no-bitwise -- `| 0` truncates the seconds timestamp to an integer
    const nowTimestamp = (Date.now() / 1000) | 0;
    let _accessToken = accessTokenTransak?.accessToken;
    const _expiresAt = accessTokenTransak?.expiresAt;
    if (!_accessToken || !_expiresAt || _expiresAt < nowTimestamp) {
      try {
        if (_expiresAt && _expiresAt < nowTimestamp) {
          logManager.debug(
            'Transak access token expired. Fetching new one from TransakDetails...',
          );
        }
        const _tokenData = await selectedWallet.transakGetAccessToken({
          env: transakEnv,
        });
        const tokenData: TransakAccessTokenData | undefined =
          _tokenData?.body?.data ?? _tokenData?.body ?? _tokenData;

        if (tokenData?.accessToken) {
          logManager.debug(
            'Transak access token fetched successfully from TransakDetails.',
          );
          dispatch(
            BuyCryptoActions.updateAccessTokenTransak({
              env: transakEnv,
              ...tokenData,
            }),
          );
          _accessToken = tokenData.accessToken;
        } else {
          logManager.error(
            'Error fetching Transak access token in TransakDetails. Error: No accessToken provided',
          );
          // Continue anyway, as we can generate a new access token in the BWS if needed.
        }
      } catch (err: any) {
        let msg: string =
          'Error fetching Transak access token in TransakDetails';
        if (typeof err === 'string') {
          msg = msg + `: ${err}`;
        } else if (typeof err?.message === 'string') {
          msg = msg + `: ${err.message}`;
        }
        logManager.error(msg);
        // Continue anyway, as we can generate a new access token in the BWS if needed.
      }
    } else {
      logManager.debug('Using cached Transak access token.');
    }

    const requestData: TransakGetOrderDetailsRequestData = {
      env: transakEnv,
      orderId: paymentRequest.order_id,
      accessToken: _accessToken,
    };

    try {
      const _orderData = await selectedWallet.transakGetOrderDetails(
        requestData,
      );
      const data = _orderData?.body ?? _orderData;

      if (!data?.data) {
        logManager.error('Transak getOrderDetails Error: No data');
        return false;
      }
      const orderData = data.data;
      let shouldUpdate = false;
      if (
        orderData.cryptoAmount &&
        typeof orderData.cryptoAmount === 'number' &&
        orderData.cryptoAmount > 0 &&
        orderData.cryptoAmount != paymentRequest.crypto_amount
      ) {
        logManager.debug(
          `Updating crypto_amount from: ${paymentRequest.crypto_amount} to: ${orderData.cryptoAmount}`,
        );
        paymentRequest.crypto_amount = orderData.cryptoAmount;
        shouldUpdate = true;
      }
      if (
        orderData.fiatAmount &&
        typeof orderData.fiatAmount === 'number' &&
        orderData.fiatAmount > 0 &&
        orderData.fiatAmount != paymentRequest.fiat_total_amount
      ) {
        logManager.debug(
          `Updating fiat_total_amount from: ${paymentRequest.fiat_total_amount} to: ${orderData.fiatAmount}`,
        );
        paymentRequest.fiat_total_amount = orderData.fiatAmount;
        let fiatBaseAmount: number = paymentRequest.fiat_base_amount;
        if (
          orderData.totalFeeInFiat &&
          typeof orderData.totalFeeInFiat === 'number' &&
          orderData.totalFeeInFiat > 0
        ) {
          fiatBaseAmount =
            Number(orderData.fiatAmount) - Number(orderData.totalFeeInFiat);
          logManager.debug(
            `Updating fiat_base_amount from: ${paymentRequest.fiat_base_amount} to: ${fiatBaseAmount}`,
          );
          paymentRequest.fiat_base_amount = fiatBaseAmount;
        }
        shouldUpdate = true;
      }
      if (
        orderData.fiatCurrency &&
        paymentRequest.fiat_total_amount_currency !==
          orderData.fiatCurrency.toUpperCase()
      ) {
        logManager.debug(
          `Updating fiat_total_amount_currency from: ${
            paymentRequest.fiat_total_amount_currency
          } to: ${orderData.fiatCurrency.toUpperCase()}`,
        );
        paymentRequest.fiat_total_amount_currency =
          orderData.fiatCurrency.toUpperCase();
        shouldUpdate = true;
      }
      if (
        orderData.cryptoCurrency &&
        paymentRequest.coin !== orderData.cryptoCurrency.toUpperCase()
      ) {
        logManager.debug(
          `Updating coin from: ${
            paymentRequest.coin
          } to: ${orderData.cryptoCurrency.toUpperCase()}`,
        );
        paymentRequest.coin = cloneDeep(orderData.cryptoCurrency).toUpperCase();
        if (
          orderData.network &&
          orderData.network == 'mainnet' &&
          paymentRequest.chain !== orderData.cryptoCurrency.toLowerCase()
        ) {
          logManager.debug(
            `Updating chain from: ${
              paymentRequest.chain
            } to: ${orderData.cryptoCurrency.toLowerCase()}`,
          );
          paymentRequest.coin = orderData.network;
        }
        shouldUpdate = true;
      }
      if (
        orderData.transactionHash &&
        paymentRequest.transaction_id !== orderData.transactionHash
      ) {
        logManager.debug(
          `Updating transactionHash from: ${paymentRequest.transaction_id} to: ${orderData.transactionHash}`,
        );
        paymentRequest.transaction_id = orderData.transactionHash;
        shouldUpdate = true;
      }
      if (
        orderData.status &&
        (!paymentRequest.status || orderData.status != paymentRequest.status)
      ) {
        logManager.debug(
          `Updating status from: ${paymentRequest.status} to: ${orderData.status}`,
        );
        paymentRequest.status = orderData.status;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const stateParams: TransakIncomingData = {
          transakExternalId: paymentRequest.external_id,
          status: paymentRequest.status,
          cryptoAmount: paymentRequest.crypto_amount,
          transactionId: paymentRequest.transaction_id,
          fiatTotalAmount: paymentRequest.fiat_total_amount,
          fiatBaseAmount: paymentRequest.fiat_base_amount,
          coin: paymentRequest.coin,
          chain: paymentRequest.chain,
          fiatTotalAmountCurrency: paymentRequest.fiat_total_amount_currency,
        };
        dispatch(
          BuyCryptoActions.updatePaymentRequestTransak({
            transakIncomingData: stateParams,
          }),
        );
        logManager.debug(
          'Saved payment request with: ' + JSON.stringify(paymentRequest),
        );
      }
      return shouldUpdate;
    } catch (err) {
      logManager.error('Transak getOrderDetails Error: ' + JSON.stringify(err));
      return false;
    }
  };

// ---------------------------------------------------------------------------
// Moonpay (buy)
// ---------------------------------------------------------------------------

export interface MoonpayRefreshResult {
  /** The order is in a final state and `force` was not set. */
  skipped?: boolean;
  /**
   * An embedded purchase whose MoonPay credentials are missing or expired:
   * its status cannot be fetched until the user connects again.
   */
  disconnected?: boolean;
  /** The embedded purchase was fetched from MoonPay. */
  fetched?: boolean;
  /** Progress stages of an embedded SEPA purchase, as MoonPay returned them. */
  stages?: MoonpayTransactionStage[];
}

export const moonpayRefreshTransactionDetails =
  (
    paymentRequest: MoonpayPaymentData,
    force?: boolean,
  ): Effect<Promise<MoonpayRefreshResult>> =>
  async (dispatch, getState) => {
    if (paymentRequest.status === 'completed' && !force) {
      return {skipped: true};
    }

    if (paymentRequest.is_embedded && paymentRequest.transaction_id) {
      const cachedCredentials = getMoonpayEmbeddedCredentials();
      if (!isMoonpayEmbeddedCredentialsValid() || !cachedCredentials) {
        logManager.warn(
          'Moonpay getTransactionDetailsEmbedded Error: User disconnected or credentials expired',
        );
        return {disconnected: true};
      }

      const isEmbeddedSepa =
        paymentRequest.payment_method === 'sepaBankTransfer';
      try {
        const txDetails: MoonpayTransactionDetailsEmbeddedData =
          await moonpayGetTransactionDetailsEmbedded({
            transactionId: paymentRequest.transaction_id,
            accessToken: cachedCredentials.accessToken,
          });

        if (!txDetails) {
          logManager.error(
            'Moonpay moonpayGetTransactionDetailsEmbedded Error: No data returned',
          );
          return {};
        }
        if (
          !paymentRequest.status ||
          txDetails.status != paymentRequest.status
        ) {
          logManager.debug('Updating status to: ' + txDetails.status);
          paymentRequest.status = txDetails.status;
        }

        if (
          txDetails?.destination?.amount &&
          Number(txDetails.destination.amount) > 0 &&
          Number(txDetails.destination.amount) != paymentRequest.crypto_amount
        ) {
          logManager.debug(
            'Updating crypto amount to: ' + txDetails.destination.amount,
          );
          paymentRequest.crypto_amount = Number(txDetails.destination.amount);

          if (
            txDetails?.source?.amount &&
            Number(txDetails.source.amount) > 0 &&
            Number(txDetails.source.amount) != paymentRequest.fiat_total_amount
          ) {
            logManager.debug(
              'Updating fiat total amount to: ' + txDetails.source.amount,
            );
            paymentRequest.fiat_total_amount = Number(txDetails.source.amount);
          }
        }

        // The checkout stores these when the purchase is created, but the
        // deposit details are generated asynchronously, so they can still be
        // missing by then.
        if (
          !paymentRequest.sepa_details &&
          txDetails?.bankTransferDepositInfo?.reference
        ) {
          const depositInfo = txDetails.bankTransferDepositInfo;
          paymentRequest.sepa_details = {
            reference: depositInfo.reference,
            iban: depositInfo.iban,
            bic: depositInfo.bic,
            recipientName: depositInfo.recipientName,
            recipientAddress: depositInfo.recipientAddress,
            bankName: depositInfo.bankName,
            bankAddress: depositInfo.bankAddress,
          };
        }

        // A bank transfer sits at 'pending' from creation until the money
        // settles, so the stages are the only place the progress shows. They
        // are stored with the purchase so the list can tell whether the
        // customer still has to send the money.
        if (isEmbeddedSepa) {
          if (txDetails.stages) {
            paymentRequest.sepa_stages = txDetails.stages;
          }

          // The checkout cannot report the purchase: at that point nothing
          // has been paid and the transfer may still time out. It is reported
          // here, once, when MoonPay confirms the deposit arrived.
          const depositArrived =
            txDetails.status === 'completed' ||
            !!txDetails.stages?.some(
              stage =>
                stage.kind === 'waiting_payment' && stage.status === 'success',
            );
          if (depositArrived && !paymentRequest.sepa_purchase_reported) {
            dispatch(
              Analytics.track('Purchased Buy Crypto', {
                exchange: 'moonpay',
                fiatAmount: paymentRequest.fiat_total_amount || '',
                feeAmount:
                  (paymentRequest.fiat_total_amount &&
                    paymentRequest.fiat_base_amount &&
                    Number(paymentRequest.fiat_total_amount) -
                      Number(paymentRequest.fiat_base_amount)) ||
                  '',
                fiatCurrency: paymentRequest.fiat_total_amount_currency || '',
                coin: paymentRequest.coin?.toLowerCase() || '',
                chain: paymentRequest.chain?.toLowerCase() || '',
                cryptoAmount: paymentRequest.crypto_amount || '',
                paymentMethod: paymentRequest.payment_method || '',
                exchangeRate:
                  (paymentRequest.crypto_amount &&
                    paymentRequest.fiat_base_amount &&
                    Number(paymentRequest.fiat_base_amount) /
                      paymentRequest.crypto_amount) ||
                  '',
                isEmbedded: true,
              }),
            );
            paymentRequest.sepa_purchase_reported = true;
          }
        }

        const stateParams = {
          externalId: paymentRequest.external_id,
          transactionId: paymentRequest.transaction_id,
          status: paymentRequest.status,
          cryptoAmount: paymentRequest.crypto_amount,
          fiatTotalAmount: paymentRequest.fiat_total_amount,
          sepaDetails: paymentRequest.sepa_details,
          sepaStages: paymentRequest.sepa_stages,
          sepaPurchaseReported: paymentRequest.sepa_purchase_reported,
        };
        dispatch(
          BuyCryptoActions.updatePaymentRequestMoonpay({
            moonpayIncomingData: stateParams,
          }),
        );
        logManager.debug(
          'Saved payment request with: ' + JSON.stringify(paymentRequest),
        );

        return {
          fetched: true,
          stages: isEmbeddedSepa ? txDetails.stages : undefined,
        };
      } catch (err) {
        logManager.error(
          'Moonpay getTransactionDetailsEmbedded Error: ' + errorToString(err),
        );
        return {};
      }
    }

    try {
      const selectedWallet = getAnySupportedWallet(getState().WALLET.keys);
      if (!selectedWallet) {
        logManager.error(
          'No supported wallet found for Moonpay transaction details',
        );
        return {};
      }

      let body;
      if (paymentRequest.transaction_id) {
        body = {
          transactionId: paymentRequest.transaction_id,
          env: moonpaySellEnv,
        };
      } else if (paymentRequest.external_id) {
        body = {externalId: paymentRequest.external_id, env: moonpaySellEnv};
      } else {
        logManager.debug('Moonpay getTransactionDetails: Missing parameters');
        return {};
      }

      const _data = await selectedWallet.moonpayGetTransactionDetails(body);
      let data = _data?.body ?? _data;
      if (Array.isArray(data)) {
        data = data[0];
      }
      if (!data || data.type === 'NotFoundError') {
        logManager.error(
          'Moonpay getTransactionDetails Error: ' + data?.message,
        );
        return {};
      }
      if (
        !paymentRequest.transaction_id ||
        !paymentRequest.status ||
        data.status != paymentRequest.status
      ) {
        logManager.debug('Updating status to: ' + data.status);
        paymentRequest.status = data.status;
        paymentRequest.transaction_id = data.id;
        const stateParams = {
          externalId: paymentRequest.external_id,
          transactionId: paymentRequest.transaction_id,
          status: paymentRequest.status,
        };
        dispatch(
          BuyCryptoActions.updatePaymentRequestMoonpay({
            moonpayIncomingData: stateParams,
          }),
        );
        logManager.debug(
          'Saved payment request with: ' + JSON.stringify(paymentRequest),
        );
      }
    } catch (err) {
      logManager.error(
        'Moonpay getTransactionDetails Error: ' + errorToString(err),
      );
    }
    return {};
  };

// ---------------------------------------------------------------------------
// Moonpay (sell)
// ---------------------------------------------------------------------------

export const moonpayRefreshSellTransactionDetails =
  (
    sellOrder: MoonpaySellOrderData,
    force?: boolean,
  ): Effect<Promise<boolean>> =>
  async dispatch => {
    if (
      ['bitpayCanceled'].includes(sellOrder.status) ||
      (['completed', 'failed'].includes(sellOrder.status) && !force)
    ) {
      return false;
    }

    try {
      const data: MoonpaySellTransactionDetails =
        await moonpayGetSellTransactionDetails(
          sellOrder.transaction_id,
          sellOrder.external_id,
        );
      if (!data || data.type === 'NotFoundError') {
        logManager.error(
          'Moonpay getSellTransactionDetails Error: ' + data?.message,
        );
        return false;
      }

      let shouldUpdate = false;
      if (
        !sellOrder.status ||
        data.status != sellOrder.status ||
        (data.status === 'failed' && data.failureReason)
      ) {
        if (
          sellOrder.status === 'bitpayTxSent' &&
          data.status === 'waitingForDeposit'
        ) {
          logManager.debug(
            `Status not updated: Current status is: ${sellOrder.status}, but Moonpay is still waiting for deposit. Ask for support.`,
          );
        } else {
          logManager.debug(
            `Updating status from: ${sellOrder.status} to: ${data.status}`,
          );
          sellOrder.status = data.status;
          if (
            data.status === 'failed' &&
            data.failureReason &&
            sellOrder.failure_reason !== data.failureReason
          ) {
            logManager.debug(
              `Updating failure reason from: ${sellOrder.failure_reason} to: ${data.failureReason}`,
            );
            sellOrder.failure_reason = data.failureReason;
          }
          shouldUpdate = true;
        }
      }

      if (
        data.id &&
        (!sellOrder.transaction_id || sellOrder.transaction_id !== data.id)
      ) {
        logManager.debug(
          `Updating transaction_id from: ${sellOrder.transaction_id} to: ${data.id}`,
        );
        sellOrder.transaction_id = data.id;
        shouldUpdate = true;
      }

      if (!sellOrder.address_to && data.depositWallet?.walletAddress) {
        logManager.debug(
          `Updating address_to from: ${sellOrder.address_to} to: ${data.depositWallet.walletAddress}`,
        );
        sellOrder.address_to = data.depositWallet.walletAddress;
        shouldUpdate = true;
      }

      if (
        data.quoteCurrencyAmount &&
        typeof data.quoteCurrencyAmount === 'number' &&
        sellOrder.fiat_receiving_amount !== data.quoteCurrencyAmount
      ) {
        logManager.debug(
          `Updating fiat_receiving_amount from: ${sellOrder.fiat_receiving_amount} to: ${data.quoteCurrencyAmount}`,
        );
        sellOrder.fiat_receiving_amount = data.quoteCurrencyAmount;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const stateParams = {
          externalId: sellOrder.external_id,
          transactionId: sellOrder.transaction_id,
          status: sellOrder.status,
          depositWalletAddress: sellOrder.address_to,
          failureReason: sellOrder.failure_reason,
          fiatAmount: sellOrder.fiat_receiving_amount,
        };
        dispatch(
          SellCryptoActions.updateSellOrderMoonpay({
            moonpaySellIncomingData: stateParams,
          }),
        );
        logManager.debug('Saved sell order with: ' + JSON.stringify(sellOrder));
      }
      return shouldUpdate;
    } catch (err) {
      logManager.error(
        'Moonpay getSellTransactionDetails Error: ' + JSON.stringify(err),
      );
      return false;
    }
  };
