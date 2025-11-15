import React, {useCallback, useMemo} from 'react';
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
import {View, ViewStyle} from 'react-native';
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

const centerViewStyle: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
};

const closeButtonStyle: ViewStyle = {
  paddingBottom: 20,
  marginTop: 25,
};

const PaymentSent = React.memo(() => {
  const {t} = useTranslation();
  const {isVisible, title, onCloseModal, hidePaymentSent} = usePaymentSent();

  const handleClose = useCallback(() => {
    haptic('impactLight');
    onCloseModal?.();
    hidePaymentSent();
  }, [onCloseModal, hidePaymentSent]);

  const displayTitle = useMemo(() => title || t('Payment Sent'), [title, t]);

  const closeButtonText = useMemo(() => t('CLOSE'), [t]);

  return (
    <SheetModal
      backgroundColor={Success}
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      fullscreen={true}
      onBackdropPress={handleClose}>
      <Container>
        <View style={centerViewStyle}>
          <PaymentSentHero>
            <PaymentCompleteSvg />
            <Title>{displayTitle}</Title>
          </PaymentSentHero>
        </View>
        <PaymentSentFooter>
          <CloseButtonContainer style={closeButtonStyle} onPress={handleClose}>
            <CloseText>{closeButtonText}</CloseText>
          </CloseButtonContainer>
        </PaymentSentFooter>
      </Container>
    </SheetModal>
  );
});

export default PaymentSent;
