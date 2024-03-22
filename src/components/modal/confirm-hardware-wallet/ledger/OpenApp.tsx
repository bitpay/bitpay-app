import React from 'react';
import styled from 'styled-components/native';
import LedgerLogoIconSvg from '../../../../../assets/img/icon-ledger-logo.svg';
import BluetoothIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import UsbIconSvg from '../../../../../assets/img/icon-usb.svg';
import {H3, Paragraph} from '../../../styled/Text';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';
import Button from '../../../../components/button/Button';

const IconWrapper = styled.View`
  padding: 28px;
`;

export const OpenApp: React.FC<{
  connectionMethod: 'ble' | 'hid' | null;
}> = props => {
  return (
    <>
      <Wrapper>
        <Header
          style={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            display: 'flex',
          }}>
          <H3>Approve on your Ledger</H3>
        </Header>

        <DescriptionRow
          style={{
            flexGrow: 0,
          }}>
          <Paragraph
            style={{
              textAlign: 'center',
            }}>
            Ensure it's unlocked and set to the appropriate currency
            application.
          </Paragraph>
        </DescriptionRow>

        <IconRow>
          <IconWrapper>
            {props.connectionMethod === 'ble' ? (
              <BluetoothIconSvg height={60} width={60} />
            ) : props.connectionMethod === 'hid' ? (
              <UsbIconSvg height={60} width={60} />
            ) : (
              <LedgerLogoIconSvg height={60} width={60} />
            )}
          </IconWrapper>
        </IconRow>

        <ActionsRow>
          <Button state={'loading'}>Sending...</Button>
        </ActionsRow>
      </Wrapper>
    </>
  );
};
