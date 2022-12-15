import {Effect} from '..';
import {LogActions} from '../log';
import axios from 'axios';
import {ZLRequestWalletsType} from './zenledger.models';
import {ZENLEDGER_CLIENT_ID} from '@env';

export const getZenLedgerUrl =
  (wallets: ZLRequestWalletsType[]): Effect<Promise<string>> =>
  async dispatch => {
    try {
      dispatch(LogActions.info('starting [getZenLedgerUrl]'));
      const config = {
        headers: {
          'content-type': 'application/json',
        },
      };
      const url = `https://stagingapi.zenledger.io/bitpay/wallets/${ZENLEDGER_CLIENT_ID}`;
      const {data} = await axios.post(url, {wallets}, config);
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
