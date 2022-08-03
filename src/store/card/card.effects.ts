import {DOSH_WHITELIST} from '@env';
import axios from 'axios';
import {t} from 'i18next';
import BitPayIdApi from '../../api/bitpay';
import FastImage from 'react-native-fast-image';
import {batch} from 'react-redux';
import CardApi from '../../api/card';
import {InitialUserData} from '../../api/user/user.types';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../utils/helper-methods';
import {AppActions} from '../app';
import {Analytics} from '../app/app.effects';
import {Effect} from '../index';
import {LogActions} from '../log';
import {ProviderConfig} from '../../constants/config.card';
import {CardProvider} from '../../constants/card';
import Dosh, {DoshUiOptions} from '../../lib/dosh';
import {isAxiosError} from '../../utils/axios';
import {CardActions} from '.';
import {TTL} from './card.types';
import {Card, DebitCardTopUpInvoiceParams} from './card.models';
import {Invoice} from '../shop/shop.models';
import {BASE_BITPAY_URLS} from '../../constants/config';
import ApplePushProvisioningModule from '../../lib/apple-push-provisioning/ApplePushProvisioning';
import {GeneralError} from '../../navigation/wallet/components/ErrorMessages';
import GooglePushProvisioningModule from '../../lib/google-push-provisioning/GooglePushProvisioning';
import {useLogger} from '../../utils/hooks';

const DoshWhitelist: string[] = [];

if (DOSH_WHITELIST) {
  try {
    DoshWhitelist.push(...DOSH_WHITELIST.split(',').map(email => email.trim()));
  } catch (e) {
    console.log('Unable to parse DOSH_WHITELIST', e);
  }
}

export interface StartActivateCardParams {
  cvv: string;
  expirationDate: string;
  lastFourDigits?: string;
  cardNumber?: string;
}

export interface AppleWalletProvisioningRequestParams {
  walletProvider: string;
  cert1: any;
  cert2: any;
  nonce: any;
  nonceSignature: any;
}

export const startCardStoreInit =
  (initialData: InitialUserData): Effect<void> =>
  (dispatch, getState) => {
    const logger = useLogger();
    const {APP} = getState();

    dispatch(CardActions.successInitializeStore(APP.network, initialData));
    try {
      const virtualCardIds = (initialData.cards || [])
        .filter(
          c => c.provider === CardProvider.galileo && c.cardType === 'virtual',
        )
        .map(c => c.id);

      if (virtualCardIds.length) {
        dispatch(startFetchVirtualCardImageUrls(virtualCardIds));
      }
    } catch (err) {
      // swallow error so initialize is uninterrupted
    }

    // Dosh card rewards
    logger.info('startCardStoreInit: Initializing Dosh...');

    if (!Dosh) {
      logger.debug('startCardStoreInit: Dosh module not found.');
    } else {
      const options = new DoshUiOptions('Card Offers', 'CIRCLE', 'DIAGONAL');

      try {
        Dosh.initializeDosh(options).then(() => {
          logger.info('startCardStoreInit: Successfully initialized Dosh.');

          const {doshToken} = initialData;
          if (!doshToken) {
            logger.debug('startCardStoreInit: No doshToken provided.');
            return;
          }

          return Dosh.setDoshToken(doshToken);
        });
      } catch (e: any) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          `startCardStoreInit: An error occurred while initializing Dosh. ${errorStr}`,
        );
      }
    }
  };

export const startFetchAll =
  (token: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP} = getState();
      const cards = await CardApi.fetchAll(token);

      dispatch(CardActions.successFetchCards(APP.network, cards));
    } catch (err) {
      dispatch(CardActions.failedFetchCards());
    }
  };

