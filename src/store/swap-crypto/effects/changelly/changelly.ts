import axios from 'axios';
import {t} from 'i18next';
import {generateMessageId} from '../../../../navigation/services/swap-crypto/utils/changelly-utils';

const uri = 'https://bws.bitpay.com/bws/api';

export const changellyGetCurrencies = async (full?: boolean) => {
  try {
    const body = {
      id: generateMessageId(),
      full,
      useV2: true,
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
      console.log('The response does not match the origin of the request');
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }

    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
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
      useV2: true,
    };

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    console.log(
      'Making a Changelly request with body: ' + JSON.stringify(body),
    );

    const {data} = await axios.post(
      uri + '/v1/service/changelly/getStatus',
      body,
      config,
    );

    if (data.id && data.id !== body.id) {
      console.log('The response does not match the origin of the request');
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }

    data.exchangeTxId = exchangeTxId;
    data.oldStatus = oldStatus;
    return Promise.resolve(data);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
};
