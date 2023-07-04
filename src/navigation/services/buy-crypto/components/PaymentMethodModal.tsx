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
  getEnabledPaymentMethods,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {BaseText} from '../../../../components/styled/Text';
import Button from '../../../../components/button/Button';
import MoonpayLogo from '../../../../components/icons/external-services/moonpay/moonpay-logo';
import RampLogo from '../../../../components/icons/external-services/ramp/ramp-logo';
import SardineLogo from '../../../../components/icons/external-services/sardine/sardine-logo';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import {Action, LightBlack, SlateDark, White} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';
import {AppActions} from '../../../../store/app';
import {PaymentMethod} from '../constants/BuyCryptoConstants';

interface PaymentMethodsModalProps {
  isVisible: boolean;
  onBackdropPress?: () => void;
  onPress?: (paymentMethod: any) => any;
  selectedPaymentMethod: any;
  coin?: string;
  chain?: string;
  currency?: string;
  preSetPartner?: BuyCryptoExchangeKey | undefined;
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

  const EnabledPaymentMethods = getEnabledPaymentMethods(
    locationData,
    currency,
    coin,
    chain,
    locationData?.countryShortCode || 'US',
    preSetPartner,
  );

  const showOtherPaymentMethodsInfoSheet = (
    paymentMethod: PaymentMethod,
    onPress?: Function,
  ) => {
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Other Payment Methods'),
        message: t(
          'By selecting "Other" as your payment method, you will have access to all payment methods enabled by the exchanges based on your country of residence and your selected fiat currency.',
        ),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => onPress?.(paymentMethod),
            primary: true,
          },
          {
            text: t('CANCEL'),
            action: () => {},
            primary: false,
          },
        ],
      }),
    );
  };

  const getPartnerLogo = (
    exchange: BuyCryptoExchangeKey,
  ): JSX.Element | null => {
    switch (exchange) {
      case 'moonpay':
        return (
          <MoonpayLogo
            key={exchange}
            iconOnly={true}
            widthIcon={20}
            heightIcon={20}
          />
        );
      case 'ramp':
        return (
          <RampLogo key={exchange} iconOnly={true} width={30} height={20} />
        );
      case 'sardine':
        return (
          <SardineLogo key={exchange} iconOnly={true} width={30} height={20} />
        );
      case 'simplex':
        return (
          <SimplexLogo
            key={exchange}
            iconOnly={true}
            widthIcon={20}
            heightIcon={20}
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
            <ModalHeaderText>{t('Payment Method')}</ModalHeaderText>
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
            {Object.values(EnabledPaymentMethods).map(paymentMethod => {
              return (
                <PaymentMethodCard
                  key={paymentMethod.method}
                  onPress={() => {
                    paymentMethod.method !== 'other'
                      ? onPress?.(paymentMethod)
                      : showOtherPaymentMethodsInfoSheet(
                          paymentMethod,
                          onPress,
                        );
                  }}>
                  <PaymentMethodCardContainer>
                    <Checkbox
                      radio={true}
                      onPress={() => onPress?.(paymentMethod)}
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
            })}
          </ScrollView>
        </SafeAreaView>
      </ModalContainer>
    </SheetModal>
  );
};

export default PaymentMethodsModal;
