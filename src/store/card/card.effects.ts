import FastImage from 'react-native-fast-image';
import {batch} from 'react-redux';
import {CardActions} from '.';
import CardApi from '../../api/card';
import {InitialUserData} from '../../api/user/user.types';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {sleep} from '../../utils/helper-methods';
import {AppActions} from '../app';
import {Effect} from '../index';
import {LogActions} from '../log';
import {TTL} from './card.types';

export const startCardStoreInit =
  (initialData: InitialUserData): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    const {APP} = getState();

    dispatch(CardActions.successInitializeStore(APP.network, initialData));

    try {
      const virtualCardIds = (initialData.cards || [])
        .filter(c => c.provider === 'galileo' && c.cardType === 'virtual')
        .map(c => c.id);

      if (virtualCardIds.length) {
        dispatch(startFetchVirtualCardImageUrls(virtualCardIds));
      }
    } catch (err) {
      // swallow error so initialize is uninterrupted
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
  (id: string): Effect =>
  async (dispatch, getState) => {
    try {
      dispatch(
        AppActions.showOnGoingProcessModal(OnGoingProcessMessages.LOADING),
      );

      const {APP, BITPAY_ID, CARD} = getState();

      // throttle
      if (Date.now() - CARD.lastUpdates.fetchOverview < TTL.fetchOverview) {
        await sleep(3000);
        return;
      }

      const res = await CardApi.fetchOverview(
        BITPAY_ID.apiToken[APP.network],
        id,
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
