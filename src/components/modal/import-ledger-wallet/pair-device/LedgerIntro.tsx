import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import React, {useState} from 'react';
import styled from 'styled-components/native';
import ConnectToLedgerSvg from '../../../../../assets/img/connect-to-ledger.svg';
import {H4, Paragraph} from '../../../styled/Text';
import {useMount} from '../../../../utils/hooks';
import {
  ActionsRow,
  DescriptionRow,
  Header,
} from '../import-ledger-wallet.styled';
import {
  ViaBluetoothButton,
  ViaUsbButton,
} from '../components/ViaTransportButton';

interface Props {
  onConnectBle: () => void;
  onConnectHid: () => void;
}

const HeaderImageWrapper = styled.View`
  margin-bottom: 32px;
`;

export const LedgerIntro: React.FC<Props> = props => {
  const [supportedTypes, setSupportedTypes] = useState<{
    ble: boolean;
    hid: boolean;
  } | null>(null);
  const noSupportedTransportTypes =
    supportedTypes && !supportedTypes.ble && !supportedTypes.hid;

  useMount(() => {
    Promise.all([TransportBLE.isSupported(), TransportHID.isSupported()]).then(
      ([hasBleSupport, hasHidSupport]) => {
        setSupportedTypes({
          ble: hasBleSupport,
          hid: hasHidSupport,
        });
      },
    );
  });

  return (
    <>
      <Header>
        <HeaderImageWrapper>
          <ConnectToLedgerSvg />
        </HeaderImageWrapper>

        <H4 style={{fontWeight: '500'}}>Connect to Ledger Wallet</H4>
      </Header>

      <DescriptionRow>
        {noSupportedTransportTypes ? (
          <Paragraph style={{textAlign: 'center'}}>
            This device does not support communication with Ledger wallets.
          </Paragraph>
        ) : (
          <Paragraph style={{textAlign: 'center'}}>
            Manage your Ledger with BitPay. To continue, ensure your Ledger
            device is unlocked.
          </Paragraph>
        )}
      </DescriptionRow>

      {supportedTypes ? (
        <ActionsRow>
          {supportedTypes.ble ? (
            <ViaBluetoothButton onPress={props.onConnectBle}>
              Connect via Bluetooth
            </ViaBluetoothButton>
          ) : null}
          {supportedTypes.hid ? (
            <ViaUsbButton secondary={true} onPress={props.onConnectHid}>
              Connect via USB
            </ViaUsbButton>
          ) : null}
        </ActionsRow>
      ) : null}
    </>
  );
};
