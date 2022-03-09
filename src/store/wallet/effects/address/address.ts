import {Wallet} from '../../wallet.models';
import {ValidateCoinAddress} from '../../utils/validations';
import {BwcProvider} from '../../../../lib/bwc';
import {ExtractCoinNetworkAddress} from '../../utils/decode-uri';
import {Effect} from '../../../index';
import {successGetReceiveAddress} from '../../wallet.actions';
import {
  dismissOnGoingProcessModal,
  showOnGoingProcessModal,
} from '../../../app/app.actions';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';

const BWC = BwcProvider.getInstance();

const Bitcore = BWC.getBitcore();
const BitcoreCash = BWC.getBitcoreCash();
const BitcoreDoge = BWC.getBitcoreDoge();
const BitcoreLtc = BWC.getBitcoreLtc();
const Core = BWC.getCore();

interface Address {
  address: string;
  coin: string;
}

export const createWalletAddress =
  ({
    wallet,
    newAddress = true,
  }: {
    wallet: Wallet;
    newAddress?: boolean;
  }): Effect<Promise<string>> =>
  async dispatch => {
    return new Promise((resolve, reject) => {
      if (!wallet) {
        return reject();
      }

      if (!newAddress && wallet.receiveAddress) {
        console.log('returned cached address');
        return resolve(wallet.receiveAddress);
      }

      if (wallet) {
        const {keyId, id} = wallet;
        let {token, network, multisigEthInfo} = wallet.credentials;

        if (multisigEthInfo?.multisigContractAddress) {
          return resolve(multisigEthInfo.multisigContractAddress);
        }

        if (token) {
          wallet.id.replace(`-${token.address}`, '');
        }

        wallet.createAddress({}, (err: any, addressObj: Address) => {
          if (err) {
            //  Rate limits after 20 consecutive addresses
            if (err.name && err.name.includes('MAIN_ADDRESS_GAP_REACHED')) {
              wallet.getMainAddresses(
                {
                  reverse: true,
                  limit: 1,
                },
                (e: any, addr: Address[]) => {
                  if (e) {
                    reject({type: 'MAIN_ADDRESS_GAP_REACHED', error: e});
                  }

                  const receiveAddress = addr[0].address;
                  dispatch(
                    successGetReceiveAddress({
                      keyId,
                      walletId: id,
                      receiveAddress,
                    }),
                  );

                  return resolve(receiveAddress);
                },
              );
            } else {
              return reject({type: 'GENERAL_ERROR', error: err});
            }
          } else if (
            addressObj &&
            !ValidateCoinAddress(addressObj.address, addressObj.coin, network)
          ) {
            reject({
              type: 'INVALID_ADDRESS_GENERATED',
              error: addressObj.address,
            });
          } else if (addressObj) {
            const receiveAddress = addressObj.address;
            dispatch(
              successGetReceiveAddress({
                keyId,
                walletId: id,
                receiveAddress,
              }),
            );
            return resolve(receiveAddress);
          }
        });
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

export const GetCoinAndNetwork = (
  str: string,
  network: string = 'livenet',
): CoinNetwork | null => {
  const address = ExtractCoinNetworkAddress(str);
  try {
    network = Bitcore.Address(address).network.name;
    return {coin: 'btc', network};
  } catch (e) {
    try {
      network = BitcoreCash.Address(address).network.name;
      return {coin: 'bch', network};
    } catch (bchErr) {
      try {
        const isValidEthAddress = Core.Validation.validateAddress(
          'ETH',
          network,
          address,
        );
        if (isValidEthAddress) {
          return {coin: 'eth', network};
        } else {
          throw isValidEthAddress;
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
            network = BitcoreDoge.Address(address).network.name;
            return {coin: 'doge', network};
          } catch (dogeErr) {
            try {
              network = BitcoreLtc.Address(address).network.name;
              return {coin: 'ltc', network};
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
