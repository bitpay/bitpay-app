import React from 'react';
import BluetoothIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import FailedIconSvg from '../../../../../assets/img/connection-failed.svg';
import SuccessIconSvg from '../../../../../assets/img/connection-succesful.svg';
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
  status: {status: string; message: string; title: string};
}

export const SearchingForDevices: React.FC<Props> = props => {
  const {status, message, title} = props.status;
  return (
    <Wrapper>
      <Header>
        <H4>{title}</H4>
      </Header>

      {props.transportType === 'ble' ? (
        <>
          <DescriptionRow>
            <Paragraph style={{textAlign: 'center'}}>{message}</Paragraph>
          </DescriptionRow>

          {status === 'searching' ? (
            <RadiatingLineAnimation
              icon={BluetoothIconSvg}
              height={60}
              width={60}
            />
          ) : status === 'failed' ? (
            <RadiatingLineAnimation
              icon={FailedIconSvg}
              height={60}
              width={60}
            />
          ) : status === 'success' ? (
            <RadiatingLineAnimation
              icon={SuccessIconSvg}
              height={60}
              width={60}
            />
          ) : null}
        </>
      ) : props.transportType === 'hid' ? (
        <>
          <DescriptionRow>
            <Paragraph style={{textAlign: 'center'}}>{message}</Paragraph>
          </DescriptionRow>
          <IconRow>
            <UsbIconSvg />
          </IconRow>
        </>
      ) : null}
    </Wrapper>
  );
};
