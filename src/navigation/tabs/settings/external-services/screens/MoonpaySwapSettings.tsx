import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {moonpaySwapTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
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
import {
  moonpaySwapGetStatusColor,
  moonpaySwapGetStatusDetails,
} from '../../../../services/swap-crypto/utils/moonpay-swap-utils';
import {MOONPAY_SUPPORT_URL} from '../../../../services/buy-crypto/utils/moonpay-utils';
import {useTranslation} from 'react-i18next';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

const MoonpaySwapSettings: React.FC = () => {
  const {t} = useTranslation();
  const moonpaySwapHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.moonpay,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [swapTxs, setSwapTxs] = useState([] as moonpaySwapTxData[]);

  useEffect(() => {
    if (isFocused) {
      const moonpaySwapTransactions = Object.values(moonpaySwapHistory);
      setSwapTxs(moonpaySwapTransactions.sort((a, b) => b.date - a.date));
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
                    key={swapTx.txId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('MoonpaySwapDetails', {
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
                            color: moonpaySwapGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {moonpaySwapGetStatusDetails(swapTx.status)
                            ?.statusTitle ?? t('Processing transaction')}
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
                {t('There are currently no transactions with Moonpay')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Moonpay?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(openUrlWithInAppBrowser(MOONPAY_SUPPORT_URL));
          }}>
          <Link>{t('Contact the Moonpay support team.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default MoonpaySwapSettings;
