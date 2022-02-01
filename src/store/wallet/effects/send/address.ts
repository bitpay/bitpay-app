import {Wallet} from '../../wallet.models';
import cloneDeep from 'lodash.clonedeep';
import {ValidateCoinAddress} from '../../utils/validations';
import {BwcProvider} from '../../../../lib/bwc';

const BWC = BwcProvider.getInstance();

interface Address {
  address: string;
  coin: string;
}

export const CreateWalletAddress = (
  wallet: Wallet | undefined,
): Promise<string> => {
  //  TODO: store the address to reuse
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
          //  Rate limits after 20 consecutive addresses
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
