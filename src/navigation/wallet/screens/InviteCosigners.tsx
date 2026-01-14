import React, {useState, useEffect} from 'react';
import {ScrollView, TextInput, Modal, Share} from 'react-native';
import styled from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  startTSSCeremony,
  addCoSignerToTSS,
} from '../../../store/wallet/effects/create-multisig/create-multisig';
import {
  White,
  SlateDark,
  LightBlack,
  LuckySevens,
  Action,
  Slate30,
  Success25,
  Black,
  NeutralSlate,
  LinkBlue,
  Midnight,
} from '../../../styles/colors';
import {Paragraph, BaseText} from '../../../components/styled/Text';
import {
  HeaderRightContainer,
  ScreenGutter,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useLogger} from '../../../utils/hooks/useLogger';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key, TSSCopayerInfo} from '../../../store/wallet/wallet.models';
import AddIconBlackSvg from '../../../../assets/img/add-black.svg';
import AddIconGreySvg from '../../../../assets/img/add-grey.svg';
import SuccessLightIcon from '../../../../assets/img/check-dark.svg';
import SuccessDarkIcon from '../../../../assets/img/check.svg';
import SuccessGreyIcon from '../../../../assets/img/check-grey.svg';
import ClockLightIcon from '../../../../assets/img/clock-blue.svg';
import ClockDarkIcon from '../../../../assets/img/clock-light-blue.svg';
import QrCodeSvgBlack from '../../../../assets/img/qr-code-black.svg';
import QrCodeSvgGrey from '../../../../assets/img/qr-code-grey.svg';
import ShareIcon from '../../../../assets/img/share-icon.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {useTheme} from 'styled-components/native';
import {sleep} from '../../../utils/helper-methods';
import {useNavigation} from '@react-navigation/native';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import Back from '../../../components/back/Back';

const Container = styled.SafeAreaView`
  flex: 1;
`;

const Content = styled(ScrollView)`
  padding: ${ScreenGutter};
`;

const HeaderContainer = styled.View`
  margin-bottom: 24px;
`;

const Subtitle = styled(Paragraph)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const CoSignerContainerTitle = styled(Paragraph)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const CoSignerContainer = styled.View`
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  gap: 17px;
`;

const CoSignerRow = styled.TouchableOpacity`
  border-radius: 12px;
`;

const CoSignerInfo = styled.View`
  flex: 1;
`;

const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const CoSignerName = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  font-size: 16px;
  font-weight: 500;
  flex: 1;
`;

const CoSignerStatus = styled(BaseText)`
  color: ${SlateDark};
  font-size: 14px;
  margin-top: 4px;
`;

const AddButton = styled.View`
  width: 40px;
  height: 40px;
  padding: 8px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : '#F5F5F5')};
  align-items: center;
  justify-content: center;
`;

const CheckMark = styled.View`
  width: 40px;
  height: 40px;
  padding: 12px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? '#004D27' : Success25)};
  align-items: center;
  justify-content: center;
`;

const ButtonContainer = styled.View`
  padding: ${ScreenGutter};
`;

const ModalContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const ModalHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px ${ScreenGutter};
`;

const ModalTitle = styled(BaseText)`
  font-size: 18px;
  font-weight: 600;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  text-align: center;
  flex: 1;
`;

const HeaderButton = styled.TouchableOpacity`
  padding: 8px;
  min-width: 60px;
`;

const PlaceholderView = styled.View`
  min-width: 60px;
  height: 40px;
`;

const ModalContent = styled.ScrollView`
  flex: 1;
`;

const TopSection = styled.View`
  padding: 24px ${ScreenGutter};
`;

const TopSectionInputContainer = styled.View``;

const TopSectionContainer = styled.View`
  align-items: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  height: 390px;
  justify-content: center;
`;

const InputContainer = styled.View`
  padding: 16px;
  width: 100%;
`;

const InputLabel = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 12px;
`;

const InputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? NeutralSlate : Black)};
  padding: 12px;
  margin-bottom: 16px;
`;

const StyledInput = styled(TextInput)`
  flex: 1;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  padding: 0;
`;

const ScanButton = styled.TouchableOpacity``;

