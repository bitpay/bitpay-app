import React from 'react';
import BluetoothIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import UsbIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import {H3, Paragraph} from '../../../styled/Text';
import {
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../import-ledger-wallet.styled';

interface Props {
  transportType: 'ble' | 'hid' | null;
}

export const SearchingForDevices: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header>
        <H3>Searching for Devices</H3>
      </Header>

      {props.transportType === 'ble' ? (
        <>
          <DescriptionRow>
            <Paragraph>
              Double-check that Bluetooth is enabled and your hardware wallet is
              unlocked to proceed.
            </Paragraph>
          </DescriptionRow>

          <IconRow>
            <BluetoothIconSvg />
          </IconRow>
        </>
      ) : props.transportType === 'hid' ? (
        <>
          <DescriptionRow>
            <Paragraph>
              Double-check that the USB cable is securely connected and your
              hardware wallet is unlocked to proceed.
            </Paragraph>
          </DescriptionRow>

          <IconRow>
            <UsbIconSvg />
          </IconRow>
        </>
      ) : null}
    </Wrapper>
  );
};
