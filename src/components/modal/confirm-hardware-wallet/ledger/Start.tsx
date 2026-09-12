import Transport from '@ledgerhq/hw-transport';
import TransportHID from '@ledgerhq/react-native-hid';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import LedgerLogoIconSvg from '../../../../../assets/img/icon-ledger-logo.svg';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../constants/config';
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
import {SearchingForDevices} from '../../import-ledger-wallet/pair-device/SearchingForDevices';
import {sleep} from '../../../../utils/helper-methods';
import {logManager} from '../../../../managers/LogManager';

interface PairHardwareWalletModalProps {
  onPaired: (transport: Transport) => void;
  currencyLabel: string;
}

const Bold = styled.Text`
  font-weight: 600;
`;

const IconWrapper = styled.View`
  padding: 28px;
`;

export const ConfirmLedgerStart: React.FC<
  PairHardwareWalletModalProps
> = props => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [supportedTypes, setSupportedTypes] = useState<{
    ble: boolean;
    hid: boolean;
  } | null>(null);
  const [isConnecting, setConnecting] = useState(false);
  const [transportType, setTransportType] = useState<'ble' | 'hid' | null>(
    null,
  );
  const [status, setStatus] = useState({
    status: 'searching',
    message: '',
    title: '',
  });
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
        setStatus({
          status: 'failed',
          message: `An error occurred while checking hardware wallet connection support: ${errMsg}`,
          title: t('Connection Failed'),
        });
        logManager.error(
          `An error occurred while checking hardware wallet transport support: ${errMsg}`,
        );
      });
  });

  const onPressConnectBle = async () => {
    setStatus({
      status: 'searching',
      message: t(
        'Double-check that Bluetooth is enabled and your hardware wallet is unlocked to proceed.',
      ),
      title: t('Searching for Devices'),
    });
    setConnecting(true);
    setTransportType('ble');

    let transport: Transport | null = null;
    let errorMsg = '';

    const {isAuthorized} = await checkPermissionsBLE();

    if (!isAuthorized) {
      setStatus({
        status: 'failed',
        message: t('App is not authorized to use Bluetooth.'),
        title: t('Connection Failed'),
      });
      await sleep(7000);
      return;
    }

    try {
      const result = await Promise.all([
        TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT),
        sleep(5000), // Ensure at least 5 seconds delay for a better user experience
      ]);
      transport = result[0];
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`An error occurred creating BLE transport: ${errorMsg}`);
    }

    if (transport) {
      setStatus({
        status: 'success',
        message: t('Your Ledger device was successfully connected.'),
        title: t('Successful Connection'),
      });
      await sleep(7000);
      props.onPaired(transport);
    } else {
      setStatus({
        status: 'failed',
        message: t(
          'Ledger device not found. Please restart your Bluetooth and check the device is in range.',
        ),
        title: t('Connection Failed'),
      });
      await sleep(7000);
    }
    setConnecting(false);
  };

  const onPressConnectHid = async () => {
    setStatus({
      status: 'searching',
      message: t(
        'Double-check that the USB cable is securely connected and your hardware wallet is unlocked to proceed.',
      ),
      title: t('Searching for Devices'),
    });
    setConnecting(true);
    setTransportType('hid');

    let transport: Transport | null = null;
    let errorMsg = '';

    try {
      const result = await Promise.all([
        TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT),
        sleep(5000), // Ensure at least 5 seconds delay for a better user experience
      ]);
      transport = result[0];
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(`An error occurred creating HID transport: ${errorMsg}`);
    }

    if (transport) {
      setStatus({
        status: 'success',
        message: t('Your Ledger device was successfully connected.'),
        title: t('Successful Connection'),
      });
      await sleep(7000);
      props.onPaired(transport);
    } else {
      setStatus({
        status: 'failed',
        message: `Unable to connect via USB: ${errorMsg}`,
        title: t('Connection Failed'),
      });
      await sleep(7000);
    }
    setConnecting(false);
  };

  return (
    <>
      {isConnecting ? (
        <SearchingForDevices transportType={transportType} status={status} />
      ) : (
        <Wrapper>
          <Header>
            <IconWrapper>
              <LedgerLogoIconSvg height={60} width={60} />
            </IconWrapper>

            <H3>{t('Approve on your Ledger')}</H3>
          </Header>

          {noSupportedTransportTypes ? (
            <DescriptionRow>
              <Paragraph>
                {t(
                  'Connecting via Bluetooth or USB not supported by this device.',
                )}
              </Paragraph>
            </DescriptionRow>
          ) : (
            <>
              <DescriptionRow>
                <Paragraph
                  style={{
                    textAlign: 'center',
                  }}>
                  {t(
                    "Approve the transaction from your ledger device. Ensure it's unlocked and set to the appropriate currency application.",
                  )}
                </Paragraph>
              </DescriptionRow>

              {supportedTypes ? (
                <ActionsRow>
                  {supportedTypes.ble ? (
                    <ViaBluetoothButton onPress={onPressConnectBle}>
                      {t('Approve via Bluetooth')}
                    </ViaBluetoothButton>
                  ) : null}
                  {supportedTypes.hid ? (
                    <ViaUsbButton secondary onPress={onPressConnectHid}>
                      {t('Approve via USB')}
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
