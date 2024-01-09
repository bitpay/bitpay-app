import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StatusCodes} from '@ledgerhq/errors';
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
import {
  SupportedLedgerAppNames,
  getCurrentLedgerAppInfo,
  openLedgerApp,
  quitLedgerApp,
} from './utils';

export const ImportLedgerWalletModal = () => {
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.isImportLedgerModalVisible);
  const [transport, setTransport] = useState<Transport | null>(null);

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

  const onBackdropPress = () => {
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
   * Open the given Ledger app when requested by a child component, and resolve once any reconnects are handled.
   *
   * @param transport
   * @param name
   * @returns Promise with the Ledger response Buffer.
   */
  const onRequestOpenApp = (
    transport: Transport,
    name: SupportedLedgerAppNames,
  ) => {
    return new Promise<Buffer>(async (resolve, reject) => {
      let res = Buffer.alloc(0);

      // Opening an app will cause a disconnect so replace the main listener
      // with a temp listener, then resolve once we handle the reconnect
      transport.off('disconnect', onDisconnect);

      const tempCb = async () => {
        let newTp: Transport | null = null;

        if (transport instanceof TransportBLE) {
          newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
        } else if (transport instanceof TransportHID) {
          newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
        }

        if (newTp) {
          newTp.on('disconnect', onDisconnect);

          setTransport(newTp);
          resolve(res);
        } else {
          reject();
        }
      };

      transport.on('disconnect', tempCb);

      try {
        res = await openLedgerApp(transport, name);

        const statusCode = res.readUInt16BE(res.length - 2);

        // if not OK, we won't his the disconnect logic so restore the handler and resolve
        if (statusCode !== StatusCodes.OK) {
          transport.off('disconnect', tempCb);
          transport.on('disconnect', onDisconnect);
          resolve(res);
        }
      } catch (err) {
        transport.off('disconnect', tempCb);
        transport.on('disconnect', onDisconnect);
        reject(err);
      }
    });
  };

  /**
   * Quit the currently running Ledger app (if any) when requested by a child component, and resolve once any reconnects are handled.
   *
   * @param transport
   * @returns Promise void
   */
  const onRequestQuitApp = (transport: Transport) => {
    return new Promise<void>(async (resolve, reject) => {
      // get info for the currently running Ledger app
      const info = await getCurrentLedgerAppInfo(transport);

      // BOLOS is the Ledger OS
      // if we get this back, no apps are open and we can resolve immediately
      if (info.name === 'BOLOS') {
        resolve();
        return;
      }

      // Quitting an app will cause a disconnect so replace the main listener
      // with a temp listener, then resolve once we handle the reconnect.
      transport.off('disconnect', onDisconnect);

      const cb = async () => {
        let newTp: Transport | null = null;

        if (transport instanceof TransportBLE) {
          newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
        } else if (transport instanceof TransportHID) {
          newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT);
        }

        if (newTp) {
          newTp.on('disconnect', onDisconnect);

          setTransport(newTp);
          resolve();
        } else {
          reject();
        }
      };

      transport.on('disconnect', cb);

      try {
        // this should always succeed
        await quitLedgerApp(transport);
      } catch (err) {
        transport.off('disconnect', cb);
        transport.on('disconnect', onDisconnect);
        reject(err);
      }
    });
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
    // reset the transport if this modal is closed
    if (!isVisible) {
      resetTransportIfNeeded();
    }
  }, [isVisible]);

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onBackdropPress}>
      <SheetContainer>
        {transport ? (
          <ImportAccount
            transport={transport}
            onRequestOpenApp={onRequestOpenApp}
            onRequestQuitApp={onRequestQuitApp}
            onComplete={onComplete}
          />
        ) : (
          <PairDevice onPaired={onPaired} />
        )}
      </SheetContainer>
    </SheetModal>
  );
};
