import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {changellyTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
import {
  NoPrMsg,
  PrTitle,
  PrRow,
  PrRowLeft,
  PrRowRight,
  PrTxtCryptoAmount,
  PrTxtDate,
  PrTxtFiatAmount,
  PrTxtStatus,
  FooterSupport,
  SupportTxt,
} from '../styled/ExternalServicesSettings';
import {changellyGetStatusColor} from '../../../../services/swap-crypto/utils/changelly-utils';
import {useTranslation} from 'react-i18next';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

const ChangellySettings: React.FC = () => {
  const {t} = useTranslation();
  const changellyHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.changelly,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [swapTxs, setSwapTxs] = useState([] as changellyTxData[]);

  useEffect(() => {
    if (isFocused) {
      const changellyTransactions = Object.values(changellyHistory);
      setSwapTxs(changellyTransactions.sort((a, b) => b.date - a.date));
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <SettingsComponent style={{paddingBottom: 500}}>
          <ExternalServiceContainer style={{paddingBottom: 50}}>
            {!!swapTxs?.length && <PrTitle>{t('Transactions')}</PrTitle>}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ChangellyDetails', {
                        swapTx: swapTx,
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus
                          style={{
                            color: changellyGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {swapTx.status}
                        </PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {swapTx.amountTo} {swapTx.coinTo.toUpperCase()}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(swapTx.date).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
            {!swapTxs?.length && (
              <NoPrMsg>
                {t('There are currently no transactions with Changelly')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Changelly?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://support.changelly.com/en/support/home',
              ),
            );
          }}>
          <Link>{t('Contact the Changelly support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default ChangellySettings;
