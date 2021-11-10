import {RootState, Effect} from '../index';
import {AppActions} from './';
import axios from 'axios';
import {Session} from './app.models';
import {sleep} from '../../utils/helper-methods';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {startWalletStoreInit} from '../wallet/wallet.effects';
import {LogActions} from '../log';

export const startGetSession =
  (): Effect => async (dispatch, getState: () => RootState) => {
    const store = getState();

    try {
      const {data: session} = await axios.get<Session>(
        `${store.APP.baseBitPayURL}/auth/session`,
      );
      dispatch(AppActions.successGetSession(session));
    } catch (err) {
      console.error(err);
      dispatch(AppActions.failedGetSession());
    }
  };

export const startAppInit = (): Effect => async dispatch => {
  try {
    dispatch(LogActions.clear());
    dispatch(LogActions.info('Initializing app...'));
    // splitting inits into store specific ones as to keep it cleaner in the main init here
    dispatch(startWalletStoreInit());

    await sleep(500);
    dispatch(AppActions.successAppInit());
    dispatch(LogActions.info('Initialized app successfully.'));
  } catch (err) {
    console.error(err);
    dispatch(AppActions.failedAppInit());
  }
};

export const startOnGoingProcessModal =
  (message: OnGoingProcessMessages): Effect =>
  async (dispatch, getState: () => RootState) => {
    const store: RootState = getState();

    // if modal currently active dismiss and sleep to allow animation to complete before showing next
    if (store.APP.showOnGoingProcessModal) {
      dispatch(AppActions.dismissOnGoingProcessModal());
      await sleep(500);
    }

    dispatch(AppActions.showOnGoingProcessModal(message));
    return sleep(0);
  };
