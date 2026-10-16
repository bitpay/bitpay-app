import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {rangoTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
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
import {useTranslation} from 'react-i18next';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

/**
 * Rango order history.
 *
 * Rows are not tappable yet — the per-order detail screen lands with the
 * execution PR, which is also what first writes entries into this list.
 */
const RangoSettings: React.FC = () => {
  const {t} = useTranslation();
  const rangoHistory = useAppSelector(({SWAP_CRYPTO}) => SWAP_CRYPTO.rango);
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const [swapTxs, setSwapTxs] = useState([] as rangoTxData[]);

  useEffect(() => {
    if (isFocused) {
      const rangoTransactions = Object.values(rangoHistory);
      setSwapTxs(rangoTransactions.sort((a, b) => b.date - a.date));
    }
  }, [isFocused, rangoHistory]);

  return (
    <>
      <SettingsContainer>
        <SettingsComponent style={{paddingBottom: 500}}>
          <ExternalServiceContainer style={{paddingBottom: 50}}>
            {!!swapTxs?.length && <PrTitle>{t('Transactions')}</PrTitle>}
            {!!swapTxs?.length &&
              swapTxs.map(swapTx => {
                return (
                  <PrRow key={swapTx.requestId}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {swapTx.amountFrom} {swapTx.coinFrom.toUpperCase()}
                      </PrTxtFiatAmount>
                      {!!swapTx.status && (
                        <PrTxtStatus style={{textTransform: 'capitalize'}}>
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
                {t('There are currently no transactions with Rango')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with Rango?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(openUrlWithInAppBrowser('https://rango.exchange/support'));
          }}>
          <Link>{t('Contact the Rango community and support.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default RangoSettings;
