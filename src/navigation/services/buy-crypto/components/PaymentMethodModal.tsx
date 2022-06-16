import React from 'react';
import {ScrollView, SafeAreaView} from 'react-native';
import styled from 'styled-components/native';
import {
  ModalContainer,
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/BuyCryptoModals';
import {
  getEnabledPaymentMethods,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {BaseText} from '../../../../components/styled/Text';
import Button from '../../../../components/button/Button';
import SimplexLogo from '../../../../components/icons/external-services/simplex/simplex-logo';
import WyreLogo from '../../../../components/icons/external-services/wyre/wyre-logo';
import {Action, LightBlack, SlateDark, White} from '../../../../styles/colors';
import {useAppSelector} from '../../../../utils/hooks';
import {useTranslation} from 'react-i18next';

interface PaymentMethodsModalProps {
  isVisible: boolean;
  onBackdropPress?: () => void;
  onPress?: (paymentMethod: any) => any;
  selectedPaymentMethod: any;
  coin?: string;
  currency?: string;
}

const PaymentMethodCard = styled.TouchableOpacity`
  border-radius: 7px;
  margin-bottom: 20px;
  padding: 14px;
  height: 105px;
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

const PaymentMethodsModal = ({
  isVisible,
  onPress,
  onBackdropPress,
  selectedPaymentMethod,
  coin,
  currency,
}: PaymentMethodsModalProps) => {
  const {t} = useTranslation();
  const countryData = useAppSelector(({LOCATION}) => LOCATION.countryData);

  const EnabledPaymentMethods = getEnabledPaymentMethods(
    countryData,
    currency,
    coin,
  );

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
                  onPress={() => onPress?.(paymentMethod)}>
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

                      <PaymentMethodProvider>
                        <PaymentMethodProviderText>
                          {t('Provided by')}
                        </PaymentMethodProviderText>
                        {coin &&
                        currency &&
                        isPaymentMethodSupported(
                          'simplex',
                          paymentMethod,
                          coin,
                          currency,
                        ) ? (
                          <SimplexLogo width={60} height={20} />
                        ) : null}
                        {coin &&
                        currency &&
                        isPaymentMethodSupported(
                          'wyre',
                          paymentMethod,
                          coin,
                          currency,
                        ) ? (
                          <WyreLogo width={60} height={15} />
                        ) : null}
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
