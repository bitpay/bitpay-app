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
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';

interface Props {
  connectionMethod: 'ble' | 'hid' | null;
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
        <IconWrapper>
          {props.connectionMethod === 'ble' ? (
            <BluetoothIconSvg height={40} width={40} />
          ) : props.connectionMethod === 'hid' ? (
            <UsbIconSvg height={40} width={40} />
          ) : (
            <LedgerLogoIconSvg height={40} width={40} />
          )}
        </IconWrapper>

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
          and on the correct currency.
        </Paragraph>
      </DescriptionRow>

      <ActionsRow>
        <Button state={'loading'}>Sending...</Button>
      </ActionsRow>
    </Wrapper>
  );
};
