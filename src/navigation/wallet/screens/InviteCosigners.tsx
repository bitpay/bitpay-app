import React, {useState, useEffect, useLayoutEffect} from 'react';
import {
  ScrollView,
  Modal,
  useWindowDimensions,
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
import {shareNative} from '../../../utils/share';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';
import {useAppDispatch, useAppSelector} from '../../../utils/hooks';
import {
  startTSSCeremony,
  addCoSignerToTSS,
  cancelTSSCeremony,
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
  LightBlue,
  BitPay,
  Midnight,
} from '../../../styles/colors';
import {BaseText} from '../../../components/styled/Text';
import {
  HeaderRightContainer,
  ScreenGutter,
  TSSQRSectionContainer as QRSectionContainer,
  TSSQRContainer as QRContainer,
  TSSShareContainer as ShareContainer,
  TSSShareButtonText as ShareButtonText,
  TSSStepsSection as StepsSection,
  TSSStepsContainer as StepsContainer,
  TSSStepRow as StepRow,
  TSSStepRowWithButton as StepRowWithButton,
  TSSStepContentWithButton as StepContentWithButton,
  TSSStepRail as StepRail,
  TSSStepIndicator as StepIndicator,
  TSSStepConnector as StepConnector,
  TSSStepContent as StepContent,
  TSSContinuePillButton as ContinuePillButton,
  TSSContinuePillText as ContinuePillText,
  TSSInputWrapper as InputWrapper,
  TSSStyledInput as StyledInput,
  TSSErrorText as ErrorText,
  TSSStepsSectionTitle as StepsSectionTitle,
  TSSStepNumber as StepNumber,
  TSSStepSubtitle as StepSubtitle,
  TSSStepTitle as StepTitle,
  TSSStatusText as StatusText,
  TSSStatusSubText as StatusSubText,
} from '../../../components/styled/Containers';
import Button from '../../../components/button/Button';
import TypewriterText from '../components/TypewriterText';
import {useLogger} from '../../../utils/hooks/useLogger';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {Key, TSSCopayerInfo} from '../../../store/wallet/wallet.models';
import AddIconBlackSvg from '../../../../assets/img/add-black.svg';
import AddIconGreySvg from '../../../../assets/img/add-grey.svg';
import SuccessLightIcon from '../../../../assets/img/check-dark.svg';
import SuccessDarkIcon from '../../../../assets/img/check.svg';
import SuccessGreyIcon from '../../../../assets/img/check-grey.svg';
import ClockLightIcon from '../../../../assets/img/clock-light-outline.svg';
import ClockDarkIcon from '../../../../assets/img/clock-darkmode-outline.svg';
import QrCodeSvgBlack from '../../../../assets/img/qr-code-black.svg';
import QrCodeSvgGrey from '../../../../assets/img/qr-code-grey.svg';
import ShareIcon from '../../../../assets/img/share-icon.svg';
import haptic from '../../../components/haptic-feedback/haptic';
import {useTheme} from '../../../contexts';
import {useNavigation} from '@react-navigation/native';
import {TouchableOpacity} from '../../../components/base/TouchableOpacity';
import Back from '../../../components/back/Back';
import {useAndroidBackHandler} from 'react-navigation-backhandler';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: parseInt(ScreenGutter, 10),
  },
  headerContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  coSignerContainerTitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  coSignerContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 17,
  },
  coSignerRow: {
    borderRadius: 12,
  },
  coSignerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coSignerName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  coSignerStatus: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    padding: 8,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 40,
    height: 40,
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    padding: parseInt(ScreenGutter, 10),
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  placeholderView: {
    minWidth: 60,
    height: 40,
  },
  modalContent: {
    flex: 1,
  },
  topSection: {
    paddingVertical: 24,
    paddingHorizontal: parseInt(ScreenGutter, 10),
  },
  topSectionContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 390,
    justifyContent: 'center',
  },
  inputContainer: {
    padding: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 12,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    flex: 1,
    width: '100%',
  },
  qrCodeWrapper: {
    backgroundColor: White,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sessionIdHelpBanner: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sessionIdHelpTitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  helpStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  helpStepBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  helpStepBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: White,
  },
  helpStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});

const Container = ({
  style,
  ...rest
}: React.ComponentProps<typeof SafeAreaView>) => (
  <SafeAreaView style={[styles.container, style]} {...rest} />
);

