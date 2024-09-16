import React, {useCallback, useEffect, useRef, useState} from 'react';
import Transport from '@ledgerhq/hw-transport';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../constants/config';
import {AppActions} from '../../../store/app';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {SheetContainer} from '../../styled/Containers';
import SheetModal from '../base/sheet/SheetModal';
import {ImportAccount} from './import-account/ImportAccount';
import {PairDevice} from './pair-device/PairDevice';
import {Wallet} from '../../../store/wallet/wallet.models';
import {
  deleteKey,
  successCreateKey,
} from '../../../store/wallet/wallet.actions';
import {setHomeCarouselConfig} from '../../../store/app/app.actions';
import {sleep} from '../../../utils/helper-methods';
import {startUpdateAllKeyAndWalletStatus} from '../../../store/wallet/effects/status/status';

export const ImportLedgerWalletModal = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.isImportLedgerModalVisible);
  const [transport, setTransport] = useState<Transport | null>(null);
  const [scannedWalletsIds, setScannedWalletsIds] = useState<string[]>();
  const homeCarouselConfig = useAppSelector(({APP}) => APP.homeCarouselConfig);
  const keys = useAppSelector(({WALLET}) => WALLET.keys);

  // provide ref for disconnect function to avoid closure'd value
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  // provide ref for disconnect function to avoid closure'd value
  const transportRef = useRef(transport);
  transportRef.current = transport;

  // We need a constant fn (no deps) that persists across renders that we can attach to AND detach from transports
  const onDisconnect = useCallback(async () => {
    let retryAttempts = 2;
    let newTp: Transport | null = null;

    // avoid closure values
    const isBle = transportRef.current instanceof TransportBLE;
    const isHid = transportRef.current instanceof TransportHID;
    const shouldReconnect = isVisibleRef.current && (isBle || isHid);

    if (!shouldReconnect) {
      setTransport(null);
      return;
    }

    // try to reconnect a few times
    while (!newTp && retryAttempts > 0) {
      if (isBle) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      } else if (isHid) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      }

      retryAttempts--;
    }

    if (newTp) {
      newTp.on('disconnect', onDisconnect);
    }

    setTransport(newTp);
  }, []);

  const onBackdropPress = async () => {
    if (scannedWalletsIds) {
      const key = keys['readonly/ledger'];
      const walletsToRemove = scannedWalletsIds;
      const walletsToPersist = key.wallets.filter(
        (wallet: Wallet) => !walletsToRemove?.includes(wallet.id),
      );
      key.wallets = [...walletsToPersist];
      if (key.wallets.length === 0) {
        dispatch(deleteKey({keyId: key.id}));
        dispatch(
          setHomeCarouselConfig(
            homeCarouselConfig.filter(item => item.id !== key.id),
          ),
        );
      } else {
        dispatch(
          successCreateKey({
            key,
          }),
        );
      }
      dispatch(
        startUpdateAllKeyAndWalletStatus({
          context: 'importLedger',
          force: true,
        }),
      );
    }
    dispatch(AppActions.importLedgerModalToggled(false));
  };

  const onPaired = async (openedTransport: Transport) => {
    /**
     * Ledger transport can disconnect when:
     * - power off
     * - screensaver
     * - switching ledger apps
     * - unplugged (connecting via USB) or bluetooth turned off
     *
     * Whatever the reason, connection is no good so we clear the state so user is prompted to connect again.
     */
    openedTransport.on('disconnect', onDisconnect);

    setTransport(openedTransport);
  };

  /**
   * Resets the transport state, or persists it if a BLE connection is still open.
   */
  const resetTransportIfNeeded = () => {
    if (transport) {
      /**
       * BLE transport will stay open to try and avoid unnecessary repeated connections.
       * If still connected, persist the transport for the next time the modal is opened.
       *
       * TODO: allow user to close connection manually? (to switch devices, switch to USB connection, etc.)
       */
      if (transport instanceof TransportBLE) {
        // extra const just to make it easier to read
        const isDisconnected = !transport.notYetDisconnected;

        if (isDisconnected) {
          setTransport(null);
        }
      } else {
        // any other transports we clear the state on close
        setTransport(null);
      }
    }
  };

  const onComplete = () => {
    resetTransportIfNeeded();
    dispatch(AppActions.importLedgerModalToggled(false));
  };

  useEffect(() => {
    // reset the transport and scanned wallets if this modal is closed
    if (!isVisible) {
      resetTransportIfNeeded();
      setScannedWalletsIds(undefined);
    }
  }, [isVisible]);

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onBackdropPress}>
      <SheetContainer>
        {transport ? (
          <ImportAccount
            transport={transport}
            setHardwareWalletTransport={setTransport}
            setScannedWalletsIds={setScannedWalletsIds}
            scannedWalletsIds={scannedWalletsIds}
            onDisconnect={onDisconnect}
            onComplete={onComplete}
          />
        ) : (
          <PairDevice onPaired={onPaired} />
        )}
      </SheetContainer>
    </SheetModal>
  );
};
