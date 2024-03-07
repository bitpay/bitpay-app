import {Effect} from '..';
import {navigationRef} from '../../Root';
import {Analytics} from '../analytics/analytics.effects';

export const goToSellCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Sell Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate('SellCryptoRoot');
};
