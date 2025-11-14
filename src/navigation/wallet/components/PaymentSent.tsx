import React from 'react';
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
import {View} from 'react-native';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import {usePaymentSent} from '../../../contexts';

const Container = styled.View`
  flex: 1;
  width: ${WIDTH}px;
  background-color: ${Success};
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
  padding-bottom: 10px;
`;

const PaymentSent = () => {
  const {t} = useTranslation();
  const {isVisible, title, onCloseModal, hidePaymentSent} = usePaymentSent();

  const handleClose = () => {
    haptic('impactLight');
    onCloseModal?.();
    hidePaymentSent();
  };

  return (
    <SheetModal
      backgroundColor={Success}
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      fullscreen={true}
      onBackdropPress={handleClose}>
      <Container>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <PaymentSentHero>
            <PaymentCompleteSvg />
            <Title>{title || t('Payment Sent')}</Title>
          </PaymentSentHero>
        </View>

        <PaymentSentFooter>
          <CloseButtonContainer
            style={{paddingBottom: 20, marginTop: 25}}
            onPress={handleClose}>
            <CloseText>{t('CLOSE')}</CloseText>
          </CloseButtonContainer>
        </PaymentSentFooter>
      </Container>
    </SheetModal>
  );
};

export default PaymentSent;