export const startFetchOverview =
  (
    id: string,
    options?: {
      pageSize?: number;
      pageNumber?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startFetchOverview: starting...');
      dispatch(
        AppActions.showOnGoingProcessModal(
          // t('Loading')
          t(OnGoingProcessMessages.LOADING),
        ),
      );
      dispatch(CardActions.updateFetchOverviewStatus(id, 'loading'));

      const {APP, BITPAY_ID, CARD} = getState();
      let {pageSize, pageNumber, startDate, endDate} = options || {};

      // throttle
      if (Date.now() - CARD.lastUpdates.fetchOverview < TTL.fetchOverview) {
        await sleep(3000);
        return;
      }

      if (!startDate) {
        const card = CARD.cards[APP.network].find(c => c.id === id);
        const dateRange = card
          ? ProviderConfig[card.provider].maxHistoryDateRange
          : 60;

        startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);
      }

      const res = await CardApi.fetchOverview(
        BITPAY_ID.apiToken[APP.network],
        id,
        {
          pageNumber,
          pageSize,
          startDate,
          endDate,
        },
      );

      const {overview, topUpHistory} = res.card;
      const {settledTransactions, pendingTransactions} = overview;

      dispatch(
        CardActions.successFetchOverview({
          id,
          balance: res.card.balance,
          settledTransactions,
          pendingTransactions,
          topUpHistory,
        }),
      );
      logger.info('startFetchOverview: success');
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      batch(() => {
        logger.error(
          `startFetchOverview: Failed to fetch overview for card ${id}. ${errorStr}`,
        );
        dispatch(CardActions.failedFetchOverview(id));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startCreateDebitCardTopUpInvoice =
  (
    card: Card,
    params: DebitCardTopUpInvoiceParams,
  ): Effect<Promise<{invoiceId: string; invoice: Invoice}>> =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startCreateDebitCardTopUpInvoice: starting...');
      const {APP} = getState();
      const {network} = APP;
      const baseUrl = BASE_BITPAY_URLS[network];
      const createInvoiceResponse = await BitPayIdApi.getInstance()
        .request('generateTopUpInvoice', card.token, params)
        .then(res => {
          if (res.data.error) {
            throw new Error(res.data.error);
          }
          return res.data;
        });
      const {data: invoiceId} = createInvoiceResponse as {data: string};
      const getInvoiceResponse = await axios.get(
        `${baseUrl}/invoices/${invoiceId}`,
      );
      const {
        data: {data: invoice},
      } = getInvoiceResponse as {data: {data: Invoice}};
      logger.info('startCreateDebitCardTopUpInvoice: success');
      return {invoiceId, invoice} as {invoiceId: string; invoice: Invoice};
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error(`startCreateDebitCardTopUpInvoice: ${errMsg}`);
      throw err;
    }
  };

export const startFetchSettledTransactions =
  (
    id: string,
    options?: {
      pageSize?: number;
      pageNumber?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startFetchSettledTransactions: starting...');
      dispatch(
        AppActions.showOnGoingProcessModal(
          // t('Loading')
          t(OnGoingProcessMessages.LOADING),
        ),
      );

      const {APP, BITPAY_ID, CARD} = getState();
      const token = BITPAY_ID.apiToken[APP.network];
      let {pageSize, pageNumber, startDate, endDate} = options || {};

      if (!startDate) {
        const card = CARD.cards[APP.network].find(c => c.id === id);
        const dateRange = card
          ? ProviderConfig[card.provider].maxHistoryDateRange
          : 60;

        startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);
      }

      const transactionPageData = await CardApi.fetchSettledTransactions(
        token,
        id,
        {
          pageSize,
          pageNumber,
          startDate,
          endDate,
        },
      );

      dispatch(
        CardActions.successFetchSettledTransactions(id, transactionPageData),
      );
      logger.info('startFetchSettledTransactions: success');
    } catch (err) {
      let errMsg;

      if (isAxiosError(err)) {
        errMsg = err.response?.data || err.message;
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      logger.error(
        `startFetchSettledTransactions: Failed for ${id}. ${errMsg}`,
      );
      dispatch(CardActions.failedFetchSettledTransactions(id));
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startFetchVirtualCardImageUrls =
  (ids: string[]): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startFetchVirtualCardImageUrls: starting...');
      const {APP, BITPAY_ID} = getState();

      const urlsPayload = await CardApi.fetchVirtualCardImageUrls(
        BITPAY_ID.apiToken[APP.network],
        ids,
      );

      dispatch(CardActions.successFetchVirtualImageUrls(urlsPayload));

      try {
        const sources = urlsPayload.map(({virtualCardImage}) => {
          return {uri: virtualCardImage};
        });

        FastImage.preload(sources);
      } catch (e: unknown) {
        const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
        logger.error(
          'startFetchVirtualCardImageUrls: Failed to preload virtual card images',
        );
        logger.error(`startFetchVirtualCardImageUrls: ${errorStr}`);
      }
      logger.info('startFetchVirtualCardImageUrls: success');
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      batch(() => {
        logger.error(
          `startFetchVirtualCardImageUrls: Failed to fetch virtual card image URLs for ${ids.join(
            ', ',
          )}`,
        );
        logger.error(`startFetchVirtualCardImageUrls: ${errorStr}`);
        dispatch(CardActions.failedFetchVirtualImageUrls());
      });
    }
  };

export const START_UPDATE_CARD_LOCK =
  (id: string, locked: boolean): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];

      const res = await CardApi.updateCardLock(token, id, locked);
      const isLocked = res.user.card.locked === 'true';

      dispatch(CardActions.successUpdateCardLock(network, id, isLocked));
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      batch(() => {
        dispatch(
          LogActions.error(`Failed to update card lock status for ${id}`),
        );
        dispatch(LogActions.error(`START_UPDATE_CARD_LOCK: ${errorStr}`));
        dispatch(CardActions.failedUpdateCardLock(id));
      });
    }
  };

