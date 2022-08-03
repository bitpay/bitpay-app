import axios from 'axios';
import {ShopActions} from '.';
import {Effect} from '..';
import BitPayIdApi from '../../api/bitpay';
import {APP_NETWORK, BASE_BITPAY_URLS} from '../../constants/config';
import {
  CardConfig,
  GiftCard,
  GiftCardInvoiceParams,
  GiftCardOrder,
  Invoice,
  UnsoldGiftCard,
} from './shop.models';
import {
  getCardConfigMapFromApiConfigMap,
  redemptionFailuresLessThanADayOld,
} from '../../lib/gift-cards/gift-card';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {useLogger} from '../../utils/hooks';

export const startFetchCatalog = (): Effect => async (dispatch, getState) => {
  const logger = useLogger();
  try {
    logger.info('startFetchCatalog: starting...');
    const {APP, BITPAY_ID, LOCATION, SHOP} = getState();
    const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
    const user = BITPAY_ID.user[APP.network];
    const incentiveLevelId = user?.incentiveLevelId;
    const country = LOCATION.countryData?.shortCode || 'US';
    const [catalogResponse, directoryResponse, integrationsResponse] =
      await Promise.all([
        axios.get(
          `${baseUrl}/gift-cards/catalog/${country}${
            incentiveLevelId && SHOP.syncGiftCardPurchasesWithBitPayId
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
        availableCardMap: getCardConfigMapFromApiConfigMap(availableCardMap),
        categoriesAndCurations,
        integrations,
      }),
    );
    logger.info('startFetchCatalog: success');
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    logger.warn(`startFetchCatalog: failed ${errStr} - continue anyway`);
    dispatch(ShopActions.failedFetchCatalog());
  }
};

export const startCreateGiftCardInvoice =
  (
    cardConfig: CardConfig,
    params: GiftCardInvoiceParams,
  ): Effect<Promise<GiftCardOrder>> =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startCreateGiftCardInvoice: starting...');
      const {BITPAY_ID, SHOP} = getState();
      const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
      const user = BITPAY_ID.user[APP_NETWORK];
      const shouldSync = user && SHOP.syncGiftCardPurchasesWithBitPayId;
      const fullParams = {
        ...params,
        ...(cardConfig.emailRequired && {
          email: shouldSync ? user?.email : SHOP.email,
        }),
        ...(cardConfig.phoneRequired && {phone: SHOP.phone}),
      };
      const createInvoiceResponse = shouldSync
        ? await BitPayIdApi.getInstance()
            .request(
              'createGiftCardInvoice',
              BITPAY_ID.apiToken[APP_NETWORK],
              fullParams,
            )
            .then(res => {
              if (res?.data?.error) {
                throw new Error(res.data.error);
              }
              return res.data;
            })
        : await axios.post(`${baseUrl}/gift-cards/pay`, fullParams);
      const {data: cardOrder} = createInvoiceResponse as {data: GiftCardOrder};
      const getInvoiceResponse = await axios.get(
        `${baseUrl}/invoices/${cardOrder.invoiceId}`,
      );
      const {
        data: {data: invoice},
      } = getInvoiceResponse as {data: {data: Invoice}};
      const unsoldGiftCard = {
        currency: params.currency,
        date: new Date(),
        amount: params.amount,
        clientId: params.clientId,
        accessKey: cardOrder.accessKey,
        invoiceId: cardOrder.invoiceId,
        name: params.brand,
        totalDiscount: cardOrder.totalDiscount,
        invoice: invoice,
        status: 'UNREDEEMED',
        ...(user && user.eid && {userEid: user.eid}),
      } as UnsoldGiftCard;
      dispatch(
        ShopActions.initializedUnsoldGiftCard({
          giftCard: unsoldGiftCard,
        }),
      );
      logger.info('startCreateGiftCardInvoice: success');
      return {...cardOrder, invoice} as GiftCardOrder;
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`startCreateGiftCardInvoice: failed ${errStr}`);
      dispatch(ShopActions.failedCreateGiftCardInvoice());
      throw err;
    }
  };

export const startRedeemGiftCard =
  (invoiceId: string): Effect<Promise<GiftCard>> =>
  async (dispatch, getState) => {
    const {SHOP} = getState();
    const unredeemedGiftCard = SHOP.giftCards[APP_NETWORK].find(
      card => card.invoiceId === invoiceId,
    ) as UnsoldGiftCard;
    const baseUrl = BASE_BITPAY_URLS[APP_NETWORK];
    const redeemResponse = await axios
      .post(`${baseUrl}/gift-cards/redeem`, {
        accessKey: unredeemedGiftCard.accessKey,
        clientId: unredeemedGiftCard.clientId,
        invoiceId: unredeemedGiftCard.invoiceId,
      })
      .catch(err => {
        const errMessage = err.response?.data?.message;
        const pendingMessages = [
          'Card creation delayed',
          'Invoice is unpaid or payment has not confirmed',
        ];
        const isDelayed =
          pendingMessages.includes(errMessage) ||
          errMessage.indexOf('Please wait') !== -1;
        return {
          data: {
            status: isDelayed ? 'PENDING' : 'FAILURE',
          },
        };
      });
    const {data: giftCard} = redeemResponse;
    const updatedGiftCard = {
      ...unredeemedGiftCard,
      ...giftCard,
      status: giftCard.status || 'SUCCESS',
    } as GiftCard;
    dispatch(ShopActions.redeemedGiftCard({giftCard: updatedGiftCard}));
    return updatedGiftCard;
  };

export const retryGiftCardRedemptions =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {SHOP} = getState();
    const failedRedemptionGiftCards = SHOP.giftCards[APP_NETWORK].filter(
      redemptionFailuresLessThanADayOld,
    );
    const retryPromises = failedRedemptionGiftCards.map(giftCard =>
      dispatch(startRedeemGiftCard(giftCard.invoiceId)),
    );
    await Promise.all(retryPromises);
  };

export const waitForConfirmation =
  (invoiceId: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    let numTries = 0;
    const interval = setInterval(() => {
      const {SHOP} = getState();
      const unredeemedGiftCard = SHOP.giftCards[APP_NETWORK].find(
        card => card.invoiceId === invoiceId,
      ) as UnsoldGiftCard;
      if (unredeemedGiftCard.status !== 'PENDING' || numTries > 5) {
        DeviceEventEmitter.emit(
          DeviceEmitterEvents.GIFT_CARD_REDEEMED,
          unredeemedGiftCard,
        );
        clearInterval(interval);
        return;
      }
      dispatch(startRedeemGiftCard(unredeemedGiftCard.invoiceId));
      numTries++;
    }, 10000);
  };
