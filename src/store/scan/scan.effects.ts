import {navigationRef} from '../../Root';
import {isValidWalletConnectUri} from '../../utils/helper-methods';
import {Effect} from '../index';
export const incomingData =
  (data: string): Effect<Promise<void>> =>
  async () => {
    // TODO incoming data handler
    if (isValidWalletConnectUri(data)) {
      navigationRef.navigate('WalletConnect', {
        screen: 'Root',
        params: {
          uri: data,
        },
      });
    }
  };
