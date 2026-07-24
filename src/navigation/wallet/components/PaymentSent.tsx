import React, {useCallback, useMemo, useRef} from 'react';
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

const PaymentSentContent = React.memo(() => {
  const {t} = useTranslation();
  const {isVisible, title, onCloseModal} = usePaymentSentState();
  const {hidePaymentSent} = usePaymentSentActions();

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
      <View style={styles.container}>
        <View style={centerViewStyle}>
          <View style={styles.paymentSentHero}>
            <PaymentCompleteSvg />
            <BaseText style={styles.title}>{displayTitle}</BaseText>
          </View>
        </View>
        <View style={styles.paymentSentFooter}>
          <CloseButtonContainer style={closeButtonStyle} onPress={handleClose}>
            <BaseText style={styles.closeText}>{closeButtonText}</BaseText>
          </CloseButtonContainer>
        </View>
      </View>
    </SheetModal>
  );
});

const PaymentSent = React.memo(() => {
  const {isVisible} = usePaymentSentState();
  const hasMountedRef = useRef(false);

  if (isVisible) {
    hasMountedRef.current = true;
  }

  return hasMountedRef.current ? <PaymentSentContent /> : null;
});

export default PaymentSent;
