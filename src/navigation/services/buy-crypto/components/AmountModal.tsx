import Modal from 'react-native-modal';
import React from 'react';
import Amount from '../../../../navigation/wallet/screens/Amount';
import {Black, White} from '../../../../styles/colors';
import styled, {useTheme} from 'styled-components/native';

const AmountContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface AmountModalProps {
  isVisible: boolean;
  onDismiss?: (amount?: number) => any;
}

const AmountModal: React.FC<AmountModalProps> = ({isVisible, onDismiss}) => {
  const theme = useTheme();

  return (
    <Modal
      isVisible={isVisible}
      coverScreen={true}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating
      backdropOpacity={1}
      backdropColor={theme.dark ? Black : White}
      animationIn={'fadeInUp'}
      animationOut={'fadeOutDown'}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}>
      <AmountContainer>
        <Amount useAsModal={true} onDismiss={onDismiss} />
      </AmountContainer>
    </Modal>
  );
};

export default AmountModal;
