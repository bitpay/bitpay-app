import React, {useEffect, useState} from 'react';
import {RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTheme} from '../../../../../contexts';
import moment from 'moment';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {moonpaySwapTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
import MoonpayLogo from '../../../../../components/icons/external-services/moonpay/moonpay-logo';
import {
  useAppDispatch,
  useLogger,
  useAppSelector,
} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {Status} from '../../../../../navigation/services/swap-crypto/utils/thorswap-utils';
import {
  getMoonpaySwapChainId,
  getMoonpaySwapError,
  moonpaySwapEnv,
  moonpaySwapGetStatusColor,
  moonpaySwapGetStatusDetails,
} from '../../../../../navigation/services/swap-crypto/utils/moonpay-swap-utils';
import {MOONPAY_SUPPORT_URL} from '../../../../services/buy-crypto/utils/moonpay-utils';
import {
  RowDataContainer,
  CryptoAmountContainer,
  CryptoTitle,
  CryptoContainer,
  CryptoAmount,
  CryptoUnit,
  RowLabel,
  RowData,
  LabelTip,
  LabelTipText,
  ColumnDataContainer,
  ColumnData,
  RemoveCta,
  CopiedContainer,
  CopyImgContainerRight,
  ExternalServiceContainer,
} from '../styled/ExternalServicesDetails';
import {Link} from '../../../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {
  MoonpaySwapStatus,
  MoonpaySwapStatusData,
  MoonpaySwapStatusRequestData,
} from '../../../../../store/swap-crypto/models/moonpay-swap.models';
import {RootState} from '../../../../../store';
import {Key, Wallet} from '../../../../../store/wallet/wallet.models';

export interface MoonpaySwapDetailsProps {
  swapTx: moonpaySwapTxData;
}

const MoonpaySwapDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: MoonpaySwapDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const allKeys: {[key: string]: Key} = useAppSelector(
    ({WALLET}: RootState) => WALLET.keys,
  );
  const [status, setStatus] = useState<Status>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedPayinAddress, setCopiedPayinAddress] = useState(false);
  const [copiedPayinExtraId, setCopiedPayinExtraId] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(moonpaySwapGetStatusDetails(swapTx.status));
  };

  const getStatus = async (force?: boolean) => {
    if (
      [MoonpaySwapStatus.completed, MoonpaySwapStatus.success].includes(
        swapTx.status,
      ) &&
      !force
    ) {
      return;
    }

    const reqData: MoonpaySwapStatusRequestData = {
      env: moonpaySwapEnv,
      txId: swapTx.txId,
    };
    if (!swapTx.txId && swapTx.txHash) {
      reqData.txHash = swapTx.txHash;
      reqData.chainId = swapTx.chainFrom
        ? getMoonpaySwapChainId(swapTx.chainFrom)
        : undefined;
    }

    const walletIsSupported = (wallet: Wallet): boolean =>
      !!(wallet.credentials && wallet.isComplete());

    const selectedWallet = Object.values(allKeys)
      .filter(key => key.backupComplete)
      .flatMap(key => key.wallets ?? [])
      .find(walletIsSupported);

    if (!selectedWallet) {
      logger.error('No supported wallet found for Moonpay Swap status');
      return;
    }

    try {
      const _raw = await selectedWallet.moonpaySwapGetStatus(reqData);
      const statusData: MoonpaySwapStatusData = (_raw as any)?.body ?? _raw;
      const moonpayError = getMoonpaySwapError(statusData);
      if (moonpayError || !statusData?.status) {
        logger.error(
          'Moonpay Swap getStatus Error: ' +
            (moonpayError?.message ?? 'No status received'),
        );
        return;
      }

      let shouldUpdate = false;
      if (statusData.status !== swapTx.status) {
        logger.debug('Updating status to: ' + statusData.status);
        swapTx.status = statusData.status;
        updateStatusDescription();
        shouldUpdate = true;
      }
      if (statusData.dstTxHash && statusData.dstTxHash !== swapTx.dstTxHash) {
        swapTx.dstTxHash = statusData.dstTxHash;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        dispatch(
          SwapCryptoActions.successTxMoonpay({
            moonpaySwapTxData: swapTx,
          }),
        );

        logger.debug('Saved swap with: ' + JSON.stringify(swapTx));
      }
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error('Moonpay Swap getStatus Error: ' + errStr);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getStatus(true), sleep(1000)]);
    setRefreshing(false);
  };

  useEffect(() => {
    updateStatusDescription();
    getStatus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedDepositAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedPayinAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPayinAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedPayinExtraId(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedPayinExtraId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTxHash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTxHash]);

  return (
    <SettingsContainer>
      <SettingsComponent
        refreshControl={
          <RefreshControl
            tintColor={theme.dark ? White : SlateDark}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <ExternalServiceContainer>
          <RowDataContainer>
            <CryptoAmountContainer>
              <CryptoTitle>{t('Receiving amount')}</CryptoTitle>
              <CryptoContainer>
                <CryptoAmount>
                  {swapTx.amountTo.toFixed(8).replace(/\.?0+$/, '')}
                </CryptoAmount>
                <CryptoUnit>{swapTx.coinTo.toUpperCase()}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <MoonpayLogo iconOnly={true} widthIcon={35} heightIcon={35} />
          </RowDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              testID="moonpay-swap-copy-deposit-address-button"
              accessibilityLabel={t('Copy deposit address')}
              onPress={() => {
                copyText(swapTx.addressTo);
                setCopiedDepositAddress(true);
              }}>
              <RowLabel>{t('Deposit address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.addressTo}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedDepositAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          {swapTx.chainTo && (
            <RowDataContainer style={{marginTop: 20}}>
              <RowLabel>{t('Deposit Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[swapTx.chainTo.toLowerCase()]?.name ||
                  swapTx.chainTo.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer style={!swapTx.chainTo ? {marginTop: 20} : {}}>
            <RowLabel>{t('Paying')}</RowLabel>
            <RowData>
              {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
            </RowData>
          </RowDataContainer>

          {swapTx.chainFrom && (
            <RowDataContainer>
              <RowLabel>{t('Source Blockchain')}</RowLabel>
              <RowData>
                {BitpaySupportedCoins[swapTx.chainFrom.toLowerCase()]?.name ||
                  swapTx.chainFrom.toUpperCase()}
              </RowData>
            </RowDataContainer>
          )}

          <RowDataContainer>
            <RowLabel>{t('Created')}</RowLabel>
            <RowData>
              {moment(swapTx.date).format('MMM DD, YYYY hh:mm a')}
            </RowData>
          </RowDataContainer>

          {!!swapTx.status && (
            <RowDataContainer>
              <RowLabel>{t('Status')}</RowLabel>
              <RowData
                style={{
                  color: moonpaySwapGetStatusColor(swapTx.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          {status.statusDescription ? (
            <LabelTip type="info">
              <LabelTipText>{status.statusDescription}</LabelTipText>
              {[
                MoonpaySwapStatus.failed,
                MoonpaySwapStatus.expired,
                MoonpaySwapStatus.requiresRefund,
              ].includes(swapTx.status) ? (
                <TouchableOpacity
                  testID="moonpay-swap-support-link"
                  accessibilityLabel={t('Contact Moonpay support')}
                  onPress={() => {
                    haptic('impactLight');
                    dispatch(openUrlWithInAppBrowser(MOONPAY_SUPPORT_URL));
                  }}>
                  <Link style={{marginTop: 10}}>
                    {t('Contact the Moonpay support team.')}
                  </Link>
                </TouchableOpacity>
              ) : null}
            </LabelTip>
          ) : null}

          <ColumnDataContainer>
            <TouchableOpacity
              testID="moonpay-swap-copy-payin-address-button"
              accessibilityLabel={t('Copy pay-in address')}
              onPress={() => {
                copyText(swapTx.payinAddress);
                setCopiedPayinAddress(true);
              }}>
              <RowLabel>{t('Exchange address (Payin)')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.payinAddress}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedPayinAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          {swapTx.payinExtraId ? (
            <ColumnDataContainer>
              <TouchableOpacity
                testID="moonpay-swap-copy-payin-extra-id-button"
                accessibilityLabel={t('Copy pay-in extra ID')}
                onPress={() => {
                  copyText(swapTx.payinExtraId!);
                  setCopiedPayinExtraId(true);
                }}>
                <RowLabel>{t('Destination Tag (Payin Extra Id)')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {swapTx.payinExtraId}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedPayinExtraId ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          {swapTx.txHash ? (
            <ColumnDataContainer>
              <TouchableOpacity
                testID="moonpay-swap-copy-transaction-hash-button"
                accessibilityLabel={t('Copy transaction hash')}
                onPress={() => {
                  copyText(swapTx.txHash);
                  setCopiedTxHash(true);
                }}>
                <RowLabel>{t('Exchange Transaction Hash')}</RowLabel>
                <CopiedContainer>
                  <ColumnData style={{maxWidth: '90%'}}>
                    {swapTx.txHash}
                  </ColumnData>
                  <CopyImgContainerRight style={{minWidth: '10%'}}>
                    {copiedTxHash ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </TouchableOpacity>
            </ColumnDataContainer>
          ) : null}

          <RemoveCta
            testID="moonpay-swap-remove-swap-button"
            accessibilityLabel={t('Remove swap')}
            onPress={async () => {
              haptic('impactLight');
              dispatch(
                showBottomNotificationModal({
                  type: 'question',
                  title: t('Removing transaction data'),
                  message: t(
                    "The data of this swap will be deleted from your device. Make sure you don't need it",
                  ),
                  enableBackdropDismiss: true,
                  actions: [
                    {
                      text: t('REMOVE'),
                      action: () => {
                        dispatch(dismissBottomNotificationModal());
                        dispatch(
                          SwapCryptoActions.removeTxMoonpay({
                            txId: swapTx.txId,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {},
                    },
                  ],
                }),
              );
            }}>
            <Text style={{color: 'red'}}>{t('Remove')}</Text>
          </RemoveCta>
        </ExternalServiceContainer>
      </SettingsComponent>
    </SettingsContainer>
  );
};

export default MoonpaySwapDetails;
