import React, {useEffect, useState} from 'react';
import {TouchableOpacity, Linking} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {Link} from '../../../../../components/styled/Text';
import {RootState} from '../../../../../store';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {simplexPaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

const SimplexSettings: React.FC = () => {
  const simplexHistory = useSelector(
    ({BUY_CRYPTO}: RootState) => BUY_CRYPTO.simplex,
  );
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [paymentRequests, setTransactions] = useState(
    [] as simplexPaymentData[],
  );

  useEffect(() => {
    if (isFocused) {
      // TODO: filter Payment Requests history with env
      const simplexPaymentRequests = Object.values(simplexHistory).filter(
        pr => pr.env == 'dev',
      ); // TODO: correct env
      setTransactions(simplexPaymentRequests);
    }
  }, [isFocused]);

  return (
    <>
      <SettingsContainer>
        <Settings style={{paddingBottom: 500}}>
          {paymentRequests && paymentRequests.length > 0 && (
            <PrTitle>Payment Requests</PrTitle>
          )}
          {paymentRequests &&
            paymentRequests.length > 0 &&
            paymentRequests
              .sort((a, b) => b.created_on - a.created_on)
              .map(pr => {
                return (
                  <PrRow
                    key={pr.payment_id}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ExternalServicesSettings', {
                        screen: 'SimplexDetails',
                        params: {
                          paymentRequest: pr,
                        },
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.fiat_total_amount} {pr.fiat_total_amount_currency}
                      </PrTxtFiatAmount>
                      {pr.status == 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          Payment request rejected
                        </PrTxtStatus>
                      )}
                      {pr.status == 'success' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          Payment request approved
                        </PrTxtStatus>
                      )}
                      {pr.status == 'paymentRequestSent' && (
                        <PrTxtStatus>Attempted payment request</PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {pr.crypto_amount} {pr.coin}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(pr.created_on).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
          {(!paymentRequests || paymentRequests.length == 0) && (
            <NoPrMsg>There are currently no transactions with Simplex</NoPrMsg>
          )}
        </Settings>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>Having problems with Simplex?</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            Linking.openURL('https://www.simplex.com/support/');
          }}>
          <Link>Contact the Simplex support team.</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default SimplexSettings;
