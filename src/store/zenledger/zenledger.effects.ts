import {ZENLEDGER_CLIENT_ID} from '@env';
import axios from 'axios';
import {Effect} from '..';
import {LogActions} from '../log';
import {ZenLedgerRequestWalletsType} from './zenledger.models';

export const getZenLedgerUrl =
  (wallets: ZenLedgerRequestWalletsType[]): Effect<Promise<{url: string}>> =>
  async dispatch => {
    try {
      dispatch(LogActions.info('starting [getZenLedgerUrl]'));
      const config = {
        headers: {
          'content-type': 'application/json',
        },
      };
      const url = `https://stagingapi.zenledger.io/bitpay/wallets/${ZENLEDGER_CLIENT_ID}`;
      const {data} = await axios.post<{url: string}>(url, {wallets}, config);
      dispatch(LogActions.info('successful [getZenLedgerUrl]'));
      return data;
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(LogActions.error(`failed [getZenLedgerUrl]: ${errorStr}`));
      throw e;
    }
  };
