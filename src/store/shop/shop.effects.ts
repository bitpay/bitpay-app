import axios from 'axios';
import {ShopActions} from '.';
import {Effect} from '..';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../constants/config';

export const startFetchCatalog = (): Effect => async dispatch => {
  try {
    const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
    const [catalogResponse, directoryResponse, integrationsResponse] =
      await Promise.all([
        axios.get(`${baseUrl}/gift-cards/catalog/US`),
        axios.get(`${baseUrl}/merchant-directory/directory`),
        axios.get(`${baseUrl}/merchant-directory/integrations`),
      ]);
    const {data: availableCardMap} = catalogResponse;
    const {data: categories} = directoryResponse;
    const {data: integrations} = integrationsResponse;
    dispatch(
      ShopActions.successFetchCatalog({
        availableCardMap,
        categories,
        integrations,
      }),
    );
  } catch (err) {
    console.error(err);
    dispatch(ShopActions.failedFetchCatalog());
  }
};
