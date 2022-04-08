import {WalletScreens} from '../../navigation/wallet/WalletStack';
import {navigationRef} from '../../Root';
import {Effect} from '../index';
import {GetPayProOptions} from '../wallet/effects/paypro/paypro';
import {GetPayProUrl} from '../wallet/utils/decode-uri';
import {
  IsValidPayPro,
  isValidWalletConnectUri,
} from '../wallet/utils/validations';
export const incomingData =
  (data: string): Effect<Promise<void>> =>
  async () => {
    // TODO incoming data handler
    if (IsValidPayPro(data)) {
      const payProUrl = GetPayProUrl(data);
      const payProOptions = await GetPayProOptions(payProUrl);
      navigationRef.navigate('Wallet', {
        screen: WalletScreens.PAY_PRO_CONFIRM,
        params: {
          payProOptions,
        },
      });
    } else if (isValidWalletConnectUri(data)) {
      navigationRef.navigate('WalletConnect', {
        screen: 'Root',
        params: {
          uri: data,
        },
      });
    }
  };