export const startActivateCard =
  (id: string, payload: StartActivateCardParams): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      logger.info('startActivateCard: starting...');
      dispatch(CardActions.updateActivateCardStatus(null));

      const {APP, BITPAY_ID} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];

      const {data, errors} = await CardApi.activateCard(token, id, payload);

      if (errors) {
        const errorMsg = errors.map(e => e.message).join('\n');

        throw new Error(errorMsg);
      } else if (data) {
        dispatch(CardActions.successActivateCard());
      } else {
        throw new Error('An unexpected error occurred.');
      }
      logger.info('startActivateCard: success');
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(`startActivateCard: ${errMsg}`);
      dispatch(CardActions.failedActivateCard(errMsg));
    }
  };

export const START_UPDATE_CARD_NAME =
  (id: string, name: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];

      const res = await CardApi.updateCardName(token, id, name);
      const {nickname} = res.user.card;

      dispatch(CardActions.successUpdateCardName(network, id, nickname));
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      batch(() => {
        dispatch(LogActions.error(`Failed to update card name for ${id}`));
        dispatch(LogActions.error(`START_UPDATE_CARD_NAME: ${errMsg}`));
        dispatch(CardActions.failedUpdateCardName(id));
      });
    }
  };

export const START_FETCH_REFERRAL_CODE =
  (id: string): Effect =>
  async (dispatch, getState) => {
    try {
      const {APP, BITPAY_ID, CARD} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];
      const code = CARD.referralCode[id];
      if (code && code !== 'failed' && code !== 'loading') {
        return;
      }
      dispatch(CardActions.updateFetchReferralCodeStatus(id, 'loading'));

      await sleep(500);

      if (BITPAY_ID.user[network]?.referralCode) {
        dispatch(
          CardActions.successFetchReferralCode(
            id,
            BITPAY_ID.user[network]?.referralCode!,
          ),
        );
        return;
      }

      const res = await CardApi.fetchReferralCode(token);

      if (res) {
        dispatch(CardActions.successFetchReferralCode(id, res));
      }
    } catch (e) {
      dispatch(CardActions.updateFetchReferralCodeStatus(id, 'failed'));
    }
  };

export const START_FETCH_REFERRED_USERS =
  (id: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(CardActions.updateFetchReferredUsersStatus(id, 'loading'));

      const {APP, BITPAY_ID} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];

      const res = await CardApi.fetchReferredUsers(token);
      await sleep(500);
      if (res) {
        dispatch(CardActions.successFetchReferredUsers(id, res));
      }
    } catch (e) {
      dispatch(CardActions.updateFetchReferredUsersStatus(id, 'failed'));
    }
  };

export const startOpenDosh =
  (email: string): Effect<void> =>
  async dispatch => {
    const logger = useLogger();
    const isDoshWhitelisted = !!email && DoshWhitelist.includes(email);

    if (!isDoshWhitelisted) {
      dispatch(
        AppActions.showBottomNotificationModal({
          type: 'warning',
          title: t('Unavailable'),
          message: t('Cards Offers unavailable at this time'),
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('OK'),
              action: () => {},
              primary: true,
            },
          ],
        }),
      );

      return;
    }

    try {
      Dosh.present();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(
        'startOpenDosh: Something went wrong trying to open Dosh Rewards',
      );
      logger.error('startOpenDosh: ' + errMsg);
    }
  };

