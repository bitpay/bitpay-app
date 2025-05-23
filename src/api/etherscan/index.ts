import axios from 'axios';
import {ETHERSCAN_API_URL} from './etherscan.constants';
import {ETHERSCAN_API_KEY} from '@env';
import {Effect} from '../../store';
import {updateContractAbi} from '../../store/wallet-connect-v2/wallet-connect-v2.actions';

const getContractAbi =
  (chainId: string, contractAddress: string): Effect<Promise<string>> =>
  async (dispatch, getState) => {
    const {WALLET_CONNECT_V2} = getState();
    const ABI = WALLET_CONNECT_V2.contractAbi[contractAddress];
    if (ABI) {
      return ABI;
    }
    const url = `${ETHERSCAN_API_URL}?chainid=${chainId}&module=contract&action=getabi&address=${contractAddress}&apikey=${ETHERSCAN_API_KEY}`;
    const headers = {
      'Content-Type': 'application/json',
    };
    try {
      const {data} = await axios.get(url, {headers});
      const {result} = data;
      if (result) {
        dispatch(updateContractAbi(result, contractAddress));
      }
      return result;
    } catch (error: any) {
      throw error.message;
    }
  };

const getStorageAt = async (
  chainId: string,
  proxyAddress: string,
  implementationSlot: string,
): Promise<string> => {
  const url = `${ETHERSCAN_API_URL}?chainid=${chainId}&module=proxy&action=eth_getStorageAt&address=${proxyAddress}&position=${implementationSlot}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  try {
    const {data} = await axios.get(url, {headers});
    const {result} = data;
    return result;
  } catch (error: any) {
    throw error.message;
  }
};

const EtherscanAPI = {
  getContractAbi,
  getStorageAt,
};

export default EtherscanAPI;
