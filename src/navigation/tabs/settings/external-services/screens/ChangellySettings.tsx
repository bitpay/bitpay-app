import React, {useEffect, useState} from 'react';
import {TouchableOpacity} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {Link} from '../../../../../components/styled/Text';
import {useAppDispatch} from '../../../../../utils/hooks';
import {RootState} from '../../../../../store';
import {openUrlWithInAppBrowser} from '../../../../../store/app/app.effects';
import {Settings, SettingsContainer} from '../../SettingsRoot';
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
import {changellyGetStatusColor} from '../../../../../navigation/services/swap-crypto/utils/changelly-utils';

const ChangellySettings: React.FC = () => {
  const changellyHistory = useSelector(
    ({SWAP_CRYPTO}: RootState) => SWAP_CRYPTO.changelly,
  );
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [swapTxs, setSwapTxs] = useState([] as changellyTxData[]);

  useEffect(() => {
    if (isFocused) {
      const changellyTransactions = Object.values(changellyHistory);
      setSwapTxs(changellyTransactions);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <Settings style={{paddingBottom: 500}}>
          {swapTxs && swapTxs.length > 0 && <PrTitle>Payment Requests</PrTitle>}
          {swapTxs &&
            swapTxs.length > 0 &&
            swapTxs
              .sort((a, b) => b.date - a.date)
              .map(swapTx => {
                return (
                  <PrRow
                    key={swapTx.exchangeTxId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ExternalServicesSettings', {
                        screen: 'ChangellyDetails',
                        params: {
                          swapTx: swapTx,
                        },
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
          {(!swapTxs || swapTxs.length == 0) && (
            <NoPrMsg>
              There are currently no transactions with Changelly
            </NoPrMsg>
          )}
        </Settings>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>Having problems with Changelly?</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://www.simplex.com/support/'),
            );
          }}>
          <Link>Contact the Changelly support team.</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default ChangellySettings;