const StatusContainer = styled.View`
  align-items: center;
  justify-content: center;
  flex-direction: column;
  flex: 1;
  width: 100%;
`;

const StatusText = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-top: 10px;
`;

const StatusSubText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${SlateDark};
  margin-top: 4px;
`;

const QRSectionContainer = styled.View`
  align-items: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  height: 390px;
`;

const QRContainer = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
  background-color: ${White};
  border-radius: 12px;
  margin: 16px;
`;

const ShareContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: 16px;
  padding-bottom: 16px;
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

const QRCodeWrapper = styled.View`
  background-color: ${White};
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
`;

const ShareButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
`;

const ShareButtonText = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
  margin-left: 8px;
`;

const StepsSection = styled.View`
  padding: 24px ${ScreenGutter};
`;

const StepsContainer = styled.View`
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

const StepsSectionTitle = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 12px;
`;

const StepRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

const StepRowWithButton = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const StepContentWithButton = styled.View`
  flex: 1;
  padding-bottom: 20px;
  padding-right: 8px;
`;

const StepRail = styled.View`
  width: 40px;
  align-items: center;
  margin-right: 12px;
`;

const ContinuePillButton = styled.TouchableOpacity<{disabled?: boolean}>`
  padding: 6px 14px;
  border-radius: 16px;
  background-color: ${({theme: {dark}}) => (dark ? Midnight : Action)};
  align-self: flex-start;
  margin-top: 2px;
`;

const ContinuePillText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: ${White};
`;

const StepConnector = styled.View<{completed?: boolean}>`
  width: 2px;
  flex-grow: 1;
  margin-top: 0px;
  background-color: ${({theme: {dark}, completed}) =>
    completed ? (dark ? '#004D27' : Success25) : dark ? '#2A2A2A' : '#F5F5F5'};
`;

const StepIndicator = styled.View<{active?: boolean; completed?: boolean}>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({theme: {dark}, active, completed}) =>
    active
      ? '#2240C440'
      : completed
      ? dark
        ? '#004D27'
        : Success25
      : dark
      ? '#2A2A2A'
      : '#F5F5F5'};
  align-items: center;
  justify-content: center;
`;

const StepContent = styled.View`
  flex: 1;
  padding-bottom: 20px;
`;

const StepNumber = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? LuckySevens : Black)};
  font-size: 16px;
  font-weight: 400;
`;

const StepTitle = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const StepSubtitle = styled(BaseText)`
  font-size: 14px;
  color: ${SlateDark};
  line-height: 20px;
`;

const ButtonWrapper = styled.View`
  width: 100%;
  padding: 0 16px;
  margin-top: 20px;
`;
export interface InviteCoSignersParamsList {
  keyId: string;
}

type Props = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.INVITE_COSIGNERS
>;

