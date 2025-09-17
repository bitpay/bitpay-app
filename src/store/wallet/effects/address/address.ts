import {KeyMethods, Wallet} from '../../wallet.models';
import {ValidateCoinAddress} from '../../utils/validations';
import {BwcProvider} from '../../../../lib/bwc';
import {ExtractCoinNetworkAddress} from '../../utils/decode-uri';
import {Effect} from '../../../index';
import {successGetReceiveAddress} from '../../wallet.actions';
import {LogActions} from '../../../log';

const BWC = BwcProvider.getInstance();

const Bitcore = BWC.getBitcore();
const BitcoreCash = BWC.getBitcoreCash();
const BitcoreDoge = BWC.getBitcoreDoge();
const BitcoreLtc = BWC.getBitcoreLtc();
const Core = BWC.getCore();

export interface BitcoreLibs {
  bch: any;
  btc: any;
  doge: any;
  ltc: any;
}

export const bitcoreLibs: BitcoreLibs = {
  bch: BitcoreCash,
  btc: Bitcore,
  doge: BitcoreDoge,
  ltc: BitcoreLtc,
};

interface Address {
  address: string;
  coin: string;
}

const validateOrThrow = (
  addrObj: Address | null | undefined,
  network: string,
) => {
  if (!addrObj) return;
  if (!ValidateCoinAddress(addrObj.address, addrObj.coin, network)) {
    const err = {type: 'INVALID_ADDRESS_GENERATED', error: addrObj.address};
    throw err;
  }
};

const getLatestMainAddress = (wallet: Wallet) =>
  new Promise<Address>((resolve, reject) => {
    wallet.getMainAddresses(
      {reverse: true, limit: 1},
      (error: any, addr: Address[]) => {
        if (error) return reject({type: 'MAIN_ADDRESS_GAP_REACHED', error});
        resolve(addr?.[0]);
      },
    );
  });

const getNewAddress = (wallet: Wallet) =>
  new Promise<Address>((resolve, reject) => {
    wallet.createAddress({}, (error: any, addr: Address) => {
      if (error) return reject(error);
      resolve(addr);
    });
  });

export const createWalletAddress =
  ({
    wallet,
    newAddress = true,
    skipDispatch = false,
  }: {
    wallet: Wallet;
    newAddress?: boolean;
    skipDispatch?: boolean;
  }): Effect<Promise<string>> =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      if (!wallet) {
        return reject();
      }

      if (!newAddress && wallet.receiveAddress) {
        dispatch(LogActions.info('returned cached wallet address'));
        return resolve(wallet.receiveAddress);
      }

      if (wallet) {
        let {token, network, multisigEthInfo} = wallet.credentials;

        if (multisigEthInfo?.multisigContractAddress) {
          return resolve(multisigEthInfo.multisigContractAddress);
        }

        if (token) {
          wallet.id.replace(`-${token.address}`, '');
        }

        try {
          let addressObj: Address | undefined;

          if (!newAddress) {
            addressObj = await getLatestMainAddress(wallet);
            validateOrThrow(addressObj, network);

            if (addressObj?.address) {
              wallet.receiveAddress = addressObj.address;
              if (!skipDispatch) {
                dispatch(
                  successGetReceiveAddress({
                    keyId: wallet.keyId,
                    walletId: wallet.id,
                    receiveAddress: addressObj.address,
                  }),
                );
              }
              dispatch(LogActions.info('returned last main address'));
              return resolve(addressObj.address);
            }
          }
          // if no main address, generate a new one
          try {
            addressObj = await getNewAddress(wallet);
          } catch (err: any) {
            if (err?.name?.includes?.('MAIN_ADDRESS_GAP_REACHED')) {
              const latest = await getLatestMainAddress(wallet);
              validateOrThrow(latest, network);
              const receiveAddress = latest.address;
              wallet.receiveAddress = receiveAddress;
              if (!skipDispatch) {
                dispatch(
                  successGetReceiveAddress({
                    keyId: wallet.keyId,
                    walletId: wallet.id,
                    receiveAddress,
                  }),
                );
              }
              dispatch(
                LogActions.info(
                  'address gap reached - returned last main address',
                ),
              );
              return resolve(receiveAddress);
            }
            return reject({type: 'GENERAL_ERROR', error: err});
          }
          validateOrThrow(addressObj, network);
          if (addressObj?.address) {
            wallet.receiveAddress = addressObj.address;
            if (!skipDispatch) {
              dispatch(
                successGetReceiveAddress({
                  keyId: wallet.keyId,
                  walletId: wallet.id,
                  receiveAddress: addressObj.address,
                }),
              );
            }
            dispatch(LogActions.info('returned new generated address'));
            return resolve(addressObj.address);
          }
          return reject({type: 'GENERAL_ERROR', error: 'No address generated'});
        } catch (err) {
          throw err;
        }
      }
    });
  };

