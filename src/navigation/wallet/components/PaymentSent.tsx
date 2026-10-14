import React, {useCallback, useMemo} from 'react';
import {StyleSheet} from 'react-native';
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
import useModalContentLifecycle from '../../../components/modal/base/useModalContentLifecycle';
import {usePaymentSentActions, usePaymentSentState} from '../../../contexts';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: WIDTH,
    backgroundColor: Success,
  },
  paymentSentHero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentSentFooter: {
    borderTopWidth: 1,
    borderTopColor: White,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: White,
    marginTop: 15,
  },
  closeText: {
    fontWeight: '500',
    fontSize: 18,
    color: White,
    paddingBottom: 10,
  },
});

const centerViewStyle: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
};

const closeButtonStyle: ViewStyle = {
  paddingBottom: 20,
  marginTop: 25,
};

const PaymentSentContentComponent = ({
  onModalHide,
}: {
  onModalHide: () => void;
}) => {
  const {t} = useTranslation();
  const {isVisible, title, onCloseModal} = usePaymentSentState();
  const {hidePaymentSent} = usePaymentSentActions();

  const handleClose = useCallback(() => {
    haptic('impactLight');
    hidePaymentSent();
    onCloseModal?.();
  }, [onCloseModal, hidePaymentSent]);

  const displayTitle = useMemo(() => title || t('Payment Sent'), [title, t]);

  const closeButtonText = useMemo(() => t('CLOSE'), [t]);

  return (
    <SheetModal
      modalLibrary={'modal'}
      isVisible={isVisible}
      onModalHide={onModalHide}
      unmountContentWhenHidden
      onBackdropPress={handleClose}>
      <View style={styles.container}>
        <View style={centerViewStyle}>
          <View style={styles.paymentSentHero}>
            <PaymentCompleteSvg />
            <BaseText style={styles.title}>{displayTitle}</BaseText>
          </View>
        </View>
        <View style={styles.paymentSentFooter}>
          <CloseButtonContainer
            testID="payment-sent-close"
            accessibilityRole="button"
            style={closeButtonStyle}
            onPress={handleClose}>
            <BaseText style={styles.closeText}>{closeButtonText}</BaseText>
          </CloseButtonContainer>
        </View>
      </View>
    </SheetModal>
  );
};

const PaymentSentContent = React.memo(PaymentSentContentComponent);

const PaymentSent = React.memo(() => {
  const {isVisible} = usePaymentSentState();
  const {shouldRenderModal, handleModalHide} =
    useModalContentLifecycle(isVisible);

  return shouldRenderModal ? (
    <PaymentSentContent onModalHide={handleModalHide} />
  ) : null;
});

export default PaymentSent;
