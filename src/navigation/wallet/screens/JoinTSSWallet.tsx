import React, {useState, useEffect} from 'react';
import {Share, TextInput} from 'react-native';
import styled from 'styled-components/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import {useTheme} from 'styled-components/native';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  generateJoinerSessionId,
  joinTSSWithCode,
} from '../../../store/wallet/effects/create-multisig/create-multisig';
import {RootStacks} from '../../../Root';
import {TabsScreens} from '../../tabs/TabsStack';
import {
  White,
  SlateDark,
  LuckySevens,
  Action,
  Black,
  NeutralSlate,
  Slate30,
  Success25,
  LinkBlue,
} from '../../../styles/colors';
import {BaseText, H5} from '../../../components/styled/Text';
import {ScreenGutter} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import {useLogger} from '../../../utils/hooks/useLogger';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {useOngoingProcess} from '../../../contexts';
import {Key} from '../../../store/wallet/wallet.models';
import ShareIcon from '../../../../assets/img/share-icon.svg';
import ClockLightIcon from '../../../../assets/img/clock-blue.svg';
import ClockDarkIcon from '../../../../assets/img/clock-light-blue.svg';
import SuccessLightIcon from '../../../../assets/img/check-dark.svg';
import SuccessDarkIcon from '../../../../assets/img/check.svg';
import QrCodeLightSvg from '../../../../assets/img/qr-code-black.svg';
import QrCodeDarkSvg from '../../../../assets/img/qr-code-grey.svg';
import {ScanScreens} from '../../../navigation/scan/ScanGroup';

const Container = styled.SafeAreaView`
  flex: 1;
`;

const Content = styled.ScrollView`
  flex: 1;
`;

const QRSection = styled.View`
  padding: 24px ${ScreenGutter};
`;

const QRSectionContainer = styled.View`
  align-items: center;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) =>
    dark ? 'rgba(255,255,255,0.1)' : Slate30};
  min-height: 355px;
`;

const QRContainer = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
  background-color: ${White};
  border-radius: 12px;
  margin: 16px;
`;

const SessionAcceptedContainer = styled.View`
  align-items: center;
  justify-content: center;
  flex-direction: column;
  flex: 1;
`;

const SessionAcceptedText = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const SessionAcceptedSubText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ShareContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: 16px;
  padding-bottom: 16px;
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) =>
    dark ? 'rgba(255,255,255,0.1)' : Slate30};
`;

const ShareButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 8px 12px;
`;

const ShareButtonText = styled(BaseText)`
  margin-left: 8px;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
  font-size: 16px;
  font-weight: 500;
`;

const InviteCodeSection = styled.View`
  padding: 0 ${ScreenGutter};
`;

const InviteCodeContainer = styled.View`
  border-radius: 12px;
  padding: 16px;
  min-height: 355px;
`;

const InviteCodeLabel = styled(BaseText)`
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

const ScanButton = styled.TouchableOpacity`
  padding: 4px;
`;

const StepsSection = styled.View`
  padding: 24px ${ScreenGutter};
`;

const StepsContainer = styled.View`
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) =>
    dark ? 'rgba(255,255,255,0.1)' : Slate30};
`;

const StepsSectionTitle = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 12px;
`;

const StepRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

const StepConnector = styled.View<{completed?: boolean}>`
  width: 2px;
  height: 20px;
  background-color: ${({theme: {dark}, completed}) =>
    completed ? (dark ? '#004D27' : Success25) : dark ? '#2A2A2A' : '#F5F5F5'};
  margin-left: 20px;
  margin-bottom: -2px;
  margin-top: -2px;
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
  margin-right: 12px;
`;

const StepNumber = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  font-weight: 400;
`;

const StepContent = styled.View`
  flex: 1;
`;

const StepTitle = styled(BaseText)`
  font-size: 16px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const StepSubtitle = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  line-height: 20px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 40px;
`;

const LoadingText = styled(H5)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
`;

const ButtonContainer = styled.View`
  padding: 16px ${ScreenGutter};
