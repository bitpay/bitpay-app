import React from 'react';
import Modal from 'react-native-modal';
import styled, {useTheme} from 'styled-components/native';
import {WIDTH} from '../../../components/styled/Containers';
import {
  Black,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {H4, Paragraph, TextAlign} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {View} from 'react-native';

const ModalContainer = styled.View`
  justify-content: center;
  width: ${WIDTH - 30}px;
  max-width: 400px;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
  border-radius: 10px;
  padding: 22px 24px;
  overflow: hidden;
`;

const Description = styled(Paragraph)`
  margin: 16px 0 28px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? NeutralSlate : SlateDark)};
`;

const SecondaryAction = styled(Button)`
  margin-top: 10px;
`;

const TwoFactorRequiredModal = ({
  onClose,
  isVisible,
}: {
  onClose: (enable?: boolean) => void;
  isVisible: boolean;
}) => {
  const theme = useTheme();
  const {t} = useTranslation();

  const close = (enable?: boolean) => {
    onClose(enable);
  };

  return (
    <View>
      <Modal
        isVisible={isVisible}
        backdropOpacity={theme.dark ? 0.8 : 0.6}
        backdropColor={theme.dark ? LightBlack : Black}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        onBackdropPress={() => close()}
        style={{
          alignItems: 'center',
        }}>
        <ModalContainer>
          <TextAlign align="center">
            <H4>{t('Enable Two-Factor Authentication')}</H4>
          </TextAlign>
          <Description>
            {t(
              'Two-Factor Authentication must be enabled before you can receive crypto to your email address.',
            )}
          </Description>
          <Button
            onPress={() => onClose(true)}>
            {t('Set Up Two-Factor Authentication')}
          </Button>
          <SecondaryAction
            buttonType={'link'}
            onPress={() => onClose()}
            height={40}>
            {t('Do this later')}
          </SecondaryAction>
        </ModalContainer>
      </Modal>
    </View>
  );
};

export default TwoFactorRequiredModal;
