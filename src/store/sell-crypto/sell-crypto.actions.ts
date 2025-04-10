import {SellCryptoActionType, SellCryptoActionTypes} from './sell-crypto.types';
import {
  MoonpaySellOrderData,
  MoonpaySellIncomingData,
} from './models/moonpay-sell.models';
import {
  SimplexSellIncomingData,
  SimplexSellOrderData,
} from './models/simplex-sell.models';
import {
  RampSellIncomingData,
  RampSellOrderData,
} from './models/ramp-sell.models';

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

export const successSellOrderRamp = (payload: {
  rampSellOrderData: RampSellOrderData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.SUCCESS_SELL_ORDER_RAMP,
  payload,
});

export const updateSellOrderRamp = (payload: {
  rampSellIncomingData: RampSellIncomingData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.UPDATE_SELL_ORDER_RAMP,
  payload,
});

export const removeSellOrderRamp = (payload: {
  rampExternalId: string;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.REMOVE_SELL_ORDER_RAMP,
  payload,
});

export const successSellOrderSimplex = (payload: {
  simplexSellOrderData: SimplexSellOrderData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.SUCCESS_SELL_ORDER_SIMPLEX,
  payload,
});

export const updateSellOrderSimplex = (payload: {
  simplexSellIncomingData: SimplexSellIncomingData;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.UPDATE_SELL_ORDER_SIMPLEX,
  payload,
});

export const removeSellOrderSimplex = (payload: {
  simplexExternalId: string;
}): SellCryptoActionType => ({
  type: SellCryptoActionTypes.REMOVE_SELL_ORDER_SIMPLEX,
  payload,
});
