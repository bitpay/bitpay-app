import {
  MoonpaySellOrderData,
  MoonpaySellIncomingData,
} from './sell-crypto.models';

export enum SellCryptoActionTypes {
  SUCCESS_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/SUCCESS_SELL_ORDER_MOONPAY',
  UPDATE_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/UPDATE_SELL_ORDER_MOONPAY',
  REMOVE_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/REMOVE_SELL_ORDER_MOONPAY',
}

interface successSellOrderMoonpay {
  type: typeof SellCryptoActionTypes.SUCCESS_SELL_ORDER_MOONPAY;
  payload: {
    moonpaySellOrderData: MoonpaySellOrderData;
  };
}

interface updateSellOrderMoonpay {
  type: typeof SellCryptoActionTypes.UPDATE_SELL_ORDER_MOONPAY;
  payload: {
    moonpaySellIncomingData: MoonpaySellIncomingData;
  };
}

interface removeSellOrderMoonpay {
  type: typeof SellCryptoActionTypes.REMOVE_SELL_ORDER_MOONPAY;
  payload: {
    externalId: string;
  };
}

export type SellCryptoActionType =
  | successSellOrderMoonpay
  | updateSellOrderMoonpay
  | removeSellOrderMoonpay;
