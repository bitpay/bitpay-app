import {SellCryptoActionType, SellCryptoActionTypes} from './sell-crypto.types';
import {
  MoonpaySellOrderData,
  MoonpaySellIncomingData,
} from './sell-crypto.models';

export const successSellOrderMoonpay = (payload: {
  moonpaySellOrderData: MoonpaySellOrderData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.SUCCESS_SELL_ORDER_MOONPAY,
  payload,
});

export const updateSellOrderMoonpay = (payload: {
  moonpaySellIncomingData: MoonpaySellIncomingData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.UPDATE_SELL_ORDER_MOONPAY,
  payload,
});

export const removeSellOrderMoonpay = (payload: {
  externalId: string;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.REMOVE_SELL_ORDER_MOONPAY,
  payload,
});
