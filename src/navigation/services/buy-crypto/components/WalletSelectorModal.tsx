import Modal from 'react-native-modal';
import React from 'react';
import GlobalSelect from '../../../../navigation/wallet/screens/GlobalSelect';
import {Black, White} from '../../../../styles/colors';
import styled, {useTheme} from 'styled-components/native';

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

interface WalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: string[];
  onDismiss?: (newWallet?: any) => any;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  onDismiss,
}) => {
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
      <GlobalSelectContainer>
        <GlobalSelect
          useAsModal={true}
          customSupportedCurrencies={customSupportedCurrencies}
          onDismiss={onDismiss}
        />
      </GlobalSelectContainer>
    </Modal>
  );
};

export default WalletSelectorModal;
