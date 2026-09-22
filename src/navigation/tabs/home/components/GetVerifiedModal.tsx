import React, {useEffect, useRef} from 'react';
import {Pressable, TouchableOpacity} from 'react-native';
import styled from 'styled-components/native';
import {useTranslation} from 'react-i18next';
import {BaseText} from '../../../../components/styled/Text';
import {WIDTH} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  LightBlack,
  LightBlue,
  SlateDark,
  White,
} from '../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {setShowKycGetVerifiedModal} from '../../../../store/app/app.actions';
import {SumSubSelectors} from '../../../../store/sumsub';
import {BitpayIdScreens} from '../../../bitpay-id/BitpayIdGroup';
import {navigationRef} from '../../../../Root';
import IconKycGetVerified from '../../../../../assets/img/kyc_get_verified.svg';
import IconClose from '../../../../../assets/img/close-modal-icon.svg';

// The sheet is fullscreen; this dims the screen and centers the card.
// The card keeps its natural height and stays centred while it fits; once it no
// longer does, this scrolls instead of the card clipping its own content.
// Centring lives on the content container, not on a `flex-grow` child: a
// stretched child would centre its overflow out of both ends and put the top of
// the card permanently out of reach.
const BackdropScroll = styled.ScrollView.attrs(() => ({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  showsVerticalScrollIndicator: false,
}))`
  flex: 1;
`;

const Backdrop = styled.Pressable`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const ModalCard = styled.View`
  width: ${WIDTH - 32}px;
  border-radius: 16px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  overflow: hidden;
`;

const IllustrationContainer = styled.View`
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: ${({theme: {dark}}) =>
    dark ? 'rgba(34, 64, 196, 0.25)' : LightBlue};
`;

const CloseButton = styled(TouchableOpacity)`
  position: absolute;
  top: 16px;
  right: 16px;
`;

const Content = styled.View`
  padding: 24px;
`;

const Title = styled(BaseText)`
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : '#000000')};
  margin-bottom: 8px;
`;

const Body = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-bottom: 24px;
`;

const GetVerifiedModal: React.FC = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const isVisible = useAppSelector(({APP}) => APP.showKycGetVerifiedModal);
  const canStartKyc = useAppSelector(SumSubSelectors.selectCanStartKyc);

  // Navigate after the sheet dismisses, via navigationRef (VerifyIdentity is a
  // root-navigator screen).
  const pendingVerifyRef = useRef(false);

  const dismiss = () => dispatch(setShowKycGetVerifiedModal(false));

  useEffect(() => {
    if (isVisible && !canStartKyc) {
      dispatch(setShowKycGetVerifiedModal(false));
    }
  }, [dispatch, isVisible, canStartKyc]);

  const onVerify = () => {
    pendingVerifyRef.current = true;
    dismiss();
  };

  const handleModalHide = () => {
    if (pendingVerifyRef.current) {
      pendingVerifyRef.current = false;
      navigationRef.navigate(BitpayIdScreens.VERIFY_IDENTITY as never);
    }
  };

  return (
    <SheetModal
      modalLibrary={'bottom-sheet'}
      isVisible={isVisible}
      fullscreen={true}
      paddingTop={0}
      backgroundColor={'rgba(0, 0, 0, 0.4)'}
      onBackdropPress={dismiss}
      onModalHide={handleModalHide}>
      <BackdropScroll>
        <Backdrop onPress={dismiss} />
        {/* Absorb taps on the card. */}
        <Pressable onPress={() => {}}>
          <ModalCard>
            <IllustrationContainer>
              <IconKycGetVerified width={200} height={203} />
              <CloseButton
                onPress={dismiss}
                accessibilityLabel="Dismiss identity verification">
                <IconClose width={32} height={32} />
              </CloseButton>
            </IllustrationContainer>
            <Content>
              <Title>{t('Get Verified')}</Title>
              <Body>
                {t(
                  "Complete BitPay's one-time verification process to continue using cryptocurrency for purchases. It's quick, secure, and only needs to be done once.",
                )}
              </Body>
              <Button buttonStyle={'primary'} onPress={onVerify}>
                {t('Verify My Account')}
              </Button>
            </Content>
          </ModalCard>
        </Pressable>
      </BackdropScroll>
    </SheetModal>
  );
};

export default GetVerifiedModal;
