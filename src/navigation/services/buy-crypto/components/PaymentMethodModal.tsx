import React from 'react';
import {ScrollView, SafeAreaView, View} from 'react-native';
import styled from 'styled-components/native';
import {
  ModalContainer,
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/BuyCryptoModals';
import {
  BuyCryptoExchangeKey,
  BuyCryptoSupportedExchanges,
  getBuyEnabledPaymentMethods,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import {
  getSellEnabledPaymentMethods,
  SellCryptoExchangeKey,
} from '../../sell-crypto/utils/sell-crypto-utils';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {BaseText} from '../../../../components/styled/Text';
import Button from '../../../../components/button/Button';
import BanxaLogo from '../../../../components/icons/external-services/banxa/banxa-logo';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import TransakLogo from '../../../../components/icons/external-services/transak/transak-logo';
import {Action, LightBlack, SlateDark, White} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {PaymentMethod} from '../constants/BuyCryptoConstants';
import {showBottomNotificationModal} from '../../../../store/app/app.actions';
import {sleep} from '../../../../utils/helper-methods';

interface PaymentMethodsModalProps {
  isVisible: boolean;
  context: 'buyCrypto' | 'sellCrypto' | undefined;
  onBackdropPress?: () => void;
  onPress: (paymentMethod: any) => any;
  selectedPaymentMethod: any;
  coin?: string;
  chain?: string;
  currency?: string;
  preSetPartner?: BuyCryptoExchangeKey | SellCryptoExchangeKey | undefined;
}

const PaymentMethodCard = styled.TouchableOpacity`
  border-radius: 7px;
  margin-bottom: 20px;
  padding: 14px;
  min-height: 105px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#fbfbff')};
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const PaymentMethodCardContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaymentMethodCheckboxTexts = styled.View`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-left: 15px;
`;

const PaymentMethodLabel = styled(BaseText)`
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
  margin-bottom: 5px;
`;

const PaymentMethodProvider = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaymentMethodProviderText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 6px;
`;

const PaymentMethodProviderLink = styled(BaseText)`
  color: ${Action};
`;

const PaymentMethodsModal = ({
  isVisible,
  context,
  onPress,
  onBackdropPress,
  selectedPaymentMethod,
  coin,
  currency,
  chain,
  preSetPartner,
}: PaymentMethodsModalProps) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);

  const getEnabledPaymentMethods = () => {
    switch (context) {
      case 'buyCrypto':
        return getBuyEnabledPaymentMethods(
          locationData,
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          preSetPartner,
        );

      case 'sellCrypto':
        return getSellEnabledPaymentMethods(
          locationData,
          currency,
          coin,
          chain,
          locationData?.countryShortCode || 'US',
          'moonpay',
        );

      default:
        return null;
    }
  };

  const EnabledPaymentMethods = getEnabledPaymentMethods();

  const showOtherPaymentMethodsInfoSheet = async (
    paymentMethod: PaymentMethod,
    onPress: Function,
  ) => {
    onPress(paymentMethod);
    await sleep(800);
    dispatch(
      showBottomNotificationModal({
        type: 'info',
        title: t('Other Payment Methods'),
        message: t(
          'By selecting "Other" as your payment method, you will have access to all payment methods enabled by the exchanges based on your country of residence and your selected fiat currency.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {},
            primary: true,
          },
        ],
      }),
    );
  };

  const getPartnerLogo = (
    exchange: BuyCryptoExchangeKey,
  ): JSX.Element | null => {
    switch (exchange) {
      case 'banxa':
        return (
          <BanxaLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            width={35}
            height={20}
          />
        );
      case 'moonpay':
        return (
          <MoonpayLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            widthIcon={20}
            heightIcon={20}
          />
        );
      case 'ramp':
        return (
          <RampLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            width={30}
            height={20}
          />
        );
      case 'sardine':
        return (
          <SardineLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            width={30}
            height={20}
          />
        );
      case 'simplex':
        return (
          <SimplexLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            widthIcon={20}
            heightIcon={20}
          />
        );
      case 'transak':
        return (
          <TransakLogo
            key={exchange}
            iconOnly={context === 'buyCrypto'}
            width={30}
            height={17}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}>
      <ModalContainer>
        <SafeAreaView style={{height: '100%'}}>
          <ModalHeader>
            <ModalHeaderText>
              {context === 'sellCrypto'
                ? t('Payout Method')
                : t('Payment Method')}
            </ModalHeaderText>
            <ModalHeaderRight>
              <Button
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={onBackdropPress ? onBackdropPress : () => {}}>
                {t('Close')}
              </Button>
            </ModalHeaderRight>
          </ModalHeader>

          <ScrollView style={{marginTop: 20}}>
            {EnabledPaymentMethods
              ? Object.values(EnabledPaymentMethods).map(paymentMethod => {
                  return (
                    <PaymentMethodCard
                      key={paymentMethod.method}
                      onPress={() => {
                        paymentMethod.method !== 'other'
                          ? onPress(paymentMethod)
                          : showOtherPaymentMethodsInfoSheet(
                              paymentMethod,
                              onPress,
                            );
                      }}>
                      <PaymentMethodCardContainer>
                        <Checkbox
                          radio={true}
                          onPress={() => onPress(paymentMethod)}
                          checked={
                            selectedPaymentMethod.method == paymentMethod.method
                          }
                        />
                        <PaymentMethodCheckboxTexts>
                          <PaymentMethodLabel>
                            {paymentMethod.label}
                          </PaymentMethodLabel>

                          {paymentMethod.method === 'other' ? (
                            <View
                              style={{
                                marginBottom: 10,
                                flexDirection: 'row',
                              }}>
                              <PaymentMethodProviderText>
                                See
                              </PaymentMethodProviderText>
                              <PaymentMethodProviderLink>
                                other supported payment methods
                              </PaymentMethodProviderLink>
                            </View>
                          ) : null}

                          <PaymentMethodProvider>
                            <PaymentMethodProviderText>
                              {t('Provided by')}
                            </PaymentMethodProviderText>
                          </PaymentMethodProvider>
                          <PaymentMethodProvider style={{height: 30}}>
                            {preSetPartner &&
                            BuyCryptoSupportedExchanges.includes(preSetPartner)
                              ? getPartnerLogo(preSetPartner)
                              : BuyCryptoSupportedExchanges.map(exchange => {
                                  return coin &&
                                    currency &&
                                    chain &&
                                    isPaymentMethodSupported(
                                      exchange,
                                      paymentMethod,
                                      coin,
                                      chain,
                                      currency,
                                      locationData?.countryShortCode || 'US',
                                    )
                                    ? getPartnerLogo(exchange)
                                    : null;
                                })}
                          </PaymentMethodProvider>
                        </PaymentMethodCheckboxTexts>
                      </PaymentMethodCardContainer>
                    </PaymentMethodCard>
                  );
                })
              : null}
          </ScrollView>
        </SafeAreaView>
      </ModalContainer>
    </SheetModal>
  );
};

export default PaymentMethodsModal;
