import axios from 'axios';
import moment from 'moment';
import {keyBy} from 'lodash';
import {ShopActions} from '.';
import {Effect} from '..';
import BitPayIdApi from '../../api/bitpay';
import {BASE_BITPAY_URLS} from '../../constants/config';
import {
  BillPayAccount,
  BillPayInvoiceParams,
  BillPayOrder,
  BillPayPayment,
  CardConfig,
  GiftCard,
  GiftCardInvoiceParams,
  GiftCardOrder,
  Invoice,
  UnsoldGiftCard,
} from './shop.models';
import {
  getCardConfigMapFromApiConfigMap,
  redemptionFailuresLessThanAWeekOld,
  sortByDescendingDate,
} from '../../lib/gift-cards/gift-card';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../constants/device-emitter-events';
import {LogActions} from '../log';
import {getBillPayAccountDescription} from '../../navigation/tabs/shop/bill/utils';
import {successFetchCatalog} from '../shop-catalog/shop-catalog.actions';

export const startFetchCatalog = (): Effect => async (dispatch, getState) => {
  try {
    const {APP, BITPAY_ID, LOCATION, SHOP} = getState();
    const baseUrl = BASE_BITPAY_URLS[APP.network];
    const user = BITPAY_ID.user[APP.network];
    const incentiveLevelId = user?.incentiveLevelId;
    const country = LOCATION.locationData?.countryShortCode || 'US';
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
      successFetchCatalog({
        availableCardMap: getCardConfigMapFromApiConfigMap(availableCardMap),
        categoriesAndCurations,
        integrations,
      }),
    );
  } catch (err) {
    const errStr = err instanceof Error ? err.message : JSON.stringify(err);
    dispatch(
      LogActions.error(
        `failed [startFetchCatalog]: ${errStr} - continue anyway`,
      ),
    );
    dispatch(ShopActions.failedFetchCatalog());
  }
};

export const startSyncGiftCards =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID, SHOP} = getState();
      const user = BITPAY_ID.user[APP.network];
      if (!user) {
        return;
      }
      const savedGiftCards = SHOP.giftCards[APP.network];
      const syncedGiftCards = savedGiftCards
        .filter(giftCard => giftCard.userEid === user.eid)
        .sort(sortByDescendingDate);
      const latestSyncDate = syncedGiftCards[0]?.date;
      const olderThanThreeDays = (dateString: string): boolean => {
        const threeDaysAgo = moment().subtract(3, 'day').toDate();
        return new Date(dateString) < threeDaysAgo;
      };
      const unsyncedGiftCards = await BitPayIdApi.apiCall(
        BITPAY_ID.apiToken[APP.network],
        'findGiftCards',
        {dateStart: latestSyncDate},
      ).then(
        res =>
          res.map((resObj: any) => ({
            ...resObj,
            brand: undefined,
            createdOn: undefined,
            name: resObj.brand,
            date: resObj.createdOn,
            userEid: user.eid,
            archived: olderThanThreeDays(resObj.createdOn),
            status: 'SYNCED',
          })) as GiftCard[],
      );
      if (!unsyncedGiftCards.length) {
        return;
      }
      const giftCardMap = keyBy(savedGiftCards, giftCard => giftCard.invoiceId);
      const giftCards = unsyncedGiftCards.reduce(
        (newSavedGiftCards, unsyncedGiftCard) =>
          giftCardMap[unsyncedGiftCard.invoiceId]
            ? newSavedGiftCards
            : newSavedGiftCards.concat(unsyncedGiftCard),
        savedGiftCards as GiftCard[],
      );
      dispatch(
        ShopActions.setPurchasedGiftCards({giftCards, network: APP.network}),
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

export const redeemSyncedGiftCards =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {APP, SHOP} = getState();
    const savedGiftCards = SHOP.giftCards[APP.network];
    const syncedGiftCards = savedGiftCards.filter(
      giftCard => giftCard.status === 'SYNCED',
    );
    const redeemPromises = syncedGiftCards
      .slice(0, 3)
      .map(giftCard => dispatch(startRedeemGiftCard(giftCard.invoiceId)));
    await Promise.all(redeemPromises);
  };

export const startCreateBillPayInvoice =
  (params: BillPayInvoiceParams): Effect<Promise<BillPayOrder>> =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const baseUrl = BASE_BITPAY_URLS[APP.network];
      const createInvoiceResponse = await BitPayIdApi.getInstance()
        .request(
          'createBillPayInvoice',
          BITPAY_ID.apiToken[APP.network],
          params,
        )
        .then(res => {
          if (res?.data?.error) {
            throw new Error(res.data.error);
          }
          return res.data;
        });
      const {data: billPayOrder} = createInvoiceResponse as {
        data: BillPayOrder;
      };
      const getInvoiceResponse = await axios.get(
        `${baseUrl}/invoices/${billPayOrder.invoiceId}`,
      );
      const {
        data: {data: invoice},
      } = getInvoiceResponse as {data: {data: Invoice}};
      return {...billPayOrder, invoice} as BillPayOrder;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

