import {ReceivingAddress} from '../../../store/bitpay-id/bitpay-id.models';
import {IsERCToken} from '../../../store/wallet/utils/currency';

export function getReceivingAddressChain({
  chain,
  currency,
}: ReceivingAddress): string {
  return chain || (IsERCToken(currency) ? 'eth' : currency);
}
