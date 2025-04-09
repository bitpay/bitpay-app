import {
  MoonpaySellOrderData,
  MoonpaySellIncomingData,
} from './models/moonpay-sell.models';
import {
  RampSellIncomingData,
  RampSellOrderData,
} from './models/ramp-sell.models';
import {
  SimplexSellIncomingData,
  SimplexSellOrderData,
} from './models/simplex-sell.models';

export enum SellCryptoActionTypes {
  SUCCESS_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/SUCCESS_SELL_ORDER_MOONPAY',
  UPDATE_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/UPDATE_SELL_ORDER_MOONPAY',
  REMOVE_SELL_ORDER_MOONPAY = 'SELL_CRYPTO/REMOVE_SELL_ORDER_MOONPAY',
  SUCCESS_SELL_ORDER_RAMP = 'SELL_CRYPTO/SUCCESS_SELL_ORDER_RAMP',
  UPDATE_SELL_ORDER_RAMP = 'SELL_CRYPTO/UPDATE_SELL_ORDER_RAMP',
  REMOVE_SELL_ORDER_RAMP = 'SELL_CRYPTO/REMOVE_SELL_ORDER_RAMP',
  SUCCESS_SELL_ORDER_SIMPLEX = 'SELL_CRYPTO/SUCCESS_SELL_ORDER_SIMPLEX',
  UPDATE_SELL_ORDER_SIMPLEX = 'SELL_CRYPTO/UPDATE_SELL_ORDER_SIMPLEX',
  REMOVE_SELL_ORDER_SIMPLEX = 'SELL_CRYPTO/REMOVE_SELL_ORDER_SIMPLEX',
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

interface successSellOrderRamp {
  type: typeof SellCryptoActionTypes.SUCCESS_SELL_ORDER_RAMP;
  payload: {
    rampSellOrderData: RampSellOrderData;
  };
}

interface updateSellOrderRamp {
  type: typeof SellCryptoActionTypes.UPDATE_SELL_ORDER_RAMP;
  payload: {
    rampSellIncomingData: RampSellIncomingData;
  };
}

interface removeSellOrderRamp {
  type: typeof SellCryptoActionTypes.REMOVE_SELL_ORDER_RAMP;
  payload: {
    rampExternalId: string;
  };
}

interface successSellOrderSimplex {
  type: typeof SellCryptoActionTypes.SUCCESS_SELL_ORDER_SIMPLEX;
  payload: {
    simplexSellOrderData: SimplexSellOrderData;
  };
}

interface updateSellOrderSimplex {
  type: typeof SellCryptoActionTypes.UPDATE_SELL_ORDER_SIMPLEX;
  payload: {
    simplexSellIncomingData: SimplexSellIncomingData;
  };
}

interface removeSellOrderSimplex {
  type: typeof SellCryptoActionTypes.REMOVE_SELL_ORDER_SIMPLEX;
  payload: {
    simplexExternalId: string;
  };
}

export type SellCryptoActionType =
  | successSellOrderMoonpay
  | updateSellOrderMoonpay
  | removeSellOrderMoonpay
  | successSellOrderRamp
  | updateSellOrderRamp
  | removeSellOrderRamp
  | successSellOrderSimplex
  | updateSellOrderSimplex
  | removeSellOrderSimplex;
