import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {SettingsContainer, SettingsComponent} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {thorswapTxData} from '../../../../../store/swap-crypto/swap-crypto.models';
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
  thorswapGetStatusColor,
  thorswapGetStatusDetails,
} from '../../../../services/swap-crypto/utils/thorswap-utils';
import {useTranslation} from 'react-i18next';
import {ExternalServiceContainer} from '../styled/ExternalServicesDetails';

const ThorswapSettings: React.FC = () => {
  const {t} = useTranslation();
  const thorswapHistory = useAppSelector(
    ({SWAP_CRYPTO}) => SWAP_CRYPTO.thorswap,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [swapTxs, setSwapTxs] = useState([] as thorswapTxData[]);

  useEffect(() => {
    if (isFocused) {
      const thorswapTransactions = Object.values(thorswapHistory);
      setSwapTxs(thorswapTransactions.sort((a, b) => b.date - a.date));
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
                    key={swapTx.orderId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ThorswapDetails', {
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
                            color: thorswapGetStatusColor(swapTx.status),
                            textTransform: 'capitalize',
                          }}>
                          {thorswapGetStatusDetails(swapTx.status)
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
                {t('There are currently no transactions with THORSwap')}
              </NoPrMsg>
            )}
          </ExternalServiceContainer>
        </SettingsComponent>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>{t('Having problems with THORSwap?')}</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser(
                'https://docs.thorswap.finance/thorswap/how-tos/frequently-asked-questions/community-and-support',
              ),
            );
          }}>
          <Link>{t('Contact the THORSwap community and support.')}</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default ThorswapSettings;
