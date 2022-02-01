import {Wallet} from '../wallet.models';
import cloneDeep from 'lodash.clonedeep';
import {BwcProvider} from '../../../lib/bwc';
import {ValidateCoinAddress} from './validations';

const BWC = BwcProvider.getInstance();
interface Address {
  address: string;
  coin: string;
}

export const ExtractBitPayUriAddress = (data: string): string => {
  const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
  // eslint-disable-next-line no-useless-escape
  const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
  return address.replace(params, '');
};

export const GetPayProUrl = (data: string): string => {
  return decodeURIComponent(
    data.replace(
      /(bitcoin|bitcoincash|ethereum|ripple|dogecoin|litecoin)?:\?r=/,
      '',
    ),
  );
};

export const GetWalletAddress = (
  wallet: Wallet | undefined,
): Promise<string> => {
  return new Promise((resolve, reject) => {
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
          if (err.name && err.name.includes('MAIN_ADDRESS_GAP_REACHED')) {
            walletClone.getMainAddresses(
              {
                reverse: true,
                limit: 1,
              },
              (e: any, addr: Address[]) => {
                resolve(addr[0].address);
              },
            );
          } else {
            reject(err);
          }
        } else if (
          addressObj &&
          !ValidateCoinAddress(addressObj.address, addressObj.coin, network)
        ) {
          reject(`Invalid address generated: ${addressObj.address}`);
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
