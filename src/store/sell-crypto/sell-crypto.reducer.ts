import {MoonpaySellOrderData} from './models/moonpay-sell.models';
import {RampSellOrderData} from './models/ramp-sell.models';
import {SimplexSellOrderData} from './models/simplex-sell.models';
import {SellCryptoActionType, SellCryptoActionTypes} from './sell-crypto.types';

type SellCryptoReduxPersistBlackList = string[];
export const sellCryptoReduxPersistBlackList: SellCryptoReduxPersistBlackList =
  [];

export interface SellCryptoState {
  moonpay: {[key in string]: MoonpaySellOrderData};
  ramp: {[key in string]: RampSellOrderData};
  simplex: {[key in string]: SimplexSellOrderData};
}

const initialState: SellCryptoState = {
  moonpay: {},
  ramp: {},
  simplex: {},
};

export const sellCryptoReducer = (
  state: SellCryptoState = initialState,
  action: SellCryptoActionType,
): SellCryptoState => {
  switch (action.type) {
    case SellCryptoActionTypes.SUCCESS_SELL_ORDER_MOONPAY:
      const {moonpaySellOrderData} = action.payload;
      return {
        ...state,
        moonpay: {
          ...state.moonpay,
          [moonpaySellOrderData.external_id]: moonpaySellOrderData,
        },
      };

    case SellCryptoActionTypes.UPDATE_SELL_ORDER_MOONPAY:
      const {moonpaySellIncomingData} = action.payload;

      if (
        moonpaySellIncomingData.externalId &&
        state.moonpay[moonpaySellIncomingData.externalId]
      ) {
        state.moonpay[moonpaySellIncomingData.externalId] = {
          ...state.moonpay[moonpaySellIncomingData.externalId],
          status:
            moonpaySellIncomingData.status ??
            state.moonpay[moonpaySellIncomingData.externalId].status,
          transaction_id:
            moonpaySellIncomingData.transactionId ??
            state.moonpay[moonpaySellIncomingData.externalId].transaction_id,
          address_to:
            moonpaySellIncomingData.depositWalletAddress ??
            state.moonpay[moonpaySellIncomingData.externalId].address_to,
          crypto_amount: moonpaySellIncomingData.baseCurrencyAmount
            ? Number(moonpaySellIncomingData.baseCurrencyAmount)
            : state.moonpay[moonpaySellIncomingData.externalId].crypto_amount,
          fiat_currency:
            moonpaySellIncomingData.fiatCurrencyCode ??
            state.moonpay[moonpaySellIncomingData.externalId].fiat_currency,
          payment_method:
            moonpaySellIncomingData.paymentMethod ??
            state.moonpay[moonpaySellIncomingData.externalId].payment_method,
          tx_sent_on: moonpaySellIncomingData.txSentOn
            ? Number(moonpaySellIncomingData.txSentOn)
            : state.moonpay[moonpaySellIncomingData.externalId].tx_sent_on,
          fiat_fee_amount: moonpaySellIncomingData.totalFee
            ? Number(moonpaySellIncomingData.totalFee)
            : state.moonpay[moonpaySellIncomingData.externalId].fiat_fee_amount,
          fiat_receiving_amount: moonpaySellIncomingData.fiatAmount
            ? Number(moonpaySellIncomingData.fiatAmount)
            : state.moonpay[moonpaySellIncomingData.externalId]
                .fiat_receiving_amount,
          failure_reason:
            moonpaySellIncomingData.failureReason ??
            state.moonpay[moonpaySellIncomingData.externalId].failure_reason,
          tx_sent_id:
            moonpaySellIncomingData.txSentId ??
            state.moonpay[moonpaySellIncomingData.externalId].tx_sent_id,
        };
        return {
          ...state,
          moonpay: {
            ...state.moonpay,
            [moonpaySellIncomingData.externalId]:
              state.moonpay[moonpaySellIncomingData.externalId],
          },
        };
      } else {
        return state;
      }

    case SellCryptoActionTypes.REMOVE_SELL_ORDER_MOONPAY:
      const {externalId} = action.payload;
      const moonpaySellOrdersList = {...state.moonpay};
      delete moonpaySellOrdersList[externalId];

      return {
        ...state,
        moonpay: {...moonpaySellOrdersList},
      };

    case SellCryptoActionTypes.SUCCESS_SELL_ORDER_RAMP:
      const {rampSellOrderData} = action.payload;
      return {
        ...state,
        ramp: {
          ...state.ramp,
          [rampSellOrderData.external_id]: rampSellOrderData,
        },
      };

    case SellCryptoActionTypes.UPDATE_SELL_ORDER_RAMP:
      const {rampSellIncomingData} = action.payload;
      const rampId = rampSellIncomingData?.rampExternalId;

      if (rampId && state.ramp[rampId]) {
        const currentData = state.ramp[rampId];

        const setOrDefault = (newValue: any, defaultValue: any) =>
          newValue !== undefined ? newValue : defaultValue;

        state.ramp[rampId] = {
          ...currentData,
          status: setOrDefault(rampSellIncomingData.status, currentData.status),
          transaction_id: setOrDefault(
            rampSellIncomingData.transactionId,
            currentData.transaction_id,
          ),
          address_to: setOrDefault(
            rampSellIncomingData.depositWalletAddress,
            currentData.address_to,
          ),
          crypto_amount: setOrDefault(
            rampSellIncomingData.baseCurrencyAmount
              ? Number(rampSellIncomingData.baseCurrencyAmount)
              : undefined,
            currentData.crypto_amount,
          ),
          fiat_currency: setOrDefault(
            rampSellIncomingData.fiatCurrencyCode,
            currentData.fiat_currency,
          ),
          payment_method: setOrDefault(
            rampSellIncomingData.paymentMethod,
            currentData.payment_method,
          ),
          tx_sent_on: setOrDefault(
            rampSellIncomingData.txSentOn
              ? Number(rampSellIncomingData.txSentOn)
              : undefined,
            currentData.tx_sent_on,
          ),
          fiat_fee_amount: setOrDefault(
            rampSellIncomingData.totalFee
              ? Number(rampSellIncomingData.totalFee)
              : undefined,
            currentData.fiat_fee_amount,
          ),
          fiat_receiving_amount: setOrDefault(
            rampSellIncomingData.fiatAmount
              ? Number(rampSellIncomingData.fiatAmount)
              : undefined,
            currentData.fiat_receiving_amount,
          ),
          tx_sent_id: setOrDefault(
            rampSellIncomingData.txSentId,
            currentData.tx_sent_id,
          ),
        };

        return {
          ...state,
          ramp: {
            ...state.ramp,
            [rampId]: state.ramp[rampId],
          },
        };
      } else {
        return state;
      }

    case SellCryptoActionTypes.REMOVE_SELL_ORDER_RAMP:
      const {rampExternalId} = action.payload;
      const rampSellOrdersList = {...state.ramp};
      delete rampSellOrdersList[rampExternalId];

      return {
        ...state,
        ramp: {...rampSellOrdersList},
      };

    case SellCryptoActionTypes.SUCCESS_SELL_ORDER_SIMPLEX:
      const {simplexSellOrderData} = action.payload;
      return {
        ...state,
        simplex: {
          ...state.simplex,
          [simplexSellOrderData.external_id]: simplexSellOrderData,
        },
      };

    case SellCryptoActionTypes.UPDATE_SELL_ORDER_SIMPLEX:
      const {simplexSellIncomingData} = action.payload;
      const simplexId = simplexSellIncomingData?.simplexExternalId;

      if (simplexId && state.simplex[simplexId]) {
        const currentData = state.simplex[simplexId];

        const setOrDefault = (newValue: any, defaultValue: any) =>
          newValue !== undefined ? newValue : defaultValue;

        state.simplex[simplexId] = {
          ...currentData,
          status: setOrDefault(
            simplexSellIncomingData.status,
            currentData.status,
          ),
          transaction_id: setOrDefault(
            simplexSellIncomingData.transactionId,
            currentData.transaction_id,
          ),
          address_to: setOrDefault(
            simplexSellIncomingData.depositWalletAddress,
            currentData.address_to,
          ),
          crypto_amount: setOrDefault(
            simplexSellIncomingData.baseCurrencyAmount
              ? Number(simplexSellIncomingData.baseCurrencyAmount)
              : undefined,
            currentData.crypto_amount,
          ),
          fiat_currency: setOrDefault(
            simplexSellIncomingData.fiatCurrencyCode,
            currentData.fiat_currency,
          ),
          payment_method: setOrDefault(
            simplexSellIncomingData.paymentMethod,
            currentData.payment_method,
          ),
          tx_sent_on: setOrDefault(
            simplexSellIncomingData.txSentOn
              ? Number(simplexSellIncomingData.txSentOn)
              : undefined,
            currentData.tx_sent_on,
          ),
          fiat_fee_amount: setOrDefault(
            simplexSellIncomingData.totalFee
              ? Number(simplexSellIncomingData.totalFee)
              : undefined,
            currentData.fiat_fee_amount,
          ),
          fiat_receiving_amount: setOrDefault(
            simplexSellIncomingData.fiatAmount
              ? Number(simplexSellIncomingData.fiatAmount)
              : undefined,
            currentData.fiat_receiving_amount,
          ),
          tx_sent_id: setOrDefault(
            simplexSellIncomingData.txSentId,
            currentData.tx_sent_id,
          ),
        };

        return {
          ...state,
          simplex: {
            ...state.simplex,
            [simplexId]: state.simplex[simplexId],
          },
        };
      } else {
        return state;
      }

    case SellCryptoActionTypes.REMOVE_SELL_ORDER_SIMPLEX:
      const {simplexExternalId} = action.payload;
      const simplexSellOrdersList = {...state.simplex};
      delete simplexSellOrdersList[simplexExternalId];

      return {
        ...state,
        simplex: {...simplexSellOrdersList},
      };

    default:
      return state;
  }
};
