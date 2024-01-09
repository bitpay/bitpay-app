import Transport from '@ledgerhq/hw-transport';
import React, {useState} from 'react';
import {WalletActions} from '../../../../store/wallet';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {useAppDispatch} from '../../../../utils/hooks';
import {SupportedLedgerAppNames} from '../utils';
import {NameYourWallet} from './NameYourWallet';
import {SelectLedgerCurrency} from './SelectLedgerCurrency';

interface ImportAccountProps {
  transport: Transport;
  onRequestQuitApp: (transport: Transport) => Promise<any>;
  onRequestOpenApp: (
    transport: Transport,
    name: SupportedLedgerAppNames,
  ) => Promise<any>;
  onComplete: () => void;
}

export const ImportAccount: React.FC<ImportAccountProps> = props => {
  const dispatch = useAppDispatch();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const onImported = (wallet: Wallet) => {
    setWallet(wallet);
  };

  const onSubmitName = async (name: string) => {
    if (!wallet) {
      return;
    }

    await dispatch(
      WalletActions.updateWalletName({
        keyId: wallet.keyId,
        walletId: wallet.id,
        name,
      }),
    );

    props.onComplete();
  };

  return wallet ? (
    <NameYourWallet wallet={wallet} onSubmitName={onSubmitName} />
  ) : (
    <SelectLedgerCurrency
      transport={props.transport}
      onRequestQuitApp={props.onRequestQuitApp}
      onRequestOpenApp={props.onRequestOpenApp}
      onImported={onImported}
    />
  );
};
