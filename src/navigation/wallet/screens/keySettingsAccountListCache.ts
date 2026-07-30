import type {AccountRowProps} from '../../../components/list/AccountListRow';
import type {Key} from '../../../store/wallet/wallet.models';
import {resolveAccountListSnapshot} from '../../../store/wallet/utils/accountListCache';
import {buildAccountList} from '../../../store/wallet/utils/wallet';

const KEY_SETTINGS_ACCOUNT_LIST_CACHE_PREFIX = 'keySettingsAccountList:';

type BuildAccountListDispatch = Parameters<typeof buildAccountList>[3];

export const getKeySettingsAccountListCacheKey = (keyId: string): string =>
  `${KEY_SETTINGS_ACCOUNT_LIST_CACHE_PREFIX}${keyId}`;

export const getKeySettingsAccountListSignature = (key: Key): string =>
  JSON.stringify({
    wallets: key.wallets.map(wallet => ({
      id: wallet.id,
      keyId: wallet.keyId,
      currencyAbbreviation: wallet.currencyAbbreviation,
      chain: wallet.chain,
      network: wallet.network,
      receiveAddress: wallet.receiveAddress,
      tokenAddress: wallet.tokenAddress,
      walletName: wallet.walletName || wallet.credentials?.walletName,
      account: wallet.credentials?.account,
      hideWallet: wallet.hideWallet,
      hideWalletByAccount: wallet.hideWalletByAccount,
      img: typeof wallet.img === 'string' ? wallet.img : undefined,
      badgeImg:
        typeof wallet.badgeImg === 'string' ? wallet.badgeImg : undefined,
    })),
    accounts: Object.entries(key.evmAccountsInfo || {})
      .sort(([addressA], [addressB]) => addressA.localeCompare(addressB))
      .map(([address, info]) => ({
        address,
        name: info.name,
        hideAccount: info.hideAccount,
      })),
  });

export const resolveKeySettingsAccountList = ({
  key,
  defaultAltCurrencyIsoCode,
  dispatch,
}: {
  key: Key;
  defaultAltCurrencyIsoCode: string;
  dispatch: BuildAccountListDispatch;
}): AccountRowProps[] =>
  resolveAccountListSnapshot({
    cacheKey: getKeySettingsAccountListCacheKey(key.id),
    signature: getKeySettingsAccountListSignature(key),
    build: () =>
      buildAccountList(key, defaultAltCurrencyIsoCode, {}, dispatch, {
        skipFiatCalculations: true,
      }),
  });
