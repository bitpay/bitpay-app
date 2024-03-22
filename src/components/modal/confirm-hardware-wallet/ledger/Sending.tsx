import styled from 'styled-components/native';
import BluetoothIconSvg from '../../../../../assets/img/icon-bluetooth.svg';
import LedgerLogoIconSvg from '../../../../../assets/img/icon-ledger-logo.svg';
import UsbIconSvg from '../../../../../assets/img/icon-usb.svg';
import Button from '../../../../components/button/Button';
import {H3, Paragraph} from '../../../../components/styled/Text';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  IconRow,
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';

interface Props {
  connectionMethod: 'ble' | 'hid' | null;
  currencyLabel: string;
}

const IconWrapper = styled.View`
  padding: 28px;
`;

export const ConfirmLedgerSending: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header
        style={{
          flexGrow: 1,
          justifyContent: 'flex-end',
          display: 'flex',
        }}>
        <H3>Approving...</H3>
      </Header>

      <DescriptionRow
        style={{
          flexGrow: 0,
        }}>
        <Paragraph
          style={{
            textAlign: 'center',
          }}>
          Approve the transaction from your ledger device. Ensure it's unlocked
          and set to the appropriate currency application.
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
  );
};
