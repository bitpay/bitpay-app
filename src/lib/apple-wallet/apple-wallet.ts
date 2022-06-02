//TODO: update me
import {CardData} from '../../store/card/card.models';

const appleWallet = {
  available: () => new Promise(() => {}),
  startAddPaymentPass: (params: CardData) => new Promise(() => {}),
  completeAddPaymentPass: (params: any) => new Promise(() => {}),
  checkPairedDevicesBySuffix: (params: any) => new Promise(() => {}),
  graphRequest: (headers: any, json: any) => new Promise(() => {}),
};

const available = (): Promise<any> => {
  return appleWallet.available();
};

const startAddPaymentPass = (params: CardData): Promise<any> => {
  return appleWallet.startAddPaymentPass(params);
};

const completeAddPaymentPass = (params: any): Promise<any> => {
  return appleWallet.completeAddPaymentPass(params);
};

const checkPairedDevicesBySuffix = (cardSuffix: string): Promise<any> => {
  return appleWallet.checkPairedDevicesBySuffix(cardSuffix);
};

const graphRequest = (headers: any, json: any): Promise<any> => {
  return appleWallet.graphRequest(headers, json);
};

export default {
  available,
  startAddPaymentPass,
  completeAddPaymentPass,
  checkPairedDevicesBySuffix,
  graphRequest,
};
