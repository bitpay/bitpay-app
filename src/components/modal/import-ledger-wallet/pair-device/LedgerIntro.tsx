import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import React, {useState} from 'react';
import styled from 'styled-components/native';
import ConnectToLedgerSvg from '../../../../../assets/img/connect-to-ledger.svg';
import {H3, Paragraph} from '../../../styled/Text';
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

        <H3>Connect to Ledger Nano X</H3>
      </Header>

      <DescriptionRow>
        {noSupportedTransportTypes ? (
          <Paragraph>
            This device does not support communication with Ledger wallets.
          </Paragraph>
        ) : (
          <Paragraph>
            Manage your Ledger Nano X, check balances, deposit, and withdraw
            funds between wallets.
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
