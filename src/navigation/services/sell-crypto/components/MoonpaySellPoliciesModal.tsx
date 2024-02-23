import React from 'react';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {Black, SlateDark, White, Slate} from '../../../../styles/colors';
import {BaseText, H7} from '../../../../components/styled/Text';
import {useTheme} from '@react-navigation/native';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';
import {useAppDispatch} from '../../../../utils/hooks';
import haptic from '../../../../components/haptic-feedback/haptic';
import CloseModal from '../../../../../assets/img/close-modal-icon.svg';
import {useTranslation} from 'react-i18next';

// TODO: Moonpay policies modal

const ChangellyPoliciesContainer = styled.SafeAreaView`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const ModalHeader = styled.View`
  height: 50px;
  margin-right: 10px;
`;

const CloseModalButton = styled.TouchableOpacity`
  margin: 15px;
  padding: 5px;
  height: 41px;
  width: 41px;
  border-radius: 50px;
  background-color: #9ba3ae33;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PoliciesContainer = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  margin: 15px;
`;

const PoliciesText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const ProviderContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
`;

const ProviderLabel = styled(H7)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-right: 10px;
`;

interface MoonpaySellPoliciesModalProps {
  isVisible: boolean;
  onDismiss: (ChangellyPolicies?: number) => void;
}

const MoonpaySellPoliciesModal: React.FC<MoonpaySellPoliciesModalProps> = ({
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

export default MoonpaySellPoliciesModal;