const Content = ({style, ...rest}: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView style={[styles.content, style]} {...rest} />
);

const HeaderContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.headerContainer, style]} {...rest} />
);

const Subtitle = ({style, ...rest}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.subtitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const CoSignerContainerTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.coSignerContainerTitle,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const CoSignerContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.coSignerContainer,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const CoSignerRow = ({
  style,
  ...rest
}: React.ComponentProps<typeof RNTouchableOpacity>) => (
  <RNTouchableOpacity style={[styles.coSignerRow, style]} {...rest} />
);

const CoSignerInfo = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.coSignerInfo, style]} {...rest} />
);

const NameRow = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.nameRow, style]} {...rest} />
);

const CoSignerName = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.coSignerName,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const CoSignerStatus = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.coSignerStatus,
        {color: theme.dark ? Slate30 : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const AddButton = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.addButton,
        {backgroundColor: theme.dark ? LightBlack : '#F5F5F5'},
        style,
      ]}
      {...rest}
    />
  );
};

const CheckMark = ({style, ...rest}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.checkMark,
        {backgroundColor: theme.dark ? '#004D27' : Success25},
        style,
      ]}
      {...rest}
    />
  );
};

const ButtonContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.buttonContainer, style]} {...rest} />
);

const ModalContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
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

const ModalHeader = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.modalHeader, style]} {...rest} />
);

const ModalTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.modalTitle, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
};

const HeaderButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof RNTouchableOpacity>) => (
  <RNTouchableOpacity style={[styles.headerButton, style]} {...rest} />
);

const PlaceholderView = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.placeholderView, style]} {...rest} />
);

const ModalContent = ({
  style,
  ...rest
}: React.ComponentProps<typeof ScrollView>) => (
  <ScrollView style={[styles.modalContent, style]} {...rest} />
);

const TopSection = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.topSection, style]} {...rest} />
);

const TopSectionInputContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => <View style={style} {...rest} />;

const TopSectionContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.topSectionContainer,
        {borderColor: theme.dark ? SlateDark : Slate30},
        style,
      ]}
      {...rest}
    />
  );
};

const InputContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.inputContainer, style]} {...rest} />
);

const InputLabel = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.inputLabel, {color: theme.dark ? White : Black}, style]}
      {...rest}
    />
  );
};

const ScanButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof RNTouchableOpacity>) => (
  <RNTouchableOpacity style={style} {...rest} />
);

const StatusContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.statusContainer, style]} {...rest} />
);

const QRCodeWrapper = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.qrCodeWrapper, style]} {...rest} />
);

const ShareButton = ({
  style,
  ...rest
}: React.ComponentProps<typeof RNTouchableOpacity>) => (
  <RNTouchableOpacity style={[styles.shareButton, style]} {...rest} />
);

const ButtonWrapper = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.buttonWrapper, style]} {...rest} />
);

const SessionIdHelpBanner = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.sessionIdHelpBanner,
        {backgroundColor: theme.dark ? Midnight : LightBlue},
        style,
      ]}
      {...rest}
    />
  );
};

const SessionIdHelpTitle = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.sessionIdHelpTitle,
        {color: theme.dark ? White : BitPay},
        style,
      ]}
      {...rest}
    />
  );
};

const HelpStepRow = ({style, ...rest}: React.ComponentProps<typeof View>) => (
  <View style={[styles.helpStepRow, style]} {...rest} />
);

const HelpStepBubble = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.helpStepBubble,
        {backgroundColor: theme.dark ? SlateDark : BitPay},
        style,
      ]}
      {...rest}
    />
  );
};

const HelpStepBubbleText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.helpStepBubbleText, style]} {...rest} />
);

