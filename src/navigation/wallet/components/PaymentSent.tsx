import React from 'react';
import Modal from 'react-native-modal';
import styled from 'styled-components/native';
import {Success, White} from '../../../styles/colors';
import {WIDTH} from '../../../components/styled/Containers';
import PaymentCompleteSvg from '../../../../assets/img/wallet/payment-complete.svg';
import {BaseText} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {useTranslation} from 'react-i18next';

const PaymentSentContainer = styled.View`
  flex: 1;
  background-color: ${Success};
  width: ${WIDTH}px;
`;

const PaymentSentHero = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const PaymentSentFooter = styled.View`
  border-top-width: 1px;
  border-top-color: ${White};
  align-items: center;
`;

const Title = styled(BaseText)`
  font-size: 28px;
  font-weight: 500;
  color: ${White};
  margin-top: 15px;
`;

const CloseButton = styled.TouchableOpacity`
  margin: 15px 0;
  padding: 5px;
`;

const CloseText = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  color: ${White};
`;

interface PaymentSentModal {
  isVisible: boolean;
  onCloseModal: () => void;
}

const PaymentSent = ({isVisible, onCloseModal}: PaymentSentModal) => {
  const {t} = useTranslation();
  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={1}
      backdropColor={Success}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{
        alignItems: 'center',
      }}>
      <PaymentSentContainer>
        <PaymentSentHero>
          <PaymentCompleteSvg />
          <Title>{t('Payment Sent')}</Title>
        </PaymentSentHero>
        <PaymentSentFooter>
          <CloseButton
            onPress={() => {
              haptic('impactLight');
              onCloseModal();
            }}>
            <CloseText>{t('CLOSE')}</CloseText>
          </CloseButton>
        </PaymentSentFooter>
      </PaymentSentContainer>
    </Modal>
  );
};

export default PaymentSent;