`;

type Props = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.JOIN_TSS_WALLET
>;

const JoinTSSWallet: React.FC<Props> = ({navigation, route}) => {
  const dispatch = useAppDispatch();
  const {t} = useTranslation();
  const logger = useLogger();
  const theme = useTheme();
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();

  const ClockIconSvg = theme.dark ? ClockDarkIcon : ClockLightIcon;
  const SuccessIcon = theme.dark ? SuccessDarkIcon : SuccessLightIcon;
  const QrCodeSvg = theme.dark ? QrCodeDarkSvg : QrCodeLightSvg;
  const copayerName = route.params?.copayerName;

  const pendingJoinerSession = useAppSelector(
    ({WALLET}) => WALLET.pendingJoinerSession,
  );

  const [sessionId, setSessionId] = useState<string>('');
  const [partyKey, setPartyKey] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [showWaitingCopayers, setShowWaitingCopayers] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [createdKey, setCreatedKey] = useState<Key | null>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    if (currentStep === 2) {
      const timer = setTimeout(() => {
        setShowInviteInput(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 3) {
      const timer = setTimeout(() => {
        setShowWaitingCopayers(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const initializeSession = async () => {
    if (pendingJoinerSession) {
      logger.debug('[TSS Join] Restoring persisted session');
      setSessionId(pendingJoinerSession.sessionId);
      setPartyKey(pendingJoinerSession.partyKey);
      setIsLoading(false);
      return;
    }
    await generateNewSession();
  };

  const generateNewSession = async () => {
    setIsLoading(true);
    try {
      const result = await dispatch(
        generateJoinerSessionId({name: copayerName}),
      );
      setSessionId(result.sessionId);
      setPartyKey(result.partyKey);
      logger.debug('[TSS Join] Session ID generated');
    } catch (err: any) {
      logger.error(`[TSS Join] Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: sessionId,
      });
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    } catch (err: any) {
      logger.error(`Share error: ${err.message}`);
    }
  };

  const handleScanQR = () => {
    navigation.navigate(ScanScreens.Root, {
      onScanComplete: (data: string) => {
        setInviteCode(data);
      },
    });
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message: t('Please enter the Invite Code'),
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
      return;
    }

    setCurrentStep(3);
    showOngoingProcess('JOIN_WALLET');

    try {
      const key = await dispatch(
        joinTSSWithCode({
          joinCode: inviteCode.trim(),
          partyKey,
          copayerName,
        }),
      );

      hideOngoingProcess();

      setCreatedKey(key);
      setIsWalletReady(true);
    } catch (err: any) {
      hideOngoingProcess();
      setCurrentStep(2);
      logger.error(`[TSS Join] Error: ${err.message}`);
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message: err.message || t('Failed to join wallet'),
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
    }
  };

  const handleContinue = () => {
    if (!createdKey) {
      return;
    }

    navigation.navigate(WalletScreens.BACKUP_SHARED_KEY, {
      context: 'joinTSSKey',
      key: createdKey,
    });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingText>{t('Generating Session...')}</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }

  const renderTopSection = () => {
    if (currentStep === 1) {
      return (
        <QRSection>
          <QRSectionContainer>
            {sessionId ? (
              <QRContainer>
                <QRCode value={sessionId} size={220} backgroundColor={White} />
              </QRContainer>
            ) : null}
            <ShareContainer>
              <ShareButton onPress={handleShare}>
                <ShareIcon
                  width={20}
                  height={20}
                  fill={theme.dark ? LinkBlue : Action}
                />
                <ShareButtonText>{t('Share Session ID')}</ShareButtonText>
              </ShareButton>
            </ShareContainer>
          </QRSectionContainer>
        </QRSection>
      );
    }

    if (currentStep === 2) {
      if (showInviteInput) {
        return (
          <InviteCodeSection>
            <InviteCodeContainer>
              <InviteCodeLabel>{t("Leader's Invite Code")}</InviteCodeLabel>
              <InputWrapper>
                <StyledInput
                  value={inviteCode}
                  onChangeText={setInviteCode}
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
                onPress={handleJoin}
                disabled={!inviteCode.trim()}>
                {t('Continue')}
              </Button>
            </InviteCodeContainer>
          </InviteCodeSection>
        );
      }

      return (
        <QRSection>
          <QRSectionContainer>
            <SessionAcceptedContainer>
              <StepIndicator completed={true}>
                <SuccessIcon />
              </StepIndicator>
              <SessionAcceptedText style={{marginTop: 10}}>
                {t('Session ID accepted')}
              </SessionAcceptedText>
            </SessionAcceptedContainer>
          </QRSectionContainer>
        </QRSection>
      );
    }

    if (isWalletReady) {
      return (
        <QRSection>
          <QRSectionContainer>
            <SessionAcceptedContainer>
              <StepIndicator completed={true}>
                <SuccessIcon />
              </StepIndicator>
              <SessionAcceptedText style={{marginTop: 10}}>
                {t('All co-signers joined')}
              </SessionAcceptedText>
            </SessionAcceptedContainer>
          </QRSectionContainer>
        </QRSection>
      );
    }

    if (showWaitingCopayers) {
      return (
        <QRSection>
          <QRSectionContainer>
            <SessionAcceptedContainer>
              <StepIndicator active={true}>
                <ClockIconSvg width={28} height={28} />
              </StepIndicator>
              <SessionAcceptedText style={{marginTop: 10}}>
                {t('Waiting for others to join')}
              </SessionAcceptedText>
              <SessionAcceptedSubText style={{marginTop: 4}}>
                {t('Preparing the HODL chamber')}
              </SessionAcceptedSubText>
            </SessionAcceptedContainer>
          </QRSectionContainer>
        </QRSection>
      );
    }

    return (
      <QRSection>
        <QRSectionContainer>
          <SessionAcceptedContainer>
            <StepIndicator completed={true}>
              <SuccessIcon />
            </StepIndicator>
            <SessionAcceptedText style={{marginTop: 10}}>
              {t('Joined Shared Wallet')}
            </SessionAcceptedText>
          </SessionAcceptedContainer>
        </QRSectionContainer>
      </QRSection>
    );
  };

  return (
    <Container>
      <Content>
        {renderTopSection()}

        <StepsSection>
          <StepsContainer>
            <StepsSectionTitle>{t('Setting Up Your Wallet')}</StepsSectionTitle>

            <StepRow>
              <StepIndicator
                active={currentStep === 1}
                completed={currentStep > 1}>
                {currentStep === 1 ? (
                  <ClockIconSvg width={28} height={28} />
                ) : (
                  <SuccessIcon />
                )}
              </StepIndicator>
              <StepContent>
                <StepTitle>{t('Share Session ID')}</StepTitle>
                <StepSubtitle>
                  {t('Share your session ID with the leader')}
                </StepSubtitle>
              </StepContent>
            </StepRow>

            <StepConnector completed={currentStep > 1} />

            <StepRow>
              <StepIndicator
                active={currentStep === 2}
                completed={currentStep > 2}>
                {currentStep > 2 ? (
                  <SuccessIcon />
                ) : currentStep === 2 ? (
                  <ClockIconSvg width={28} height={28} />
                ) : (
                  <StepNumber>2</StepNumber>
                )}
              </StepIndicator>
              <StepContent>
                <StepTitle>{t('Join via Invite Code')}</StepTitle>
                <StepSubtitle>
                  {t('Scan or paste the invite code from the leader')}
                </StepSubtitle>
              </StepContent>
            </StepRow>

            <StepConnector completed={currentStep > 2 || isWalletReady} />

            <StepRow>
              <StepIndicator
                active={currentStep === 3 && !isWalletReady}
                completed={isWalletReady}>
                {isWalletReady ? (
                  <SuccessIcon />
                ) : currentStep === 3 ? (
                  <ClockIconSvg width={28} height={28} />
                ) : (
                  <StepNumber>3</StepNumber>
                )}
              </StepIndicator>
              <StepContent>
                <StepTitle>{t('Wallet Setup')}</StepTitle>
                <StepSubtitle>
                  {t('Waiting for other co-signers to join')}
                </StepSubtitle>
              </StepContent>
            </StepRow>
          </StepsContainer>
        </StepsSection>
      </Content>

      {isWalletReady && (
        <ButtonContainer>
          <Button buttonStyle="primary" onPress={handleContinue}>
            {t('Continue')}
          </Button>
        </ButtonContainer>
      )}
    </Container>
  );
};

export default JoinTSSWallet;
