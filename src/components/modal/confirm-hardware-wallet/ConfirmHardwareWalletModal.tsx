import Transport from '@ledgerhq/hw-transport';
import React from 'react';
import {SupportedHardwareSource} from '../../../store/wallet/wallet.models';
import {SheetContainer} from '../../styled/Containers';
import SheetModal from '../base/sheet/SheetModal';
import {ConfirmLedger} from './ledger/ConfirmLedger';

export type SimpleConfirmPaymentState = 'sending' | 'complete';

interface ConfirmHardwareWalletModalProps extends IConfirmHardwareWalletProps {
  onBackdropPress: () => void;
  isVisible: boolean;
  hardwareSource: SupportedHardwareSource;
}

export interface IConfirmHardwareWalletProps {
  onPaired: (args: {transport: Transport}) => void;
  state?: SimpleConfirmPaymentState | null;
  transport?: Transport | null;
}

/**
 * Simple modal to quickly pair a hardware wallet for sending a payment. For use on payment confirm, etc.
 *
 * @param props
 * @returns
 */
export const ConfirmHardwareWalletModal: React.FC<
  ConfirmHardwareWalletModalProps
> = props => {
  return (
    <SheetModal
      isVisible={props.isVisible}
      onBackdropPress={props.onBackdropPress}>
      <SheetContainer>
        {props.hardwareSource === 'ledger' ? (
          <ConfirmLedger
            transport={props.transport}
            state={props.state}
            onPaired={props.onPaired}
          />
        ) : null}
      </SheetContainer>
    </SheetModal>
  );
};
