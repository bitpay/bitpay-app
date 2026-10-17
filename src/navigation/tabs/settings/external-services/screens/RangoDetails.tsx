import React, {useEffect, useState} from 'react';
import {RefreshControl, Text} from 'react-native';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTheme} from '../../../../../contexts';
import moment from 'moment';
import {SettingsComponent, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {rangoTxData} from '../../../../../store/swap-crypto/swap-crypto.models';

import RangoLogo from '../../../../../components/icons/external-services/rango/rango-logo';
import {useAppDispatch, useLogger} from '../../../../../utils/hooks';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../../store/app/app.actions';
import {SwapCryptoActions} from '../../../../../store/swap-crypto';
import {rangoGetStatus} from '../../../../../store/swap-crypto/effects/rango/rango';
import {
  rangoEnv,
  rangoGetStatusColor,
  rangoGetStatusDetails,
  RangoStatus,
} from '../../../../../navigation/services/swap-crypto/utils/rango-utils';
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

export interface RangoDetailsProps {
  swapTx: rangoTxData;
}

/**
 * Detail view for one Rango order.
 *
 * Also the only place a Rango order's status can be refreshed by hand.
 * rangoTrackSwap polls once, right after broadcast, and gives up after
 * fifteen minutes - so an app that was killed, backgrounded, or simply slower
 * than the destination chain leaves an order reading `running` forever. Pull
 * to refresh is what gets it unstuck.
 */
const RangoDetails: React.FC = () => {
  const {t} = useTranslation();
  const {
    params: {swapTx},
  } = useRoute<RouteProp<{params: RangoDetailsProps}>>();
  const navigation = useNavigation();
  const logger = useLogger();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<RangoStatus>({
    statusTitle: undefined,
    statusDescription: undefined,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const [copiedTxHash, setCopiedTxHash] = useState(false);
  const [copiedRequestId, setCopiedRequestId] = useState(false);

  const copyText = (text: string) => {
    haptic('impactLight');
    Clipboard.setString(text);
  };

  const updateStatusDescription = () => {
    setStatus(rangoGetStatusDetails(swapTx.status));
  };

  const getStatus = async (force?: boolean) => {
    // A settled swap never changes again, so only an explicit pull re-asks.
    if (swapTx.status === 'success' && !force) {
      return;
    }

    try {
      const data = await rangoGetStatus({
        env: rangoEnv,
        requestId: swapTx.requestId,
        txId: swapTx.txHash,
      });

      if (!data?.status || data.status === swapTx.status) {
        return;
      }

      logger.debug('Updating Rango status to: ' + data.status);
      swapTx.status = data.status;
      updateStatusDescription();
      dispatch(
        SwapCryptoActions.successTxRango({
          rangoTxData: swapTx,
        }),
      );
    } catch (err) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      logger.error('Rango getStatus Error: ' + errStr);
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
    const timer = setTimeout(() => setCopiedDepositAddress(false), 3000);
    return () => clearTimeout(timer);
  }, [copiedDepositAddress]);

  useEffect(() => {
    const timer = setTimeout(() => setCopiedTxHash(false), 3000);
    return () => clearTimeout(timer);
  }, [copiedTxHash]);

  useEffect(() => {
    const timer = setTimeout(() => setCopiedRequestId(false), 3000);
    return () => clearTimeout(timer);
  }, [copiedRequestId]);

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
                <CryptoAmount>{swapTx.amountTo}</CryptoAmount>
                <CryptoUnit>{swapTx.coinTo.toUpperCase()}</CryptoUnit>
              </CryptoContainer>
            </CryptoAmountContainer>
            <RangoLogo iconOnly={true} width={45} height={45} />
          </RowDataContainer>

          <ColumnDataContainer>
            <TouchableOpacity
              testID="rango-copy-deposit-address-button"
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
              <RowLabel>{t('Destination Blockchain')}</RowLabel>
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

          {!!swapTx.swapperId && (
            <RowDataContainer>
              {/* Rango is an aggregator: the swapper is who actually filled
                  the route, and the first thing support will ask for. */}
              <RowLabel>{t('Filled by')}</RowLabel>
              <RowData>{swapTx.swapperId}</RowData>
            </RowDataContainer>
          )}

          {!!swapTx.totalExchangeFee && (
            <RowDataContainer>
              <RowLabel>{t('Exchange Fee')}</RowLabel>
              <RowData>
                {swapTx.totalExchangeFee} {swapTx.coinFrom.toUpperCase()}
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
                  color: rangoGetStatusColor(swapTx.status),
                  textTransform: 'capitalize',
                }}>
                {status.statusTitle}
              </RowData>
            </RowDataContainer>
          )}

          <LabelTip type="info">
            <LabelTipText>{status.statusDescription}</LabelTipText>
          </LabelTip>

          {!!swapTx.txHash && (
            <ColumnDataContainer>
              <TouchableOpacity
                testID="rango-copy-tx-hash-button"
                accessibilityLabel={t('Copy transaction hash')}
                onPress={() => {
                  copyText(swapTx.txHash);
                  setCopiedTxHash(true);
                }}>
                <RowLabel>{t('Transaction Hash')}</RowLabel>
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
          )}

          <ColumnDataContainer>
            <TouchableOpacity
              testID="rango-copy-request-id-button"
              accessibilityLabel={t('Copy request ID')}
              onPress={() => {
                copyText(swapTx.requestId);
                setCopiedRequestId(true);
              }}>
              {/* Rango keys every status and support lookup on this. */}
              <RowLabel>{t('Rango Request ID')}</RowLabel>
              <CopiedContainer>
                <ColumnData style={{maxWidth: '90%'}}>
                  {swapTx.requestId}
                </ColumnData>
                <CopyImgContainerRight style={{minWidth: '10%'}}>
                  {copiedRequestId ? <CopiedSvg width={17} /> : null}
                </CopyImgContainerRight>
              </CopiedContainer>
            </TouchableOpacity>
          </ColumnDataContainer>

          <RemoveCta
            testID="rango-remove-swap-button"
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
                          SwapCryptoActions.removeTxRango({
                            requestId: swapTx.requestId,
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

export default RangoDetails;