const InviteCosigners: React.FC<Props> = ({route}) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const AddIconSvg = theme.dark ? AddIconGreySvg : AddIconBlackSvg;
  const ClockIconSvg = theme.dark ? ClockDarkIcon : ClockLightIcon;
  const SuccessIcon = theme.dark ? SuccessDarkIcon : SuccessLightIcon;
  const QrCodeSvg = theme.dark ? QrCodeSvgGrey : QrCodeSvgBlack;

  const {keyId} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const tssSession = key?.tssSession;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCopayer, setSelectedCopayer] = useState<TSSCopayerInfo | null>(
    null,
  );
  const [sessionId, setSessionId] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [showProcessing, setShowProcessing] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  const [isCeremonyStarted, setIsCeremonyStarted] = useState(false);
  const [isCeremonyComplete, setIsCeremonyComplete] = useState(false);
  const [createdKey, setCreatedKey] = useState<Key | null>(null);
  const [isInviteShared, setIsInviteShared] = useState(false);
  const [hasClickedShare, setHasClickedShare] = useState(false);

  useEffect(() => {
    if (pendingJoinCode && currentStep === 2) {
      const timer = setTimeout(() => {
        setShowProcessing(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [pendingJoinCode, currentStep]);

  if (!tssSession) {
    return null;
  }

  const {m, n, walletName, copayers = []} = tssSession;
  const allInvited = copayers.every(c => c.status === 'invited');

  const handleOpenModal = (copayer: TSSCopayerInfo) => {
    if (copayer.status === 'invited') {
      setSelectedCopayer(copayer);
      setPendingJoinCode(copayer.joinCode!);
      setCurrentStep(2);
      setShowProcessing(false);
      setIsInviteShared(false);
    } else {
      setSelectedCopayer(copayer);
      setSessionId('');
      setCurrentStep(1);
      setShowProcessing(false);
      setPendingJoinCode(null);
      setIsInviteShared(false);
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedCopayer(null);
    setSessionId('');
    setCurrentStep(1);
    setShowProcessing(false);
    setPendingJoinCode(null);
    setIsInviteShared(false);
  };

  const handleAlreadyShared = () => {
    setIsInviteShared(true);
    setCurrentStep(3);
  };

  const handleShareAgain = () => {
    setIsInviteShared(false);
    setCurrentStep(2);
  };

  const handleScanQR = () => {
    setIsModalVisible(false);
    navigation.navigate('ScanRoot', {
      onScanComplete: data => {
        try {
          setIsModalVisible(true);
          if (data) {
            setSessionId(data);
          }
        } catch (err) {
          const e = err instanceof Error ? err.message : JSON.stringify(err);
          logger.error('[OpenScanner SendTo] ' + e);
        }
      },
    });
  };

  const handleShare = async () => {
    if (!pendingJoinCode) return;
    try {
      await Share.share({
        message: pendingJoinCode,
      });
      setHasClickedShare(true);
    } catch (err: any) {
      logger.error(`Share error: ${err.message}`);
    }
  };

  const handleAddCoSigner = async () => {
    if (!sessionId.trim() || !selectedCopayer) {
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message: t("Please enter the co-signer's Session ID"),
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
      return;
    }

    setCurrentStep(2);
    await sleep(1000);

    setShowProcessing(true);
    await sleep(1000);

    try {
      const {joinCode} = await dispatch(
        addCoSignerToTSS({
          keyId,
          joinerSessionId: sessionId.trim(),
          partyId: selectedCopayer.partyId,
        }),
      );

      setPendingJoinCode(joinCode);
    } catch (err: any) {
      logger.error(`[TSS] Error adding co-signer: ${err.message}`);
      setCurrentStep(1);
      setShowProcessing(false);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message: err.message || t('Failed to add co-signer'),
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
    }
  };

  const handleStartCeremony = async () => {
    setIsCeremonyStarted(true);
    setIsCeremonyComplete(false);

    try {
      const updatedKey = await dispatch(startTSSCeremony(keyId));
      setCreatedKey(updatedKey);
      setIsCeremonyComplete(true);
    } catch (err: any) {
      logger.error(`[TSS] Ceremony error: ${err.message}`);
      setIsCeremonyStarted(false);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message: err.message || t('Failed to create wallet'),
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
    }
  };

  const getModalTitle = () => {
    // if (currentStep === 3) {
    //   const isLastCopayer = copayers.every(c => c.status === 'invited');
    //   return isLastCopayer ? t('Ready to Continue') : t('Add Another Co-signer');
    // }
    return t('Invite {{name}}', {name: selectedCopayer?.name || ''});
  };

  const renderModalTopSection = () => {
    if (currentStep === 1) {
      return (
        <TopSection>
          <TopSectionInputContainer>
            <InputContainer>
              <InputLabel>{t("Co-signer's Session ID")}</InputLabel>
              <InputWrapper>
                <StyledInput
                  value={sessionId}
                  onChangeText={setSessionId}
                  placeholder=""
                  placeholderTextColor={LuckySevens}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ScanButton onPress={handleScanQR}>
                  <QrCodeSvg width={24} height={24} />
                </ScanButton>
              </InputWrapper>
              <Button
                buttonStyle="primary"
                onPress={handleAddCoSigner}
                disabled={!sessionId.trim()}>
                {t('Continue')}
              </Button>
            </InputContainer>
          </TopSectionInputContainer>
        </TopSection>
      );
    }

    if (currentStep === 2 && !showProcessing && !pendingJoinCode) {
      return (
        <>
          <TopSection>
            <TopSectionContainer>
              <StatusContainer>
                <StepIndicator completed={true}>
                  <SuccessIcon />
                </StepIndicator>
                <StatusText>{t('Session ID accepted')}</StatusText>
              </StatusContainer>
            </TopSectionContainer>
          </TopSection>
        </>
      );
    }

    if (currentStep === 2 && showProcessing) {
      return (
        <>
          <TopSection>
            <TopSectionContainer>
              <StatusContainer>
                <StepIndicator active={true}>
                  <ClockIconSvg width={28} height={28} />
                </StepIndicator>
                <StatusText>{t('Processing...')}</StatusText>
                <StatusSubText>{t('Creating invite code')}</StatusSubText>
              </StatusContainer>
              <ShareContainer style={{opacity: 0, pointerEvents: 'none'}}>
                <ShareButton>
                  <ShareIcon width={20} height={20} fill={Action} />
                  <ShareButtonText>{t('Share Invite Code')}</ShareButtonText>
                </ShareButton>
              </ShareContainer>
            </TopSectionContainer>
          </TopSection>
        </>
      );
    }

    if (currentStep === 2 && pendingJoinCode) {
      return (
        <>
          <TopSection>
            <QRSectionContainer>
              <QRContainer>
                <QRCode
                  value={pendingJoinCode || ''}
                  size={220}
                  backgroundColor={White}
                />
              </QRContainer>
              <ShareContainer>
                <ShareButton onPress={handleShare}>
                  <ShareIcon width={20} height={20} fill={Action} />
                  <ShareButtonText>{t('Share Invite Code')}</ShareButtonText>
                </ShareButton>
              </ShareContainer>
            </QRSectionContainer>
          </TopSection>
        </>
      );
    }

    if (currentStep === 3 && isInviteShared) {
      const isLastCopayer = copayers.every(c => c.status === 'invited');

      return (
        <>
          <TopSection>
            <TopSectionContainer>
              <StatusContainer>
                <StepIndicator completed={true}>
                  <SuccessIcon />
                </StepIndicator>
                <StatusText>
                  {t('{{name}} added', {name: selectedCopayer?.name || ''})}
                </StatusText>
                <ButtonWrapper>
                  <Button buttonStyle="primary" onPress={handleCloseModal}>
                    {isLastCopayer ? t('Continue') : t('Add Another Co-signer')}
                  </Button>
                </ButtonWrapper>
              </StatusContainer>
            </TopSectionContainer>
          </TopSection>
        </>
      );
    }

    return null;
  };

  const renderStepsSection = () => {
    return (
      <StepsSection>
        <StepsContainer>
          <StepsSectionTitle>{t('Setting Up Your Wallet')}</StepsSectionTitle>

          <StepRow>
            <StepRail>
              <StepIndicator
                active={currentStep === 1}
                completed={currentStep > 1}>
                {currentStep === 1 ? (
                  <ClockIconSvg width={28} height={28} />
                ) : (
                  <SuccessIcon />
                )}
              </StepIndicator>
              <StepConnector completed={currentStep > 1} />
            </StepRail>

            <StepContent>
              <StepTitle>{t('Enter Session ID')}</StepTitle>
              <StepSubtitle>{t("Enter co-signer's session ID")}</StepSubtitle>
            </StepContent>
          </StepRow>

          <StepRowWithButton>
            <StepRail>
              <StepIndicator
                active={currentStep === 2 && !isInviteShared}
                completed={isInviteShared}>
                {isInviteShared ? (
                  <SuccessIcon />
                ) : currentStep === 2 ? (
                  <ClockIconSvg width={28} height={28} />
                ) : (
                  <StepNumber>2</StepNumber>
                )}
              </StepIndicator>
            </StepRail>

            <StepContentWithButton>
              <StepTitle>{t('Share Invite Code')}</StepTitle>
              <StepSubtitle>
                {t('Share your invite code with co-signer')}
              </StepSubtitle>
            </StepContentWithButton>

            {currentStep === 2 && pendingJoinCode && (
              <ContinuePillButton
                onPress={handleAlreadyShared}
                disabled={!hasClickedShare}
                style={{
                  opacity: hasClickedShare ? 1 : 0,
                  pointerEvents: hasClickedShare ? 'auto' : 'none',
                }}>
                <ContinuePillText>{t('Next')}</ContinuePillText>
              </ContinuePillButton>
            )}
          </StepRowWithButton>
        </StepsContainer>
      </StepsSection>
    );
  };

  const handleCeremonyComplete = () => {
    if (!createdKey) return;

    navigation.navigate(WalletScreens.BACKUP_SHARED_KEY, {
      context: 'createNewTSSKey',
      key: createdKey,
    });
  };

  if (isCeremonyStarted) {
    return (
      <Container>
        <Content
          contentContainerStyle={{flex: 1, justifyContent: 'flex-start'}}>
          <TopSection>
            <TopSectionContainer style={{minHeight: 190}}>
              <StatusContainer>
                {isCeremonyComplete ? (
                  <>
                    <StepIndicator completed={true}>
                      <SuccessIcon />
                    </StepIndicator>
                    <StatusText>
                      {t('Shared wallet has been created')}
                    </StatusText>
                  </>
                ) : (
                  <>
                    <StepIndicator active={true}>
                      <ClockIconSvg width={28} height={28} />
                    </StepIndicator>
                    <StatusText>{t('Creating the wallet')}</StatusText>
                    <StatusSubText>
                      {t('Preparing the HODL chamber')}
                    </StatusSubText>
                  </>
                )}
              </StatusContainer>
            </TopSectionContainer>
          </TopSection>
          {isCeremonyComplete && (
            <ButtonContainer>
              <Button buttonStyle="primary" onPress={handleCeremonyComplete}>
                {t('Continue')}
              </Button>
            </ButtonContainer>
          )}
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Content>
        <HeaderContainer>
          <Subtitle>
            {t(
              'Add the co-signers below. They will need join the wallet from their device and provide you with their session ID or QR code.',
            )}
          </Subtitle>
        </HeaderContainer>

        <CoSignerContainer>
          <CoSignerContainerTitle>
            {t(
              'All participants need to keep the app open to join the wallet.',
            )}
          </CoSignerContainerTitle>
          {copayers.map(copayer => (
            <CoSignerRow
              key={copayer.partyId}
              onPress={() => handleOpenModal(copayer)}>
              <CoSignerInfo>
                <NameRow>
                  <CoSignerName>{copayer.name}</CoSignerName>
                  {copayer.status === 'invited' ? (
                    <CheckMark>
                      {theme.dark ? (
                        <SuccessGreyIcon width={24} height={24} />
                      ) : (
                        <SuccessIcon width={24} height={24} />
                      )}
                    </CheckMark>
                  ) : (
                    <AddButton>
                      <QrCodeSvg width={28} height={28} />
                    </AddButton>
                  )}
                </NameRow>
                {copayer.status === 'invited' && (
                  <CoSignerStatus>
                    {t('Tap to view invitation code')}
                  </CoSignerStatus>
                )}
              </CoSignerInfo>
            </CoSignerRow>
          ))}
        </CoSignerContainer>
      </Content>

      {allInvited && (
        <ButtonContainer>
          <Button
            buttonStyle="primary"
            onPress={handleStartCeremony}
            disabled={!allInvited}>
            {t('Continue')}
          </Button>
        </ButtonContainer>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}>
        <ModalContainer>
          <ModalHeader>
            <PlaceholderView>
              {currentStep === 3 && isInviteShared && (
                <TouchableOpacity onPress={handleShareAgain}>
                  <Back />
                </TouchableOpacity>
              )}
            </PlaceholderView>
            <ModalTitle>{getModalTitle()}</ModalTitle>
            <HeaderRightContainer style={{width: 80}}>
              <Button
                accessibilityLabel="cancel-button"
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  handleCloseModal();
                }}>
                {currentStep === 3 ? t('Done') : t('Cancel')}
              </Button>
            </HeaderRightContainer>
          </ModalHeader>

          <ModalContent>
            {renderModalTopSection()}
            {renderStepsSection()}
          </ModalContent>
        </ModalContainer>
      </Modal>
    </Container>
  );
};

export default InviteCosigners;
