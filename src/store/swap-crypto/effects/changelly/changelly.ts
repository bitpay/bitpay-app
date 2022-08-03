import axios from 'axios';
import {generateMessageId} from '../../../../navigation/services/swap-crypto/utils/changelly-utils';
import {LogActions} from '../../../log';

const uri = 'https://bws.bitpay.com/bws/api';

export const changellyGetCurrencies = async (full?: boolean) => {
  try {
    const body = {
      id: generateMessageId(),
      full,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const {data} = await axios.post(
      uri + '/v1/service/changelly/getCurrencies',
      body,
      config,
    );

    if (data?.id !== body.id) {
      LogActions.debug('The response does not match the origin of the request');
    }

    return Promise.resolve(data);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    LogActions.error(`changellyGetCurrencies: ${errMsg}`);
    return Promise.reject(err);
  }
};

export const changellyGetStatus = async (
  exchangeTxId: string,
  oldStatus: string,
) => {
  try {
    const body = {
      id: generateMessageId(),
      exchangeTxId,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    LogActions.debug(
      'Making a Changelly request with body: ' + JSON.stringify(body),
    );

    const {data} = await axios.post(
      uri + '/v1/service/changelly/getStatus',
      body,
      config,
    );

    if (data.id && data.id !== body.id) {
      LogActions.debug('The response does not match the origin of the request');
    }

    data.exchangeTxId = exchangeTxId;
    data.oldStatus = oldStatus;
    return Promise.resolve(data);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    LogActions.error(`changellyGetStatus: ${errMsg}`);
    return Promise.reject(err);
  }
};
