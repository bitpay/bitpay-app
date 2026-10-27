import React from 'react';
import Modal from 'react-native-modal';
import {useTheme} from '../../../contexts';
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
import {View, ViewProps, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    width: WIDTH - 30,
    maxWidth: 400,
    borderRadius: 10,
    paddingVertical: 22,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  description: {
    marginTop: 16,
    marginBottom: 28,
    marginHorizontal: 0,
    textAlign: 'center',
  },
  secondaryAction: {
    marginTop: 10,
  },
});

const ModalContainer = ({style, ...rest}: ViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.modalContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const Description = React.forwardRef<
  React.ComponentRef<typeof Paragraph>,
  React.ComponentProps<typeof Paragraph>
>(({style, ...rest}, ref) => {
  const theme = useTheme();
  return (
    <Paragraph
      ref={ref}
      style={[
        styles.description,
        {color: theme.dark ? NeutralSlate : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
});

const SecondaryAction: React.FC<React.ComponentProps<typeof Button>> = ({
  style,
  ...rest
}) => <Button style={[styles.secondaryAction, style]} {...rest} />;

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
            touchableLibrary={'react-native'}
            onPress={() => onClose(true)}>
            {t('Set Up Two-Factor Authentication')}
          </Button>
          <SecondaryAction
            touchableLibrary={'react-native'}
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
