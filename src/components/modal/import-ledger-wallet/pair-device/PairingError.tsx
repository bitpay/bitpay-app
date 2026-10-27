import {useTranslation} from 'react-i18next';
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
  const {t} = useTranslation();

  return (
    <Wrapper>
      <Header>
        <H3>{t('An Error Has Occured')}</H3>
      </Header>

      <ErrorDescriptionColumn error={props.error} />

      <ActionsRow>
        <ViaBluetoothButton onPress={props.onConnectBle}>
          {t('Connect via Bluetooth')}
        </ViaBluetoothButton>

        <ViaUsbButton secondary={true} onPress={props.onConnectHid}>
          {t('Connect via USB')}
        </ViaUsbButton>
      </ActionsRow>
    </Wrapper>
  );
};
