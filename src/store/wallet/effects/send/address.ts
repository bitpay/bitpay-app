import {Wallet} from '../../wallet.models';
import cloneDeep from 'lodash.clonedeep';
import {ValidateCoinAddress} from '../../utils/validations';
import {BwcProvider} from '../../../../lib/bwc';
import {ExtractCoinNetworkAddress} from '../../utils/decode-uri';

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

export const CreateWalletAddress = (wallet: Wallet): Promise<string> => {
  //  TODO: store the address to reuse
  return new Promise((resolve, reject) => {
    if (!wallet) {
      reject();
    }

    const walletClone = cloneDeep(wallet);
    if (walletClone) {
      let {token, network, multisigEthInfo} = walletClone.credentials;

      if (multisigEthInfo?.multisigContractAddress) {
        return resolve(multisigEthInfo.multisigContractAddress);
      }

      if (token) {
        walletClone.id.replace(`-${token.address}`, '');
      }

      walletClone.createAddress({}, (err: any, addressObj: Address) => {
        if (err) {
          //  Rate limits after 20 consecutive addresses
          if (err.name && err.name.includes('MAIN_ADDRESS_GAP_REACHED')) {
            walletClone.getMainAddresses(
              {
                reverse: true,
                limit: 1,
              },
              (e: any, addr: Address[]) => {
                if (e) {
                  reject({type: 'MAIN_ADDRESS_GAP_REACHED', error: e});
                }
                resolve(addr[0].address);
              },
            );
          } else {
            reject({type: 'GENERAL_ERROR', error: err});
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
          resolve(addressObj.address);
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
  const cashAdrr = BitcoreCash.Address.fromObject(addressObj).toCashAddress();
  return cashAdrr;
};
