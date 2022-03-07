import axios from 'axios';
import {ShopActions} from '.';
import {Effect} from '..';
import {BASE_BITPAY_URLS} from '../../constants/config';

export const startFetchCatalog = (): Effect => async (dispatch, getState) => {
  try {
    const {APP, BITPAY_ID} = getState();
    const baseUrl = BASE_BITPAY_URLS[APP.network];
    const user = BITPAY_ID.user[APP.network];
    const incentiveLevelId = user?.incentiveLevelId;
    const [catalogResponse, directoryResponse, integrationsResponse] =
      await Promise.all([
        axios.get(
          `${baseUrl}/gift-cards/catalog/US${
            incentiveLevelId && user.localSettings.syncGiftCardPurchases
              ? `/${incentiveLevelId}`
              : ''
          }`,
        ),
        axios.get(`${baseUrl}/merchant-directory/directory`),
        axios.get(`${baseUrl}/merchant-directory/integrations`),
      ]);
    const {data: availableCardMap} = catalogResponse;
    const {data: categoriesAndCurations} = directoryResponse;
    const {data: integrations} = integrationsResponse;
    dispatch(
      ShopActions.successFetchCatalog({
        availableCardMap,
        categoriesAndCurations,
        integrations,
      }),
    );
  } catch (err) {
    console.error(err);
    dispatch(ShopActions.failedFetchCatalog());
  }
};
