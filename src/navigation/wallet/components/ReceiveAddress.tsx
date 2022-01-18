import React, {useState} from 'react';
import {BaseText} from '../../../components/styled/Text';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '../../../store';
import BottomPopupModal from '../../../components/modal/base/bottom-popup/BottomPopupModal';
import {WalletActions} from '../../../store/wallet';
import {Asset} from '../../../store/wallet/wallet.models';
import {useLogger} from '../../../utils/hooks';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {BWCErrorMessage} from '../../../constants/BWCError';
import merge from 'lodash.merge';
import {ValidateAddress} from '../../../constants/validateAddress';
import {CustomErrorMessage} from './ErrorMessages';

export interface ReceiveAddressConfig {
  keyId: string;
  id: string;
}

interface Address {
  address: string;
  coin: string
}

const ReceiveAddress = () => {
  const dispatch = useDispatch();
  const logger = useLogger();
  const isVisible = useSelector(
    ({WALLET}: RootState) => WALLET.showReceiveAddressModal,
  );
  const receiveAddressConfig = useSelector(
    ({WALLET}: RootState) => WALLET.receiveAddressConfig,
  );

  const {keyId, id: assetId} = receiveAddressConfig || {};

  const {assets} =
    useSelector(({WALLET}: RootState) => keyId && WALLET.wallets[keyId]) || {};
  const asset: Asset | undefined = assets?.find(({id}) => id === assetId);
  const dismissModal = () => {
    dispatch(WalletActions.dismissReceiveAddressModal());
  };

  const showErrorMessage = (msg: BottomNotificationConfig) => {
    dispatch(WalletActions.dismissReceiveAddressModal());

    setTimeout(() => {
      dispatch(showBottomNotificationModal(msg));
    }, 500); // Wait to close Decrypt Password modal
  };

  let [retryCount, setRetryCount] = useState(0);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const createAddress = async () => {
    const assetCopy = merge(asset, {});
    const {token, network} = assetCopy.credentials;
    if (token) {
      assetCopy.id.replace(`-${token.address}`, '');
    }

    await assetCopy.createAddress({}, (err: any, addressObj: Address) => {
      if (err) {
        let prefix = 'Could not create address';
        if (err.message && err.message === 'MAIN_ADDRESS_GAP_REACHED') {
          logger.warn(BWCErrorMessage(err, 'Server Error'));
          assetCopy.getMainAddresses(
            {
              reverse: true,
              limit: 1,
            },
            (e: any, addr: Address[]) => {
              if (e) {
                showErrorMessage(CustomErrorMessage(BWCErrorMessage(e)));
              }
              setLoading(false);
              setAddress(addr[0].address);
            },
          );
        } else {
          showErrorMessage(CustomErrorMessage(BWCErrorMessage(err, prefix)));
        }
        logger.warn(BWCErrorMessage(err, 'Receive'));
      } else if (addressObj && !ValidateAddress(addressObj.address, addressObj.coin, network)) {
        logger.error(`Invalid address generated: ${addressObj.address}`);
        if (retryCount < 3) {
          setRetryCount(++retryCount);
          createAddress();
        } else {
          showErrorMessage(CustomErrorMessage(BWCErrorMessage(err)));
        }
      } else if (addressObj) {
        setLoading(false);
        setAddress(addressObj.address);
      }
    });
  };

  if (asset && asset.isComplete()) {
    logger.info(`Creating address for wallet: ${assetId}`);
    if (!address) {
      createAddress();
    }
  } else {
    //TODO: needs backup modal
    dismissModal();
  }

  return (
    <BottomPopupModal isVisible={isVisible} onBackdropPress={dismissModal}>
      {address ? <BaseText>{address}</BaseText> : null}
      {loading ? <BaseText>Loading</BaseText> : null}
    </BottomPopupModal>
  );
};

export default ReceiveAddress;
