import axios from 'axios';
import {
  ETHERSCAN_API_URL,
  POLYGONSCAN_API_URL,
  ARBISSCAN_API_URL,
  OPSCAN_API_URL,
  BASESCAN_API_URL,
} from './etherscan.constants';
import {
  ETHERSCAN_API_KEY,
  POLYGONSCAN_API_KEY,
  ARBISCAN_API_KEY,
  OPSCAN_API_KEY,
  BASESCAN_API_KEY,
} from '@env';
import {Effect} from '../../store';
import {updateContractAbi} from '../../store/wallet-connect-v2/wallet-connect-v2.actions';

const getContractAbi =
  (chain: string, contractAddress: string): Effect<Promise<string>> =>
  async (dispatch, getState) => {
    const {WALLET_CONNECT_V2} = getState();
    const ABI = WALLET_CONNECT_V2.contractAbi[contractAddress];
    if (ABI) {
      return ABI;
    }
    let apiURL = ETHERSCAN_API_URL;
    let apiKey = ETHERSCAN_API_KEY;
    switch (chain) {
      case 'eth':
        apiURL = ETHERSCAN_API_URL;
        apiKey = ETHERSCAN_API_KEY;
        break;
      case 'matic':
        apiURL = POLYGONSCAN_API_URL;
        apiKey = POLYGONSCAN_API_KEY;
        break;

      case 'arb':
        apiURL = ARBISSCAN_API_URL;
        apiKey = ARBISCAN_API_KEY;
        break;

      case 'op':
        apiURL = OPSCAN_API_URL;
        apiKey = OPSCAN_API_KEY;
        break;

      case 'base':
        apiURL = BASESCAN_API_URL;
        apiKey = BASESCAN_API_KEY;
        break;
    }
    const url = `${apiURL}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
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
  chain: string,
  proxyAddress: string,
  implementationSlot: string,
): Promise<string> => {
  let apiURL = ETHERSCAN_API_URL;
  let apiKey = ETHERSCAN_API_KEY;
  switch (chain) {
    case 'eth':
      apiURL = ETHERSCAN_API_URL;
      apiKey = ETHERSCAN_API_KEY;
      break;
    case 'matic':
      apiURL = POLYGONSCAN_API_URL;
      apiKey = POLYGONSCAN_API_KEY;
      break;

    case 'arb':
      apiURL = ARBISSCAN_API_URL;
      apiKey = ARBISCAN_API_KEY;
      break;

    case 'op':
      apiURL = OPSCAN_API_URL;
      apiKey = OPSCAN_API_KEY;
      break;

    case 'base':
      apiURL = BASESCAN_API_URL;
      apiKey = BASESCAN_API_KEY;
      break;
  }
  const url = `${apiURL}?module=proxy&action=eth_getStorageAt&address=${proxyAddress}&position=${implementationSlot}&tag=latest&apikey=${apiKey}`;
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
