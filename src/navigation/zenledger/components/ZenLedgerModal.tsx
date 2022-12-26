import React, {useCallback} from 'react';
import Modal from 'react-native-modal';
import styled from 'styled-components/native';
import {
  ActionContainer,
  ScreenGutter,
  WIDTH,
} from '../../../components/styled/Containers';
import {LightBlack, White} from '../../../styles/colors';
import Button from '../../../components/button/Button';
import {H4, Paragraph, TextAlign} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  setHasViewedZenLedgerWarning,
  showBottomNotificationModal,
} from '../../../store/app/app.actions';
import haptic from '../../../components/haptic-feedback/haptic';
import {getZenLedgerUrl} from '../../../store/zenledger/zenledger.effects';
import {sleep} from '../../../utils/helper-methods';
import {
  Analytics,
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../store/app/app.effects';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {ZenLedgerRequestWalletsType} from '../../../store/zenledger/zenledger.models';
import ZenLedgerLogo from './ZenLedgerLogo';
import {createWalletAddress} from '../../../store/wallet/effects/address/address';

const ZenLedgerModalContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 16}px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-radius: 10px;
  padding: ${ScreenGutter};
`;

const ZenLedgerDescription = styled(Paragraph)`
  color: ${({theme}) => theme.colors.text};
  margin: 10px 0;
  text-align: center;
`;

const ZenLedgerLogoContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin: 16px 0;
`;

interface ZenLedgerModalConfig {
  isVisible: boolean;
  onDismiss: () => any;
}

const ZenLedgerModal: React.VFC<ZenLedgerModalConfig> = props => {
  const {t} = useTranslation();
  const {isVisible, onDismiss} = props;
  const dispatch = useAppDispatch();
  const {keys} = useAppSelector(({WALLET}) => WALLET);
  const hasViewedZenLedgerWarning = useAppSelector(
    ({APP}) => APP.hasViewedZenLedgerWarning,
  );

  const allWallets = Object.values(keys)
    .filter((key: any) => key.backupComplete)
    .flatMap(key => key.wallets)
    .filter(wallet => !wallet.hideWallet && wallet.isComplete());

  const getRequestWallets = async () => {
    let requestWallets: ZenLedgerRequestWalletsType[] = [];

    await Promise.all(
      allWallets.map(async wallet => {
        let {receiveAddress, walletName = '', chain} = wallet;

        if (!receiveAddress) {
          receiveAddress = await dispatch(
            createWalletAddress({wallet, newAddress: false}),
          );
        }

        if (receiveAddress) {
          requestWallets.push({
            address: receiveAddress,
            blockchain: chain,
            display_name: walletName,
          });
        }
      }),
    );

    return requestWallets;
  };

  const showErrorMessage = useCallback(
    async (msg: BottomNotificationConfig) => {
      await sleep(500);
      dispatch(showBottomNotificationModal(msg));
    },
    [dispatch],
  );

  const showWarningMessage = () => {
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: t('Connect to ZenLedger'),
        message: t(
          'After you log in or create a ZenLedger account, BitPay will automatically send your Wallet Addresses to Zenledger to be imported.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {
              haptic('impactLight');
              dispatch(setHasViewedZenLedgerWarning());
              goToZenLedger();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const goToZenLedger = async () => {
    try {
      dispatch(dismissBottomNotificationModal());
      await sleep(500);

      dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
      await sleep(500);
      const requestWallets = await getRequestWallets();
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);

      if (!requestWallets.length) {
        const onDone = () => {
          dispatch(dismissBottomNotificationModal());
        };

        dispatch(
          showBottomNotificationModal({
            title: t('No wallets available'),
            type: 'info',
            message: t('Create or import a wallet, then try again.'),
            actions: [
              {
                text: t('OK'),
                action: () => {
                  onDone();
                },
              },
            ],
            enableBackdropDismiss: true,
            onBackdropDismiss: () => {
              onDone();
            },
          }),
        );
        return;
      }

      dispatch(startOnGoingProcessModal('LOADING'));
      const {url} = await dispatch(getZenLedgerUrl(requestWallets));
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);

      onDismiss();
      await sleep(500);

      dispatch(Analytics.track('Opened ZenLedger'));
      dispatch(openUrlWithInAppBrowser(url));
    } catch (e) {
      onDismiss();
      await sleep(500);

      dispatch(dismissOnGoingProcessModal());
      await sleep(500);

      await showErrorMessage(
        CustomErrorMessage({
          errMsg: BWCErrorMessage(e),
          title: t('Uh oh, something went wrong'),
        }),
      );
    }
  };

  const onContinue = async () => {
    haptic('impactLight');
    dispatch(Analytics.track('Clicked ZenLedger Continue'));
    onDismiss();
    await sleep(500);

    if (!hasViewedZenLedgerWarning) {
      showWarningMessage();
      return;
    }

    goToZenLedger();
  };

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={0.4}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{
        alignItems: 'center',
      }}>
      <ZenLedgerModalContainer>
        <ZenLedgerLogoContainer>
          <ZenLedgerLogo />
        </ZenLedgerLogoContainer>

        <TextAlign align={'center'}>
          <H4>{t('Be Prepared for Tax Season')}</H4>
        </TextAlign>
        <View style={{marginBottom: 16}}>
          <ZenLedgerDescription>
            {t(
              'ZenLedger makes crypto taxes easy. Log in or create a ZenLedger account and BitPay will import your wallets for you.',
            )}
          </ZenLedgerDescription>
        </View>

        <ActionContainer>
          <Button onPress={onContinue}>{t('Continue')}</Button>
        </ActionContainer>
        <ActionContainer>
          <Button
            onPress={() => {
              dispatch(Analytics.track('Clicked ZenLedger Cancel'));
              onDismiss();
            }}
            buttonStyle={'secondary'}
            buttonType={'link'}
            buttonOutline={true}>
            {t('Cancel')}
          </Button>
        </ActionContainer>
      </ZenLedgerModalContainer>
    </Modal>
  );
};

export default ZenLedgerModal;
