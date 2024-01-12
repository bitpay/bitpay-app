import {Effect} from '..';
import {navigationRef} from '../../Root';
import {Analytics} from '../analytics/analytics.effects';

export const goToSwapCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Swap Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate('SwapCryptoRoot');
};
