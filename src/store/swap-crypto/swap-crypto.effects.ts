import {Effect} from '..';
import {navigationRef} from '../../Root';
import {logSegmentEvent} from '../app/app.effects';

export const goToSwapCrypto = (): Effect<void> => dispatch => {
  dispatch(
    logSegmentEvent('track', 'Clicked Swap Crypto', {
      context: 'Shortcuts',
    }),
  );
  navigationRef.navigate('SwapCrypto', {screen: 'Root'});
};
