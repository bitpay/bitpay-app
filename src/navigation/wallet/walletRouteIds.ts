type RouteIdArgs<Params> = {
  params: Params;
};

export const getKeyOverviewRouteId = ({
  params,
}: RouteIdArgs<{id: string; context?: string}>) =>
  ['key', params.id, params.context || 'default'].join(':');

export const getAccountDetailsRouteId = ({
  params,
}: RouteIdArgs<{
  keyId: string;
  selectedAccountAddress: string;
  isSvmAccount?: boolean;
}>) =>
  [
    'account',
    params.keyId,
    params.selectedAccountAddress,
    params.isSvmAccount ? 'svm' : 'evm',
  ].join(':');

export const getWalletDetailsRouteId = ({
  params,
}: RouteIdArgs<{walletId: string; copayerId?: string}>) =>
  ['wallet', params.walletId, params.copayerId || ''].join(':');
