import {Wallet} from '../wallet/wallet.models';

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
  wallets: ZenLedgerWalletObj[];
};

export type ZenLedgerWalletObj = {
  wallet: Wallet;
  fiatBalance: string;
  checked: boolean;
};
