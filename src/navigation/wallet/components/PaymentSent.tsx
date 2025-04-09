import React from 'react';
import Modal from 'react-native-modal';
import styled from 'styled-components/native';
import {Success, White} from '../../../styles/colors';
import {
  CloseButtonContainer,
  WIDTH,
} from '../../../components/styled/Containers';
import PaymentCompleteSvg from '../../../../assets/img/wallet/payment-complete.svg';
import {BaseText} from '../../../components/styled/Text';
import haptic from '../../../components/haptic-feedback/haptic';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {View} from 'react-native';

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

const CloseText = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  color: ${White};
`;

interface PaymentSentModal {
  isVisible: boolean;
  onCloseModal: () => void;
  title?: string;
}

const PaymentSent = ({isVisible, onCloseModal, title}: PaymentSentModal) => {
  const {t} = useTranslation();
  return (
    <View>
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
            <Title>{title || t('Payment Sent')}</Title>
          </PaymentSentHero>
          <PaymentSentFooter>
            <CloseButtonContainer
              style={{padding: 15, marginTop: 15}}
              onPress={() => {
                haptic('impactLight');
                onCloseModal();
              }}>
              <CloseText>{t('CLOSE')}</CloseText>
            </CloseButtonContainer>
          </PaymentSentFooter>
        </PaymentSentContainer>
      </Modal>
    </View>
  );
};

export default PaymentSent;
