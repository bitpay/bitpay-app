// Zenledger API
import axios from 'axios';

import {
  ZenledgerTokenProps,
  ZenledgerPortfolioProps,
  ZenledgerPortfolioResponseProps,
  ZenledgerTaxesResponse,
  ZenledgerCurrenciesResponse,
  ZenledgerSourceResponse,
} from './zenledger.types';

import {ZENLEDGER_CREDENTIALS, ZENLEDGER_API_URL} from './zenledger.constants';

const getAccessToken = async (): Promise<ZenledgerTokenProps> => {
  const url = ZENLEDGER_CREDENTIALS.token_endpoint;
  const body = {
    client_id: ZENLEDGER_CREDENTIALS.client_id,
    client_secret: ZENLEDGER_CREDENTIALS.client_secret,
    grant_type: ZENLEDGER_CREDENTIALS.grant_type,
  };
  const headers = {
    'Content-Type': 'application/json',
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data;
  } catch (error: any) {
    throw error.message;
  }
};

// Supported Exchanges and Wallets
const getSources = async (
  token: ZenledgerTokenProps,
  page: number = 1,
): Promise<ZenledgerSourceResponse> => {
  const url = ZENLEDGER_API_URL + '/sources' + '?page=' + page;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data.data;
  } catch (error: any) {
    throw error.message;
  }
};

// Supported Currencies
const getCurrencies = async (
  token: ZenledgerTokenProps,
  page: number = 1,
): Promise<ZenledgerCurrenciesResponse> => {
  const url = ZENLEDGER_API_URL + '/currencies' + '?page=' + page;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data.data;
  } catch (error: any) {
    throw error.message;
  }
};

// Taxes
const getTaxes = async (
  token: ZenledgerTokenProps,
  aggcode: string,
): Promise<ZenledgerTaxesResponse> => {
  const url = ZENLEDGER_API_URL + '/taxes?aggcode=' + aggcode;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.get(url, {headers});
    return data.data;
  } catch (error: any) {
    throw error.message;
  }
};

// Create wallet portfolios
const createPortfolios = async (
  token: ZenledgerTokenProps,
  wallets: ZenledgerPortfolioProps[],
): Promise<ZenledgerPortfolioResponseProps> => {
  const url = ZENLEDGER_API_URL + '/portfolios';
  const body = {
    portfolio: wallets,
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token.access_token,
  };
  try {
    const {data} = await axios.post(url, body, {headers});
    return data.data;
  } catch (error: any) {
    throw error.message;
  }
};

const ZenledgerAPI = {
  getAccessToken,
  getSources,
  getCurrencies,
  getTaxes,
  createPortfolios,
};

export default ZenledgerAPI;