export const GetLegacyBchAddressFormat = (addr: string): string => {
  const a = BWC.getBitcoreCash().Address(addr).toObject();
  return BWC.getBitcore().Address.fromObject(a).toString();
};

export interface CoinNetwork {
  coin: string;
  network: string;
}

export const GetAddressNetwork = (address: string, coin: keyof BitcoreLibs) => {
  return bitcoreLibs[coin].Address(address).network.name;
};

export const GetCoinAndNetwork = (
  str: string,
  network: string = 'livenet',
  tokenChain?: string,
): CoinNetwork | null => {
  const address = ExtractCoinNetworkAddress(str);
  try {
    return {coin: 'btc', network: GetAddressNetwork(address, 'btc')};
  } catch (e) {
    try {
      return {coin: 'bch', network: GetAddressNetwork(address, 'bch')};
    } catch (bchErr) {
      try {
        let isValidTokenAddress = false;
        let validCoin = '';
        for (const coin of ['eth', 'sol']) {
          isValidTokenAddress = Core.Validation.validateAddress(
            tokenChain?.toUpperCase() || coin.toUpperCase(), // SOL | ETH
            network,
            address,
          );
          if (isValidTokenAddress) {
            validCoin = tokenChain?.toLowerCase() || coin;
            break;
          }
        }
        if (isValidTokenAddress) {
          return {coin: tokenChain?.toLowerCase() || validCoin, network};
        } else {
          throw isValidTokenAddress;
        }
      } catch (ethErr) {
        try {
          const isValidXrpAddress = Core.Validation.validateAddress(
            'XRP',
            network,
            address,
          );
          if (isValidXrpAddress) {
            return {coin: 'xrp', network};
          } else {
            throw isValidXrpAddress;
          }
        } catch (xrpErr) {
          try {
            return {coin: 'doge', network: GetAddressNetwork(address, 'doge')};
          } catch (dogeErr) {
            try {
              return {coin: 'ltc', network: GetAddressNetwork(address, 'ltc')};
            } catch (ltcErr) {
              return null;
            }
          }
        }
      }
    }
  }
};

export const TranslateToBchCashAddress = (
  addressToTranslate: string,
): string => {
  const addressObj = Bitcore.Address(addressToTranslate).toObject();
  return BitcoreCash.Address.fromObject(addressObj).toCashAddress();
};

export const ToLtcAddress = (address: string): string => {
  return BitcoreLtc.Address(address).toString();
};

export const ToDogeAddress = (address: string): string => {
  return BitcoreDoge.Address(address).toString();
};

export const ToBtcAddress = (address: string): string => {
  return Bitcore.Address(address).toString();
};

export const ToCashAddress = (
  address: string,
  withPrefix?: boolean,
): string => {
  return BitcoreCash.Address(address).toString(!withPrefix);
};

export const ToAddress = (address: string, currencyAbbreviation: string) => {
  switch (currencyAbbreviation) {
    case 'bch':
      return ToCashAddress(address);
    case 'ltc':
      return ToLtcAddress(address);
    case 'btc':
      return ToBtcAddress(address);
    case 'doge':
      return ToDogeAddress(address);
    default:
      return address;
  }
};

export const GetMainAddresses = (wallet: Wallet, opts: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    opts = opts || {};
    opts.reverse = true;
    wallet.getMainAddresses(opts, (err: any, addresses: any) => {
      if (err) {
        return reject(err);
      }
      return resolve(addresses);
    });
  });
};
