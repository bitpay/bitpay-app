import Transport from '@ledgerhq/hw-transport';
import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import {useState} from 'react';
import {IConfirmHardwareWalletProps} from '../ConfirmHardwareWalletModal';
import {ConfirmLedgerComplete} from './Complete';
import {ConfirmLedgerSending} from './Sending';
import {ConfirmLedgerStart} from './Start';

export const ConfirmLedger: React.FC<IConfirmHardwareWalletProps> = props => {
  const [connectionMethod, setConnectionMethod] = useState<
    'ble' | 'hid' | null
  >(
    props.transport instanceof TransportBLE
      ? 'ble'
      : props.transport instanceof TransportHID
      ? 'hid'
      : null,
  );

  const onPaired = (transport: Transport) => {
    const isBle = transport instanceof TransportBLE;
    const isHid = transport instanceof TransportHID;

    setConnectionMethod(isBle ? 'ble' : isHid ? 'hid' : null);
    props.onPaired({transport});
  };

  return (
    <>
      {props.state === 'complete' ? (
        <ConfirmLedgerComplete />
      ) : props.state === 'sending' && connectionMethod ? (
        <ConfirmLedgerSending connectionMethod={connectionMethod} />
      ) : (
        <ConfirmLedgerStart onPaired={onPaired} />
      )}
    </>
  );
};
