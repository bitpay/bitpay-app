import {Effect} from '..';
import {ExternalServicesScreens} from '../../navigation/services/ExternalServicesGroup';
import {navigationRef} from '../../Root';
import {Analytics} from '../analytics/analytics.effects';

export const goToSellCrypto = (): Effect<void> => dispatch => {
  dispatch(
    Analytics.track('Clicked Sell Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate(ExternalServicesScreens.ROOT_BUY_AND_SELL, {
    context: 'sellCrypto',
  });
};
