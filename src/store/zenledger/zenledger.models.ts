import {ReactElement} from 'react';

export type ZenLedgerRequestWalletsType = {
  address: string;
  blockchain: string;
  display_name: string;
};

export type ZenLedgerKey = {
  keyName: string | undefined;
  keyId: string;
  checked: boolean;
  showWallets: boolean;
  wallets: ZenLedgerWallet[];
};

export type ZenLedgerWallet = {
  id: string;
  walletName: string | undefined;
  currencyName: string;
  receiveAddress: string | undefined;
  hideWallet: boolean | undefined;
  hideBalance: boolean | undefined;
  fiatBalance: string;
  img: string | ((props?: any) => ReactElement);
  badgeImg: string | ((props?: any) => ReactElement) | undefined;
  checked: boolean;
};