export const startCreateGiftCardInvoice =
  (
    cardConfig: CardConfig,
    params: GiftCardInvoiceParams,
  ): Effect<Promise<GiftCardOrder>> =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID, SHOP} = getState();
      const baseUrl = BASE_BITPAY_URLS[APP.network];
      const user = BITPAY_ID.user[APP.network];
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
              BITPAY_ID.apiToken[APP.network],
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
        status: 'UNREDEEMED',
        ...(user && user.eid && {userEid: user.eid}),
      } as UnsoldGiftCard;
      dispatch(
        ShopActions.initializedUnsoldGiftCard({
          giftCard: unsoldGiftCard,
          network: APP.network,
        }),
      );
      return {...cardOrder, invoice} as GiftCardOrder;
    } catch (err: any) {
      console.error(err);
      dispatch(ShopActions.failedCreateGiftCardInvoice());
      throw err;
    }
  };

export const startRedeemGiftCard =
  (invoiceId: string): Effect<Promise<GiftCard>> =>
  async (dispatch, getState) => {
    const {APP, SHOP} = getState();
    const unredeemedGiftCard = SHOP.giftCards[APP.network].find(
      card => card.invoiceId === invoiceId,
    ) as UnsoldGiftCard;
    const baseUrl = BASE_BITPAY_URLS[APP.network];
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
    dispatch(
      ShopActions.redeemedGiftCard({
        giftCard: updatedGiftCard,
        network: APP.network,
      }),
    );
    return updatedGiftCard;
  };

export const retryGiftCardRedemptions =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    const {APP, SHOP} = getState();
    const failedRedemptionGiftCards = SHOP.giftCards[APP.network].filter(
      redemptionFailuresLessThanAWeekOld,
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
      const {APP, SHOP} = getState();
      const unredeemedGiftCard = SHOP.giftCards[APP.network].find(
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

export const startGetMethodToken =
  (
    {tokenType}: {tokenType: 'auth' | 'link'} = {tokenType: 'auth'},
  ): Effect<Promise<string>> =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const methodAuthElementToken = await BitPayIdApi.getInstance()
      .request('getMethodToken', BITPAY_ID.apiToken[APP.network], {tokenType})
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data.data as string;
      });
    return methodAuthElementToken;
  };

export const exchangeMethodAccountToken =
  (token: string): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    await BitPayIdApi.getInstance()
      .request('exchangeAccountToken', BITPAY_ID.apiToken[APP.network], {token})
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
      });
  };

export const startGetBillPayAccounts =
  (): Effect<Promise<BillPayAccount[]>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const user = BITPAY_ID.user[APP.network];
    const accounts = user?.methodEntityId
      ? await BitPayIdApi.getInstance()
          .request('getBillPayAccounts', BITPAY_ID.apiToken[APP.network])
          .then(res => {
            if (res?.data?.error) {
              throw new Error(res.data.error);
            }
            return res.data.data as BillPayAccount[];
          })
      : [];
    const billPayAccounts = accounts
      .filter(account => !!account.type && !!account[account.type])
      .map(account => ({
        ...account,
        [account.type]: {
          ...account[account.type],
          paddedNextPaymentDueDate:
            account[account.type].paddedNextPaymentDueDate ||
            account[account.type].nextPaymentDueDate,
          description: getBillPayAccountDescription(
            account[account.type].type,
            account[account.type].mask,
          ),
        },
      }));
    dispatch(
      ShopActions.setBillPayAccounts({
        accounts: billPayAccounts,
        network: APP.network,
      }),
    );
    return billPayAccounts;
  };

export const startFindBillPayments =
  ({
    partnerAccountId,
    endDate,
  }: {
    partnerAccountId?: string;
    endDate?: string;
  } = {}): Effect<Promise<BillPayPayment[]>> =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const billPayPayments = await BitPayIdApi.getInstance()
      .request('findBillPayments', BITPAY_ID.apiToken[APP.network], {
        partnerAccountId,
        endDate,
      })
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data.data as BillPayPayment[];
      });
    const storedBillPayPayments = billPayPayments.map(billPayPayment => ({
      ...billPayPayment,
      payments: billPayPayment.payments.map(payment => ({
        ...payment,
        ...(payment.accountType &&
          payment.mask && {
            accountDescription: getBillPayAccountDescription(
              payment.accountType,
              payment.mask,
            ),
          }),
      })),
    }));
    dispatch(
      ShopActions.setBillPayPayments({
        billPayPayments: storedBillPayPayments,
        network: APP.network,
      }),
    );
    return storedBillPayPayments;
  };

export const startHideBillPayAccount =
  (accountId: string): Effect<Promise<string>> =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const status = await BitPayIdApi.getInstance()
      .request('hideAccount', BITPAY_ID.apiToken[APP.network], {accountId})
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data.data as string;
      });
    return status;
  };

export const startCheckIfBillPayAvailable =
  (): Effect<Promise<any>> => async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const available = await BitPayIdApi.getInstance()
      .request('isBillPayAvailable', BITPAY_ID.apiToken[APP.network])
      .then(res => {
        if (res?.data?.error) {
          throw new Error(res.data.error);
        }
        return res.data.data as any;
      })
      .catch(err => {
        dispatch(
          LogActions.error(
            `failed [startCheckIfBillPayAvailable]: ${err.message}`,
          ),
        );
        throw err;
      });
    dispatch(LogActions.info(`isBillPayAvailable: ${available}`));
    return available;
  };