export const startAddToAppleWallet =
  ({
    id,
    data,
  }: {
    id: string;
    data: {
      cardholderName: string;
      primaryAccountNumberSuffix: string;
      encryptionScheme: string;
    };
  }): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      const {APP, BITPAY_ID} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];
      const {cardholderName, primaryAccountNumberSuffix} = data;

      logger.info('startAddToAppleWallet: starging...');

      await ApplePushProvisioningModule.startAddPaymentPass(
        primaryAccountNumberSuffix,
        cardholderName,
      );

      ApplePushProvisioningModule.eventEmitter.addListener(
        'getPassAndActivation',
        async ({data: certs}) => {
          ApplePushProvisioningModule.eventEmitter.removeAllListeners(
            'getPassAndActivation',
          );
          const {
            certificateLeaf: cert1,
            certificateSubCA: cert2,
            nonce,
            nonceSignature,
          }: any = certs || {};

          const res = await CardApi.startCreateAppleWalletProvisioningRequest(
            token,
            id,
            {cert1, cert2, nonce, nonceSignature, walletProvider: 'apple'},
          );
          dispatch(completeAddApplePaymentPass({res}));
        },
      );
      logger.info('startAddToAppleWallet: success');
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      logger.debug(
        `startAddToAppleWallet: startAddPaymentPassError - ${errMsg}`,
      );
      logger.debug(
        `startAddToAppleWallet: ${JSON.stringify(
          e,
          Object.getOwnPropertyNames(e),
        )}`,
      );
      ApplePushProvisioningModule.eventEmitter.removeAllListeners(
        'getPassAndActivation',
      );
    }
  };

export const completeAddApplePaymentPass =
  ({res}: {res: {data: any}}): Effect =>
  async dispatch => {
    const logger = useLogger();
    try {
      logger.debug(
        `completeAddApplePaymentPass: completeAddPaymentPass - ${JSON.stringify(
          res,
        )}`,
      );

      const {
        user: {
          card: {brand, provisioningData},
        },
      } = res.data;

      if (!provisioningData) {
        return;
      }

      const {
        wrappedKey: ephemeralPublicKey,
        activationData,
        encryptedPassData,
      }: any = provisioningData || {};

      await ApplePushProvisioningModule.completeAddPaymentPass(
        activationData,
        encryptedPassData,
        ephemeralPublicKey,
      );

      dispatch(
        Analytics.track('Added card to Apple Wallet', {brand: brand || ''}),
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(
        `completeAddApplePaymentPass: completeAddPaymentPassError - ${errMsg}`,
      ),
        dispatch(AppActions.showBottomNotificationModal(GeneralError()));
    }
  };

export const startAddToGooglePay =
  ({
    id,
    data,
  }: {
    id: string;
    data: {lastFourDigits: string; name: string};
  }): Effect =>
  async (dispatch, getState) => {
    const logger = useLogger();
    try {
      const {APP, BITPAY_ID, CARD} = getState();
      const {network} = APP;
      const token = BITPAY_ID.apiToken[network];
      const card = CARD.cards[network].find(c => c.id === id);

      logger.info('startAddToGooglePay: starting...');

      const {data: provisioningData} =
        await CardApi.startCreateGooglePayProvisioningRequest(token, id);

      if (provisioningData.errors) {
        dispatch(AppActions.showBottomNotificationModal(GeneralError()));
      } else {
        const {lastFourDigits, name} = data;
        const opc =
          provisioningData.user.card.provisioningData.opaquePaymentCard;

        await GooglePushProvisioningModule.startPushProvision(
          opc,
          name,
          lastFourDigits,
        );

        dispatch(
          Analytics.track('Added card to Google Pay', {
            brand: card?.brand || '',
          }),
        );
        logger.info('startAddToGooglePay: success');
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : JSON.stringify(e);
      logger.error(
        `startAddToGooglePay: completePushProvisionError - ${errMsg}`,
      );

      if (e instanceof Error) {
        if (['CANCELED'].includes(e.message)) {
          return;
        }
      }

      dispatch(AppActions.showBottomNotificationModal(GeneralError()));
    }
  };

export const startFetchPinChangeRequestInfo =
  (id: string): Effect =>
  async (dispatch, getState) => {
    const {APP, BITPAY_ID} = getState();
    const token = BITPAY_ID.apiToken[APP.network];

    const res = await CardApi.fetchPinChangeRequestInfo(token, id);

    if (!res.data) {
      let errMsg;

      if (res.errors) {
        errMsg = res.errors.map(e => e.message).join(', ');
      } else {
        errMsg =
          t('An unexpected error occurred while requesting PIN change for') +
          ` ${id}.`;
      }

      dispatch(CardActions.failedFetchPinChangeRequestInfo(id, errMsg));
    } else {
      dispatch(
        CardActions.successFetchPinChangeRequestInfo(
          id,
          res.data.user.card.pinChangeRequestInfo,
        ),
      );
    }
  };
