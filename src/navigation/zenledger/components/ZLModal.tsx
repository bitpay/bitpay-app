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
import ZenLedgerLogo from '../../../../assets/img/zenledger/zenledger-logo.svg';
import {View} from 'react-native';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
  setHasViewedZenLedgerWarning,
  showBottomNotificationModal,
  showOnGoingProcessModal,
} from '../../../store/app/app.actions';
import haptic from '../../../components/haptic-feedback/haptic';
import {OnGoingProcessMessages} from '../../../components/modal/ongoing-process/OngoingProcess';
import {getZenLedgerUrl} from '../../../store/zenledger/zenledger.effects';
import {sleep} from '../../../utils/helper-methods';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {CustomErrorMessage} from '../../wallet/components/ErrorMessages';
import {BWCErrorMessage} from '../../../constants/BWCError';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import {ZLRequestWalletsType} from '../../../store/zenledger/zenledger.models';

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

const ZenLedgerModal = (props: ZenLedgerModalConfig) => {
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

  const getRequestWallets = () => {
    let requestWallets: ZLRequestWalletsType[] = [];
    allWallets.forEach(wallet => {
      const {receiveAddress, walletName = '', chain} = wallet;
      if (receiveAddress) {
        requestWallets.push({
          address: receiveAddress,
          blockchain: chain,
          display_name: walletName,
        });
      }
    });
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
          'After you create a ZenLedger account or log in with your existing account, BitPay will automatically send your Wallet Addresses to Zenledger to be imported.',
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
      dispatch(showOnGoingProcessModal(t(OnGoingProcessMessages.LOADING)));
      const {url} = (await dispatch<any>(
        getZenLedgerUrl(getRequestWallets()),
      )) as any;
      dispatch(dismissOnGoingProcessModal());
      await sleep(500);
      onDismiss();
      await sleep(500);
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
          <ZenLedgerLogo height={45} />
        </ZenLedgerLogoContainer>

        <TextAlign align={'center'}>
          <H4>{t('Be Prepared for Tax Season')}</H4>
        </TextAlign>
        <View style={{marginBottom: 16}}>
          <ZenLedgerDescription>
            {
              'ZenLedger makes crypto taxes easy. Log In or Create your ZenLedger Account and BitPay will import your wallets for you.'
            }
          </ZenLedgerDescription>
        </View>

        <ActionContainer>
          <Button
            onPress={() => {
              haptic('impactLight');
              if (!hasViewedZenLedgerWarning) {
                showWarningMessage();
              } else {
                goToZenLedger();
              }
            }}>
            {t('Continue')}
          </Button>
        </ActionContainer>
        <ActionContainer>
          <Button
            onPress={onDismiss}
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
