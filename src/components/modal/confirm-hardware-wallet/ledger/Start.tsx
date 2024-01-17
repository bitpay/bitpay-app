import Transport from '@ledgerhq/hw-transport';
import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import React, {useState} from 'react';
import styled from 'styled-components/native';
import LedgerLogoIconSvg from '../../../../../assets/img/icon-ledger-logo.svg';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../constants/config';
import {LogActions} from '../../../../store/log';
import {useAppDispatch, useMount} from '../../../../utils/hooks';
import {H3, Paragraph} from '../../../styled/Text';
import {
  ViaBluetoothButton,
  ViaUsbButton,
} from '../../import-ledger-wallet/components/ViaTransportButton';
import {
  ActionsRow,
  DescriptionRow,
  Header,
  Wrapper,
} from '../../import-ledger-wallet/import-ledger-wallet.styled';
import {checkPermissionsBLE} from '../../import-ledger-wallet/utils';
import {Warning25} from '../../../../styles/colors';
import {SearchingForDevices} from '../../import-ledger-wallet/pair-device/SearchingForDevices';

interface PairHardwareWalletModalProps {
  onPaired: (transport: Transport) => void;
}

const IconWrapper = styled.View`
  padding: 28px;
`;

const ErrParagraph = styled(Paragraph)`
  background-color: ${Warning25};
  border-radius: 12px;
  padding: 20px;
`;

export const ConfirmLedgerStart: React.FC<
  PairHardwareWalletModalProps
> = props => {
  const dispatch = useAppDispatch();
  const [supportedTypes, setSupportedTypes] = useState<{
    ble: boolean;
    hid: boolean;
  } | null>(null);
  const [isConnecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [transportType, setTransportType] = useState<'ble' | 'hid' | null>(
    null,
  );
  const noSupportedTransportTypes =
    supportedTypes && !supportedTypes.ble && !supportedTypes.hid;

  useMount(() => {
    Promise.all([TransportBLE.isSupported(), TransportHID.isSupported()])
      .then(([hasBleSupport, hasHidSupport]) => {
        setSupportedTypes({
          ble: hasBleSupport,
          hid: hasHidSupport,
        });
      })
      .catch(err => {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        setError(
          `An error occurred while checking hardware wallet connection support: ${errMsg}`,
        );
        dispatch(
          LogActions.error(
            `An error occurred while checking hardware wallet transport support: ${errMsg}`,
          ),
        );
      });
  });

  const onPressConnectBle = async () => {
    setError('');
    setConnecting(true);
    setTransportType('ble');

    let transport: Transport | null = null;
    let errorMsg = '';

    const {isAuthorized} = await checkPermissionsBLE();

    if (!isAuthorized) {
      setError('App is not authorized to use Bluetooth.');
      return;
    }

    try {
      transport = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `An error occurred creating BLE transport: ${errorMsg}`,
        ),
      );
    }

    if (transport) {
      props.onPaired(transport);
    } else {
      setError(`Unable to connect via Bluetooth: ${errorMsg}`);
    }

    setConnecting(false);
  };

  const onPressConnectHid = async () => {
    setError('');
    setConnecting(true);
    setTransportType('hid');

    let transport: Transport | null = null;
    let errorMsg = '';

    try {
      transport = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `An error occurred creating HID transport: ${errorMsg}`,
        ),
      );
    }

    if (transport) {
      props.onPaired(transport);
    } else {
      setError(`Unable to connect via USB: ${errorMsg}`);
    }

    setConnecting(false);
  };

  return (
    <>
      {isConnecting ? (
        <SearchingForDevices transportType={transportType} />
      ) : (
        <Wrapper>
          <Header>
            <IconWrapper>
              <LedgerLogoIconSvg height={40} width={40} />
            </IconWrapper>

            <H3>Approve on your Ledger</H3>
          </Header>

          {error ? (
            <DescriptionRow>
              <ErrParagraph>{error}</ErrParagraph>
            </DescriptionRow>
          ) : null}

          {noSupportedTransportTypes ? (
            <DescriptionRow>
              <Paragraph>
                Connecting via Bluetooth or USB not supported by this device.
              </Paragraph>
            </DescriptionRow>
          ) : (
            <>
              <DescriptionRow>
                <Paragraph>
                  Approve the transaction from your ledger device. Ensure it's
                  unlocked and on the correct currency.
                </Paragraph>
              </DescriptionRow>

              {supportedTypes ? (
                <ActionsRow>
                  {supportedTypes.ble ? (
                    <ViaBluetoothButton onPress={onPressConnectBle}>
                      Approve via Bluetooth
                    </ViaBluetoothButton>
                  ) : null}
                  {supportedTypes.hid ? (
                    <ViaUsbButton secondary onPress={onPressConnectHid}>
                      Approve via USB
                    </ViaUsbButton>
                  ) : null}
                </ActionsRow>
              ) : null}
            </>
          )}
        </Wrapper>
      )}
    </>
  );
};
