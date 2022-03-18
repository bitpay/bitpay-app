import React, {useEffect, useState} from 'react';
import {TouchableOpacity, Linking} from 'react-native';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import moment from 'moment';
import {useSelector} from 'react-redux';
import {Link} from '../../../../../components/styled/Text';
import {RootState} from '../../../../../store';
import {Settings, SettingsContainer} from '../../SettingsRoot';
import haptic from '../../../../../components/haptic-feedback/haptic';
import {wyrePaymentData} from '../../../../../store/buy-crypto/buy-crypto.models';
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

const WyreSettings: React.FC = () => {
  const wyreHistory = useSelector(({BUY_CRYPTO}: RootState) => BUY_CRYPTO.wyre);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [paymentRequests, setTransactions] = useState([] as wyrePaymentData[]);

  useEffect(() => {
    if (isFocused) {
      // TODO: filter Payment Requests history with env
      const wyrePaymentRequests = Object.values(wyreHistory).filter(
        pr => pr.env == 'dev',
      ); // TODO: correct env
      setTransactions(wyrePaymentRequests);
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
                    key={pr.orderId}
                    onPress={() => {
                      haptic('impactLight');
                      navigation.navigate('ExternalServicesSettings', {
                        screen: 'WyreDetails',
                        params: {
                          paymentRequest: pr,
                        },
                      });
                    }}>
                    <PrRowLeft>
                      <PrTxtFiatAmount>
                        {pr.sourceAmount} {pr.sourceCurrency}
                      </PrTxtFiatAmount>
                      {pr.status === 'failed' && (
                        <PrTxtStatus style={{color: '#df5264'}}>
                          Payment request rejected
                        </PrTxtStatus>
                      )}
                      {pr.status === 'success' && (
                        <PrTxtStatus style={{color: '#01d1a2'}}>
                          Payment request approved
                        </PrTxtStatus>
                      )}
                      {pr.status === 'paymentRequestSent' && (
                        <PrTxtStatus>Attempted payment request</PrTxtStatus>
                      )}
                    </PrRowLeft>
                    <PrRowRight>
                      <PrTxtCryptoAmount>
                        {pr.destAmount} {pr.destCurrency}
                      </PrTxtCryptoAmount>
                      <PrTxtDate>{moment(pr.created_on).fromNow()}</PrTxtDate>
                    </PrRowRight>
                  </PrRow>
                );
              })}
          {(!paymentRequests || paymentRequests.length == 0) && (
            <NoPrMsg>There are currently no transactions with Wyre</NoPrMsg>
          )}
        </Settings>
      </SettingsContainer>
      <FooterSupport>
        <SupportTxt>Having problems with Wyre?</SupportTxt>
        <TouchableOpacity
          onPress={() => {
            haptic('impactLight');
            Linking.openURL('https://www.wyre.com/support/');
          }}>
          <Link>Contact the Wyre support team.</Link>
        </TouchableOpacity>
      </FooterSupport>
    </>
  );
};

export default WyreSettings;
