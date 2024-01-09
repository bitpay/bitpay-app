import styled from 'styled-components/native';
import {Warning25} from '../../../../styles/colors';
import {H3, Paragraph as _Paragraph} from '../../../styled/Text';
import {
  ViaBluetoothButton,
  ViaUsbButton,
} from '../components/ViaTransportButton';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../import-ledger-wallet.styled';

interface Props {
  error: string;
  onConnectBle: () => void;
  onConnectHid: () => void;
}

const Paragraph = styled(_Paragraph)`
  background-color: ${Warning25};
  border-radius: 12px;
  padding: 20px;
`;

export const PairingError: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header>
        <H3>An Error Has Occured</H3>
      </Header>

      <DescriptionRow>
        <Paragraph>{props.error}</Paragraph>
      </DescriptionRow>

      <ActionsRow>
        <ViaBluetoothButton onPress={props.onConnectBle}>
          Connect via Bluetooth
        </ViaBluetoothButton>

        <ViaUsbButton secondary={true} onPress={props.onConnectHid}>
          Connect via USB
        </ViaUsbButton>
      </ActionsRow>
    </Wrapper>
  );
};
