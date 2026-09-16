import React from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {Black, SlateDark, White, Slate} from '../../../../styles/colors';
import {BaseText, H7} from '../../../../components/styled/Text';
import {useTheme} from '../../../../contexts';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {useAppDispatch} from '../../../../utils/hooks';
import haptic from '../../../../components/haptic-feedback/haptic';
import CloseModal from '../../../../../assets/img/close-modal-icon.svg';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';

const styles = StyleSheet.create({
  changellyPoliciesContainer: {
    flex: 1,
  },
  modalHeader: {
    height: 50,
    marginRight: 10,
  },
  closeModalButton: {
    margin: 15,
    padding: 5,
    height: 41,
    width: 41,
    borderRadius: 50,
    backgroundColor: '#9ba3ae33',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  policiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 15,
  },
  arrowContainer: {
    marginLeft: 10,
  },
  providerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  providerLabel: {
    marginRight: 10,
  },
});

const ChangellyPoliciesContainer: React.FC<
  React.ComponentProps<typeof SafeAreaView>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[
        styles.changellyPoliciesContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const ModalHeader: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.modalHeader, style]} {...rest} />;

const CloseModalButton: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.closeModalButton, style]} {...rest} />
);

const PoliciesContainer: React.FC<
  React.ComponentProps<typeof TouchableOpacity>
> = ({style, ...rest}) => (
  <TouchableOpacity style={[styles.policiesContainer, style]} {...rest} />
);

const PoliciesText: React.FC<React.ComponentProps<typeof BaseText>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <BaseText style={[{color: theme.dark ? White : Black}, style]} {...rest} />
  );
};

const ArrowContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.arrowContainer, style]} {...rest} />;

const ProviderContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.providerContainer, style]} {...rest} />;

const ProviderLabel: React.FC<React.ComponentProps<typeof H7>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <H7
      style={[
        styles.providerLabel,
        {color: theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

interface ChangellyPoliciesModalProps {
  isVisible: boolean;
  onDismiss: (ChangellyPolicies?: number) => void;
}

const ChangellyPoliciesModal: React.FC<ChangellyPoliciesModalProps> = ({
  isVisible,
  onDismiss,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <ChangellyPoliciesContainer>
        <ModalHeader>
          <CloseModalButton
            onPress={() => {
              if (onDismiss) {
                onDismiss();
              }
            }}>
            <CloseModal
              {...{
                width: 20,
                height: 20,
                color: theme.dark ? White : Black,
              }}
            />
          </CloseModalButton>
        </ModalHeader>
        <PoliciesContainer
          style={{marginTop: 30}}
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://changelly.com/privacy-policy'),
            );
          }}>
          <PoliciesText>Privacy Policy</PoliciesText>
          <ArrowContainer>
            <SelectorArrowRight
              {...{
                width: 13,
                height: 13,
                color: theme.dark ? White : Slate,
              }}
            />
          </ArrowContainer>
        </PoliciesContainer>
        <PoliciesContainer
          onPress={() => {
            haptic('impactLight');
            dispatch(
              openUrlWithInAppBrowser('https://changelly.com/terms-of-use'),
            );
          }}>
          <PoliciesText>{t('Terms of Use')}</PoliciesText>
          <ArrowContainer>
            <SelectorArrowRight
              {...{
                width: 13,
                height: 13,
                color: theme.dark ? White : Slate,
              }}
            />
          </ArrowContainer>
        </PoliciesContainer>
        <PoliciesContainer
          onPress={() => {
            haptic('impactLight');
            dispatch(openUrlWithInAppBrowser('https://changelly.com/aml-kyc'));
          }}>
          <PoliciesText>{t('AML/KYC Policy')}</PoliciesText>
          <ArrowContainer>
            <SelectorArrowRight
              {...{
                width: 13,
                height: 13,
                color: theme.dark ? White : Slate,
              }}
            />
          </ArrowContainer>
        </PoliciesContainer>
        <ProviderContainer>
          <ProviderLabel>{t('Provided By')}</ProviderLabel>
          <ChangellyLogo width={100} height={30} />
        </ProviderContainer>
      </ChangellyPoliciesContainer>
    </SheetModal>
  );
};

export default ChangellyPoliciesModal;
