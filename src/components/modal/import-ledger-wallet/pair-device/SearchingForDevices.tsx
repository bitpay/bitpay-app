import React from 'react';
import BluetoothIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import UsbIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import {H4, Paragraph} from '../../../styled/Text';
import {
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../import-ledger-wallet.styled';
import RadiatingLineAnimation from '../import-account/RadiatingLineAnimation';

interface Props {
  transportType: 'ble' | 'hid' | null;
}

export const SearchingForDevices: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header>
        <H4>Searching for Devices</H4>
      </Header>

      {props.transportType === 'ble' ? (
        <>
          <DescriptionRow>
            <Paragraph style={{textAlign: 'center'}}>
              Double-check that Bluetooth is enabled and your hardware wallet is
              unlocked to proceed.
            </Paragraph>
          </DescriptionRow>

          <RadiatingLineAnimation
            icon={BluetoothIconSvg}
            height={60}
            width={60}
          />
        </>
      ) : props.transportType === 'hid' ? (
        <>
          <DescriptionRow>
            <Paragraph style={{textAlign: 'center'}}>
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