const HelpStepText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[styles.helpStepText, {color: theme.dark ? White : BitPay}, style]}
      {...rest}
    />
  );
};

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

  const {height: screenHeight} = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;

  const {keyId} = route.params;
  const key = useAppSelector(({WALLET}) => WALLET.keys[keyId]);
  const tssSession = key?.tssSession;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showSessionIdHelp, setShowSessionIdHelp] = useState(true);
  const [selectedCopayer, setSelectedCopayer] = useState<TSSCopayerInfo | null>(
    null,
  );
  const [sessionId, setSessionId] = useState('');

  const [currentStep, setCurrentStep] = useState(1);
  const [showProcessing, setShowProcessing] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  const [isCeremonyStarted, setIsCeremonyStarted] = useState(
    tssSession?.status === 'ceremony_in_progress',
  );
  const [isCeremonyComplete, setIsCeremonyComplete] = useState(false);
  const [isCeremonyInRounds, setIsCeremonyInRounds] = useState(false);
  const [createdKey, setCreatedKey] = useState<Key | null>(null);
  const [isInviteShared, setIsInviteShared] = useState(false);
  const [addCoSignerError, setAddCoSignerError] = useState<string | null>(null);

  useAndroidBackHandler(() => isCeremonyStarted);

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isCeremonyStarted,
      headerLeft: isCeremonyStarted ? () => null : undefined,
    });
  }, [isCeremonyStarted, navigation]);

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
    setAddCoSignerError(null);
    setShowSessionIdHelp(true);
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
      await dispatch(shareNative({message: pendingJoinCode}));
    } catch (err: any) {
      logger.error(`Share error: ${err.message}`);
    }
  };

  const handleAddCoSigner = async () => {
    setAddCoSignerError(null);
    if (!sessionId.trim() || !selectedCopayer) {
      setAddCoSignerError(t("Please enter the co-signer's Session ID"));
      return;
    }

    try {
      const {joinCode} = await dispatch(
        addCoSignerToTSS({
          keyId,
          joinerSessionId: sessionId.trim(),
          partyId: selectedCopayer.partyId,
        }),
      );

      setPendingJoinCode(joinCode);
      setCurrentStep(2);
      setShowProcessing(true);
    } catch (err: any) {
      logger.error(`[TSS] Add co-signer error: ${err.message}`);
      if (err.message === 'This co-signer has already been invited') {
        setAddCoSignerError(t('This co-signer has already been invited.'));
      } else {
        setAddCoSignerError(
          t('Invalid Session ID. Please verify and try again.'),
        );
      }
    }
  };

  useEffect(() => {
    if (tssSession?.status === 'ceremony_in_progress') {
      handleStartCeremony();
    }
    return () => {
      dispatch(cancelTSSCeremony(keyId));
    };
  }, []);

  const handleStartCeremony = async () => {
    setIsCeremonyStarted(true);
    setIsCeremonyComplete(false);

    try {
      const updatedKey = await dispatch(
        startTSSCeremony(keyId, () => setIsCeremonyInRounds(true)),
      );
      setCreatedKey(updatedKey);
      setIsCeremonyComplete(true);
    } catch (err: any) {
      if (err.message === 'CEREMONY_ALREADY_RUNNING') {
        return;
      }
      logger.error(`[TSS] Ceremony error: ${err.message}`);
      setIsCeremonyStarted(false);
      const message =
        err.message === 'CEREMONY_TIMEOUT'
          ? t(
              'The wallet creation timed out. This session is no longer valid — please create a new wallet.',
            )
          : err.message === 'CEREMONY_STUCK'
          ? t(
              'Session out of sync with the server. This can happen if a device was restarted during the ceremony — please create a new wallet.',
            )
          : err.message || t('Failed to create wallet');
      dispatch(
        showBottomNotificationModal({
          type: 'error',
          title: t('Error'),
          message,
          enableBackdropDismiss: true,
          actions: [{text: t('OK'), action: () => {}, primary: true}],
        }),
      );
    }
  };

  const getModalTitle = () => {
    // if (currentStep === 3) {
    //   const isLastCopayer = copayers.every(c => c.status === 'invited');
    //   return isLastCopayer ? t('Ready to Continue') : t('Add Another Co-Signer');
    // }
    return t('Invite {{name}}', {name: selectedCopayer?.name || ''});
  };

  const renderModalTopSection = () => {
    if (currentStep === 1) {
      return (
        <TopSection>
          <TopSectionInputContainer>
            <InputContainer>
              <InputLabel>
                {t('{{name}} Session ID', {
                  name: selectedCopayer?.name || t('Co-Signer'),
                })}
              </InputLabel>
              <InputWrapper>
                <StyledInput
                  value={sessionId}
                  onChangeText={text => {
                    setSessionId(text);
                    setAddCoSignerError(null);
                    if (text.trim()) {
                      setShowSessionIdHelp(false);
                    }
                  }}
                  placeholder=""
                  placeholderTextColor={LuckySevens}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <ScanButton onPress={handleScanQR}>
                  <QrCodeSvg width={24} height={24} />
                </ScanButton>
              </InputWrapper>
              {addCoSignerError && <ErrorText>{addCoSignerError}</ErrorText>}
              <SessionIdHelpBanner>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowSessionIdHelp(v => !v)}>
                  <SessionIdHelpTitle
                    style={{fontSize: isSmallScreen ? 11 : 13}}>
                    {t('How to find the Session ID?')}
                  </SessionIdHelpTitle>
                </TouchableOpacity>
                {showSessionIdHelp && (
                  <>
                    {[
                      t(
                        'Ask the co-signer who is joining the wallet to open the app.',
                      ),
                      <>
                        {t('Tap the ')}
                        <HelpStepText
                          style={{
                            fontWeight: '700',
                            fontSize: isSmallScreen ? 11 : 13,
                          }}>
                          +
                        </HelpStepText>
                        {t(' icon next to ')}
                        <HelpStepText
                          style={{
                            fontWeight: '700',
                            fontSize: isSmallScreen ? 11 : 13,
                          }}>
                          {t('Your Crypto')}
                        </HelpStepText>
                        {'.'}
                      </>,
                      <>
                        {t('Select ')}
                        <HelpStepText
                          style={{
                            fontWeight: '700',
                            fontSize: isSmallScreen ? 11 : 13,
                          }}>
                          {t('Join Shared Wallet')}
                        </HelpStepText>
                        {'.'}
                      </>,
                      <>
                        {t('Choose ')}
                        <HelpStepText
                          style={{
                            fontWeight: '700',
                            fontSize: isSmallScreen ? 11 : 13,
                          }}>
                          {t('Threshold Signature Wallet')}
                        </HelpStepText>
                        {'.'}
                      </>,
                      t(
                        'After the co-signer enters their name, the Session ID will be displayed and ready to share.',
                      ),
                    ].map((text, i, arr) => (
                      <HelpStepRow
                        key={i}
                        style={{
                          marginTop: i === 0 ? (isSmallScreen ? 6 : 10) : 0,
                          marginBottom:
                            i === arr.length - 1 ? 0 : isSmallScreen ? 4 : 10,
                        }}>
                        <HelpStepBubble>
                          <HelpStepBubbleText
                            style={{fontSize: isSmallScreen ? 10 : 11}}>
                            {i + 1}
                          </HelpStepBubbleText>
                        </HelpStepBubble>
                        <HelpStepText
                          style={{fontSize: isSmallScreen ? 11 : 13}}>
                          {text}
                        </HelpStepText>
                      </HelpStepRow>
                    ))}
                  </>
                )}
              </SessionIdHelpBanner>
              <Button
                buttonStyle="primary"
                onPress={handleAddCoSigner}
                disabled={!sessionId.trim()}
                touchableLibrary={'react-native'}>
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
                  <Button
                    buttonStyle="primary"
                    onPress={handleCloseModal}
                    touchableLibrary={'react-native'}>
                    {isLastCopayer ? t('Continue') : t('Add Another Co-Signer')}
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
              <StepSubtitle>{t("Enter Co-signer's Session ID")}</StepSubtitle>
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
              <ContinuePillButton onPress={handleAlreadyShared}>
                <ContinuePillText>{t('Done')}</ContinuePillText>
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
            <TopSectionContainer style={{height: 190}}>
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
                      {isCeremonyInRounds ? (
                        <TypewriterText
                          text={t('Preparing the HODL chamber')}
                        />
                      ) : (
                        ' '
                      )}
                    </StatusSubText>
                  </>
                )}
              </StatusContainer>
            </TopSectionContainer>
          </TopSection>
          {isCeremonyComplete && (
            <ButtonContainer>
              <Button
                buttonStyle="primary"
                onPress={handleCeremonyComplete}
                touchableLibrary={'react-native'}>
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
              'Add the co-signers below. They will need to join the wallet from their device and provide you with their session ID or QR code.',
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
                      <AddIconSvg width={28} height={28} />
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
            disabled={!allInvited}
            touchableLibrary={'react-native'}>
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
                testID="cancel-button"
                accessibilityLabel="Cancel"
                buttonType={'pill'}
                onPress={() => {
                  haptic('impactLight');
                  handleCloseModal();
                }}
                touchableLibrary={'react-native'}>
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
