import React from 'react';
import BaseModal from '../../../../../components/modal/base/BaseModal';
import Button from '../../../../../components/button/Button';
import {useTheme} from '@react-navigation/native';
import {
  ActiveOpacity,
  WIDTH,
} from '../../../../../components/styled/Containers';
import {BaseText, Paragraph} from '../../../../../components/styled/Text';
import {
  Action,
  CharcoalBlack,
  GhostWhite,
  LightBlack,
  LightBlue,
  NeutralSlate,
  SlateDark,
  Black,
  White,
} from '../../../../../styles/colors';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {useTranslation} from 'react-i18next';
import styled from 'styled-components/native';
import CloseModal from '../../../../../../assets/img/close-modal-icon.svg';

const CARD_WIDTH = 343;

interface EnableLockWarningModalProps {
  isVisible: boolean;
  onBackdropPress: () => void;
  onConfirm: () => void;
}

const ModalBackdropContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ModalCard = styled.View`
  width: ${CARD_WIDTH}px;
  max-width: ${WIDTH - 32}px;
  min-height: 540px;
  border-radius: 16px;
  padding: 16px;
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : GhostWhite)};
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 24px;
`;

const CloseButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const CardBody = styled.View`
  flex: 1;
  justify-content: space-between;
`;

const TopSection = styled.View`
  gap: 32px;
  width: 100%;
`;

const ContentSection = styled.View`
  width: 100%;
`;

const Title = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : CharcoalBlack)};
  font-size: 51px;
  line-height: 48px;
  letter-spacing: -0.34px;
  font-weight: 400;
`;

const AccentTitle = styled(Title)`
  color: ${Action};
`;

const Subheading = styled(BaseText)`
  font-size: 20px;
  line-height: 30px;
  font-weight: 600;
  color: ${({theme: {dark}}) => (dark ? White : CharcoalBlack)};
`;

const Description = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: 8px;
`;

const NoteContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? `${Action}40` : LightBlue)};
  border-radius: 16px;
  padding: 12px 16px 15px;
  margin-top: 16px;
`;

const NoteText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 13px;
  line-height: 20px;
`;

const NoteLabel = styled(NoteText)`
  font-weight: 700;
`;

const FooterRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
`;

const EnableLockWarningModal: React.FC<EnableLockWarningModalProps> = ({
  isVisible,
  onBackdropPress,
  onConfirm,
}) => {
  const {t} = useTranslation();
  const {dark} = useTheme();

  return (
    <BaseModal
      id={'inAppMessage'}
      isVisible={isVisible}
      backdropOpacity={0.6}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{margin: 0, alignItems: 'center', justifyContent: 'center'}}
      onBackdropPress={onBackdropPress}>
      <ModalBackdropContainer>
        <ModalCard>
          <HeaderRow>
            <CloseButton
              activeOpacity={ActiveOpacity}
              onPress={onBackdropPress}>
              <CloseModal width={24} height={24} color={dark ? White : Black} />
            </CloseButton>
          </HeaderRow>
          <CardBody>
            <TopSection>
              <Title>
                {t('Enable')}
                {'\n'}
                <AccentTitle>{t('biometrics')}</AccentTitle>
              </Title>
              <ContentSection>
                <Subheading>{t('Use with care.')}</Subheading>
                <Description>
                  {t(
                    'Device passcode may also unlock the app, depending on your device settings. Anyone with biometric credentials enrolled on your device can also access the app. If your device passcode is known, that person can access it as well.',
                  )}
                </Description>
              </ContentSection>
            </TopSection>
            <FooterRow>
              <Button
                onPress={onConfirm}
                backgroundColor={Action}
                borderRadius={8}
                height={50}
                style={{minWidth: 154}}>
                {t('I understand')}
              </Button>
            </FooterRow>
          </CardBody>
        </ModalCard>
      </ModalBackdropContainer>
    </BaseModal>
  );
};

export default EnableLockWarningModal;
