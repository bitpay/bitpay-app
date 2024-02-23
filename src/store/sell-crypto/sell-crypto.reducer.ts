import {MoonpaySellOrderData} from './sell-crypto.models';
import {SellCryptoActionType, SellCryptoActionTypes} from './sell-crypto.types';

type SellCryptoReduxPersistBlackList = string[];
export const sellCryptoReduxPersistBlackList: SellCryptoReduxPersistBlackList =
  [];

export interface SellCryptoState {
  moonpay: {[key in string]: MoonpaySellOrderData};
}

const initialState: SellCryptoState = {
  moonpay: {},
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

    default:
      return state;
  }
};
