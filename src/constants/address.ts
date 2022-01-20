import {BwcProvider} from '../lib/bwc';

const BWC = BwcProvider.getInstance();

export const ValidateAddress = (str: string, coin: string, network: string) => {
  switch (coin) {
    case 'btc':
      const address = BWC.getBitcore().Address;
      return !!address.isValid(str, network);
    case 'bch':
      const addressCash = BWC.getBitcoreCash().Address;
      return !!addressCash.isValid(str, network);
    case 'doge':
      const addressDoge = BWC.getBitcoreDoge().Address;
      return !!addressDoge.isValid(str, network);
    case 'ltc':
      const addressLtc = BWC.getBitcoreLtc().Address;
      return !!addressLtc.isValid(str, network);
    case 'eth':
    case 'xrp':
      const {Validation} = BWC.getCore();
      return !!Validation.validateAddress(coin.toUpperCase(), network, str);
    default:
      return false;
  }
};

export const getLegacyBchAddressFormat = (addr: string): string => {
  const a = BWC.getBitcoreCash().Address(addr).toObject();
  return BWC.getBitcore().Address.fromObject(a).toString();
};
