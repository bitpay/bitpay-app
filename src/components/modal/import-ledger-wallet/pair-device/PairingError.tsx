import {H3, Paragraph as _Paragraph} from '../../../styled/Text';
import {
  ViaBluetoothButton,
  ViaUsbButton,
} from '../components/ViaTransportButton';
import {ActionsRow, Header, Wrapper} from '../import-ledger-wallet.styled';
import {ErrorDescriptionColumn} from '../components/ErrorDescriptionColumn';

interface Props {
  error: string;
  onConnectBle: () => void;
  onConnectHid: () => void;
}

export const PairingError: React.FC<Props> = props => {
  return (
    <Wrapper>
      <Header>
        <H3>An Error Has Occured</H3>
      </Header>

      <ErrorDescriptionColumn error={props.error} />

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
