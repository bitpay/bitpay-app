import {SUPPORTED_COINS} from '../../../constants/currencies';
import {ReceivingAddress} from '../../../store/bitpay-id/bitpay-id.models';

export function getReceivingAddressChain({
  chain,
  currency,
}: ReceivingAddress): string {
  return (
    chain ||
    (!SUPPORTED_COINS.includes(currency.toLowerCase()) ? 'ETH' : currency)
  );
}
