import FastImage from 'react-native-fast-image';
import {batch} from 'react-redux';
import CardApi from '../../api/card';
import {InitialUserData} from '../../api/user/user.types';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../utils/helper-methods';
import {AppActions} from '../app';
import {Effect} from '../index';
import {LogActions} from '../log';
import {ProviderConfig} from '../../constants/config.card';
import {CardProvider} from '../../constants/card';
import Dosh, {DoshUiOptions} from '../../lib/dosh';
import {isAxiosError} from '../../utils/axios';
import {CardActions} from '.';
import {TTL} from './card.types';
import {setHomeCarouselConfig} from '../app/app.actions';

export const startCardStoreInit =
  (initialData: InitialUserData): Effect<Promise<void>> =>
  async (dispatch, getState) => {
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
        dispatch(
          setHomeCarouselConfig([
            ...APP.homeCarouselConfig,
            {id: 'bitpayCard', show: true},
          ]),
        );
      }
    } catch (err) {
      // swallow error so initialize is uninterrupted
    }

    // Dosh card rewards
    try {
      dispatch(LogActions.info('Initializing Dosh...'));

      if (!Dosh) {
        dispatch(LogActions.debug('Dosh module not found.'));
        return;
      }

      const options = new DoshUiOptions('Card Offers', 'CIRCLE', 'DIAGONAL');

      await Dosh.initializeDosh(options);
      dispatch(LogActions.info('Successfully initialized Dosh.'));

      const {doshToken} = initialData;
      if (!doshToken) {
        dispatch(LogActions.debug('No doshToken provided.'));
        return;
      }

      await Dosh.setDoshToken(doshToken);
    } catch (err) {
      dispatch(LogActions.error('An error occurred while initializing Dosh.'));
      dispatch(LogActions.error(JSON.stringify(err)));
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
    try {
      dispatch(
        AppActions.showOnGoingProcessModal(OnGoingProcessMessages.LOADING),
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
      const {settledTransactions, pendingTransactions} = res.card.overview;

      dispatch(
        CardActions.successFetchOverview({
          id,
          balance: res.card.balance,
          settledTransactions,
          pendingTransactions,
        }),
      );
    } catch (err) {
      console.log(`Failed to fetch overview for card ${id}`);
      batch(() => {
        dispatch(LogActions.error(`Failed to fetch overview for card ${id}`));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(CardActions.failedFetchOverview(id));
      });
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
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
    try {
      dispatch(
        AppActions.showOnGoingProcessModal(OnGoingProcessMessages.LOADING),
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
    } catch (err) {
      let errMsg;

      if (isAxiosError(err)) {
        errMsg = err.response?.data || err.message;
      } else if (err instanceof Error) {
        errMsg = err.message;
      } else {
        errMsg = JSON.stringify(err);
      }

      dispatch(
        LogActions.error(`Failed to fetch settled transactions for ${id}`),
      );
      dispatch(LogActions.error(errMsg || JSON.stringify(err)));
      dispatch(CardActions.failedFetchSettledTransactions(id));
    } finally {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }
  };

export const startFetchVirtualCardImageUrls =
  (ids: string[]): Effect =>
  async (dispatch, getState) => {
    try {
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
      } catch (err) {
        dispatch(LogActions.error('Failed to preload virtual card images.'));
        dispatch(LogActions.error(JSON.stringify(err)));
      }
    } catch (err) {
      batch(() => {
        dispatch(
          LogActions.error(
            `Failed to fetch virtual card image URLs for ${ids.join(', ')}`,
          ),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
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
    } catch (err) {
      batch(() => {
        dispatch(
          LogActions.error(`Failed to update card lock status for ${id}`),
        );
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(CardActions.failedUpdateCardLock(id));
      });
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
    } catch (err) {
      batch(() => {
        dispatch(LogActions.error(`Failed to update card name for ${id}`));
        dispatch(LogActions.error(JSON.stringify(err)));
        dispatch(CardActions.failedUpdateCardName(id));
      });
    }
  };
