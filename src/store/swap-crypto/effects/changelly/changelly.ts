import axios from 'axios';
import {t} from 'i18next';
import {BASE_BWS_URL} from '../../../../constants/config';
import {generateMessageId} from '../../../../navigation/services/swap-crypto/utils/changelly-utils';
import {logManager} from '../../../../managers/LogManager';

const bwsUri = BASE_BWS_URL;

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
      bwsUri + '/v1/service/changelly/getCurrencies',
      body,
      config,
    );

    if (data?.id !== body.id) {
      logManager.debug('The response does not match the origin of the request');
      return Promise.reject(
        t('The response does not match the origin of the request'),
      );
    }

    return Promise.resolve(data);
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logManager.error('Error in changellyGetCurrencies: ' + errStr);
    return Promise.reject(err);
  }
};
