import React, {useEffect, useState} from 'react';
import {RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTheme} from '@react-navigation/native';
import moment from 'moment';
import {Br} from '../../../../../components/styled/Containers';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {thorswapTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
// import {thorswapGetStatus} from '../../../../../store/swap-crypto/effects/thorswap/thorswap';
import ThorswapLogo from '../../../../../components/icons/external-services/thorswap/thorswap-logo';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {
  thorswapGetStatusDetails,
  Status,
  thorswapGetStatusColor,
  thorswapEnv,
} from '../../../../../navigation/services/swap-crypto/utils/thorswap-utils';
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
import {useTranslation} from 'react-i18next';
import CopiedSvg from '../../../../../../assets/img/copied-success.svg';
import {BitpaySupportedCoins} from '../../../../../constants/currencies';
import {sleep} from '../../../../../utils/helper-methods';
import {SlateDark, White} from '../../../../../styles/colors';
import {
  ThorswapGetSwapTxData,
  ThorswapGetSwapTxRequestData,
  ThorswapTrackingStatus,
} from '../../../../../store/swap-crypto/models/thorswap.models';
import {thorswapGetSwapTx} from '../../../../../store/swap-crypto/effects/thorswap/thorswap';
import cloneDeep from 'lodash.clonedeep';

export interface ThorswapDetailsProps {
  swapTx: thorswapTxData;
}

const ThorswapDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: ThorswapDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<Status>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedPayinAddress, setCopiedPayinAddress] = useState(false);
  const [copiedPayinExtraId, setCopiedPayinExtraId] = useState(false);
  const [copiedRefundAddress, setCopiedRefundAddress] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [copiedSupportEmailLabelTip, setCopiedSupportEmailLabelTip] =
    useState(false);
  const [copiedTxHashLabelTip, setCopiedTxHashLabelTip] = useState(false);

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(thorswapGetStatusDetails(swapTx.status));
  };

  const compareAmounts = (amountTo: number, toAmount: string | number) => {
    if (typeof toAmount === 'number') {
      toAmount = toAmount.toString();
    }

    const amountToString = amountTo.toString();
    const decimalIndex = amountToString.indexOf('.');

    const decimalPlaces =
      decimalIndex === -1 ? 0 : amountToString.length - decimalIndex - 1;

    const roundedAmountTo = parseFloat(amountTo.toFixed(decimalPlaces));
    const roundedToAmount = parseFloat(
      parseFloat(toAmount).toFixed(decimalPlaces),
    );

    // Compare the rounded values
    return roundedAmountTo === roundedToAmount;
  };

  const getStatus = async (force?: boolean) => {
    if (
      [
        ThorswapTrackingStatus.completed,
        ThorswapTrackingStatus.success,
      ].includes(swapTx.status) &&
      !force
    ) {
      return;
    }

    const reqData: ThorswapGetSwapTxRequestData = {
      env: thorswapEnv,
      hash: swapTx.txHash,
    };

    try {
      const swapTxData: ThorswapGetSwapTxData = await thorswapGetSwapTx(
        reqData,
      );
      let shouldUpdate = false;
      if (swapTxData?.result) {
        if (
          swapTxData.result.legs &&
          swapTxData.result.legs.length === 1 &&
          swapTxData.result.legs[0].toAmount &&
          !compareAmounts(
            cloneDeep(swapTx.amountTo),
            swapTxData.result.legs[0].toAmount,
          )
        ) {
          logger.debug(
            'Updating amountTo to: ' + swapTxData.result.legs[0].toAmount,
          );
          swapTx.amountTo = Number(swapTxData.result.legs[0].toAmount);
          shouldUpdate = true;
        }
        if (swapTxData.status && swapTxData.status != swapTx.status) {
          logger.debug('Updating status to: ' + swapTxData.status);
          swapTx.status = swapTxData.status;
          updateStatusDescription();
          shouldUpdate = true;
        }
        if (shouldUpdate) {
          dispatch(
            SwapCryptoActions.successTxThorswap({
              thorswapTxData: swapTx,
            }),
          );

          logger.debug('Saved swap with: ' + JSON.stringify(swapTx));
        }
      } else {
        if (!swapTxData) {
          logger.error('Thorswap error: No swapTxData received');
        }
        if (swapTxData.message && typeof swapTxData.message === 'string') {
          logger.error('Thorswap error: ' + swapTxData.message);
        }
        if (swapTxData.error && typeof swapTxData.error === 'string') {
          logger.error('Thorswap error: ' + swapTxData.error);
        }
        if (
          swapTxData.error?.message &&
          typeof swapTxData.error.message === 'string'
        ) {
          logger.error('Thorswap error: ' + swapTxData.error.message);
        }
        if (swapTxData.errors) {
          logger.error(swapTxData.errors);
        }
        let err = t(
          "Can't get order details at this moment. Please try again later",
        );
        if (swapTxData.code && swapTxData.type && swapTxData.message) {
          err = swapTxData.message;
        }
        showThorswapError(err);
      }
    } catch (err) {
      logger.error('Thorswap getStatus Error: ' + JSON.stringify(err));
    }
  };

  const showThorswapError = async (msg?: string) => {
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: t('Error'),
        message: msg ? msg : t('Unknown Error'),
        enableBackdropDismiss: false,
        actions: [
          {
            text: t('OK'),
            action: async () => {
              dispatch(dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
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
      setCopiedRefundAddress(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedRefundAddress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTxHash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTxHash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedSupportEmailLabelTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedSupportEmailLabelTip]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCopiedTxHashLabelTip(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [copiedTxHashLabelTip]);

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
            <ThorswapLogo iconOnly={true} widthIcon={35} heightIcon={35} />
          </RowDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
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
                  color: thorswapGetStatusColor(swapTx.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          <LabelTip type="info">
            <LabelTipText>{status.statusDescription}</LabelTipText>
            {!!swapTx.status && ['failed', 'hold'].includes(swapTx.status) ? (
              <>
                <Br />
                <CopiedContainer>
                  <TouchableOpacity
                    style={{maxWidth: '90%'}}
                    onPress={() => {
                      copyText('security@thorswap.com');
                      setCopiedSupportEmailLabelTip(true);
                    }}>
                    <LabelTipText>
                      {t('Please contact Thorswap support:')}{' '}
                      <LabelTipText style={{fontWeight: '700'}}>
                        security@thorswap.com
                      </LabelTipText>
                    </LabelTipText>
                  </TouchableOpacity>
                  <CopyImgContainerRight
                    style={{minWidth: '10%', paddingTop: 0}}>
                    {copiedSupportEmailLabelTip ? (
                      <CopiedSvg width={17} />
                    ) : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
                <Br />
                <CopiedContainer>
                  <TouchableOpacity
                    style={{maxWidth: '90%'}}
                    onPress={() => {
                      copyText(swapTx.txHash);
                      setCopiedTxHashLabelTip(true);
                    }}>
                    <LabelTipText>
                      {t('Provide the transaction hash:')}{' '}
                      <LabelTipText style={{fontWeight: '700'}}>
                        {swapTx.txHash}
                      </LabelTipText>
                    </LabelTipText>
                  </TouchableOpacity>
                  <CopyImgContainerRight
                    style={{minWidth: '10%', paddingTop: 0}}>
                    {copiedTxHashLabelTip ? <CopiedSvg width={17} /> : null}
                  </CopyImgContainerRight>
                </CopiedContainer>
              </>
            ) : null}
          </LabelTip>

          <ColumnDataContainer>
            <TouchableOpacity
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

          {/* <ColumnDataContainer>
            <TouchableOpacity
              onPress={() => {
                copyText(swapTx.refundAddress);
                setCopiedRefundAddress(true);
              }}>
              <RowLabel>{t('Refund address')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.refundAddress}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedRefundAddress ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer> */}

          <ColumnDataContainer>
            <TouchableOpacity
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

          <RemoveCta
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
                          SwapCryptoActions.removeTxThorswap({
                            orderId: swapTx.orderId,
                          }),
                        );
                        navigation.goBack();
                      },
                      primary: true,
                    },
                    {
                      text: t('GO BACK'),
                      action: () => {
                        console.log('Removing transaction data CANCELED');
                      },
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

export default ThorswapDetails;
