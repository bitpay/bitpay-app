import React from 'react';
import {
  ModalContainer,
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/BuyCryptoModals';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import Checkbox from '../../../../components/checkbox/Checkbox';
import {PaymentMethodsAvailable} from '../constants/BuyCryptoConstants';
import styled from 'styled-components/native';
import {BaseText} from '../../../../components/styled/Text';
import Button from '../../../../components/button/Button';
import {Action, SlateDark} from '../../../../styles/colors';
import {ScrollView, SafeAreaView} from 'react-native';

// Images
import SimplexLogo from '../../../../../assets/img/services/simplex/logo-simplex-color.svg';
import WyreLogo from '../../../../../assets/img/services/wyre/logo-wyre.svg';

interface PaymentMethodsModalProps {
  isVisible: boolean;
  onBackdropPress?: () => void;
  onPress?: (paymentMethod: any) => any;
  selectedPaymentMethod: any;
}

const PaymentMethodCard = styled.View`
  border-radius: 7px;
  margin-bottom: 20px;
  padding: 14px;
  height: 105px;
  background-color: #fbfbff;
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
  color: ${Action};
  margin-bottom: 5px;
`;

const PaymentMethodProvider = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PaymentMethodProviderText = styled(BaseText)`
  color: ${SlateDark};
  margin-right: 6px;
`;

const PaymentMethodsModal = ({
  isVisible,
  onPress,
  onBackdropPress,
  selectedPaymentMethod,
}: PaymentMethodsModalProps) => {
  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}>
      <ModalContainer>
        <SafeAreaView>
          <ModalHeader>
            <ModalHeaderText>Payment Method</ModalHeaderText>
            <ModalHeaderRight>
              <Button
                buttonType={'pill'}
                onPress={onBackdropPress ? onBackdropPress : () => {}}>
                Close
              </Button>
            </ModalHeaderRight>
          </ModalHeader>
          <ScrollView>
            {Object.values(PaymentMethodsAvailable).map(paymentMethod => {
              return (
                <PaymentMethodCard key={paymentMethod.method}>
                  <PaymentMethodCardContainer>
                    <Checkbox
                      radio={true}
                      onPress={() => {
                        onPress ? onPress(paymentMethod) : () => {};
                      }}
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
                          Provided by
                        </PaymentMethodProviderText>
                        {paymentMethod.supportedExchanges.simplex && (
                          <SimplexLogo width={60} height={20} />
                        )}
                        {paymentMethod.supportedExchanges.wyre && (
                          <WyreLogo width={60} height={15} />
                        )}
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
