import {
  getAccountAddress,
  getAddressFrom,
  isSameAddress,
} from '../../store/wallet-connect-v2/wallet-connect-v2.effects';
import {
  WCV2RequestType,
  WCV2SessionType,
} from '../../store/wallet-connect-v2/wallet-connect-v2.models';

export const getSessionAddresses = (session: WCV2SessionType): string[] =>
  (session.accounts || []).map(getAccountAddress);

export const matchesAccountRoute = (
  request: WCV2RequestType,
  {
    selectedAccountAddress,
    topic,
  }: {selectedAccountAddress?: string; topic?: string},
): boolean => {
  if (request.topic !== topic) {
    return false;
  }

  const addressFrom = getAddressFrom(request);

  return !!addressFrom && isSameAddress(addressFrom, selectedAccountAddress);
};
