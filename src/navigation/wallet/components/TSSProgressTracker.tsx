import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../contexts';
import {
  White,
  Black,
  Slate,
  SlateDark,
  Slate30,
  Success25,
  Action,
  LightBlue,
  BitPay,
  Midnight,
} from '../../../styles/colors';
import {useTranslation} from 'react-i18next';
import {
  TSSSigningStatus,
  TSSSigningProgress,
  Wallet,
} from '../../../store/wallet/wallet.models';
import {
  ActiveOpacity,
  TouchableOpacity,
} from '@components/base/TouchableOpacity';
import {GetAmTimeAgo} from '../../../store/wallet/utils/time';
import ClockLightIcon from '../../../../assets/img/clock-light-outline.svg';
import ClockDarkIcon from '../../../../assets/img/clock-darkmode-outline.svg';
import SuccessLightIcon from '../../../../assets/img/check-green.svg';
import RefreshLightIcon from '../../../../assets/img/refresh.svg';
import RefreshDarkIcon from '../../../../assets/img/refresh-dark.svg';
import SuccessDarkIcon from '../../../../assets/img/check-light-green.svg';
import ChevronDownSvg from '../../../../assets/img/chevron-down.svg';
import InfoIcon from '../../../components/icons/info/Info';
import {BaseText, H4} from '../../../components/styled/Text';
import {
  TSSStepRow as StepRow,
  TSSStepRail as StepRail,
  TSSStepIndicator as StepIndicator,
  TSSStepContent as StepContent,
  TSSStepNumber as StepNumber,
} from '../../../components/styled/Containers';
import SheetModal from '../../../components/modal/base/sheet/SheetModal';
import Loader from '../../../components/loader/Loader';

const styles = StyleSheet.create({
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressButtonMarginSwap: {
    marginTop: 0,
    marginRight: 15,
    marginBottom: 5,
    marginLeft: 15,
  },
  progressButtonMarginDefault: {
    margin: 0,
  },
  progressIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressButtonText: {
    fontSize: 16,
  },
  progressBarContainer: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginTop: 0,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepTime: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  helpButton: {
    marginLeft: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  helpBanner: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  helpBannerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  copayerList: {
    marginTop: 0,
    marginBottom: 0,
  },
  copayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
    position: 'relative',
  },
  copayerIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  copayerName: {
    fontSize: 14,
  },
});

const TimeAgo: React.FC<{date: Date}> = ({date}) => {
  const theme = useTheme();
  const [label, setLabel] = useState(() => GetAmTimeAgo(date.getTime()));
  useEffect(() => {
    const interval = setInterval(
      () => setLabel(GetAmTimeAgo(date.getTime())),
      60000,
    );
    return () => clearInterval(interval);
  }, [date]);
  return (
    <BaseText style={[styles.stepTime, {color: theme.colors.description}]}>
      {label}
    </BaseText>
  );
};

export interface TSSCopayer {
  id: string;
  name: string;
  signed: boolean;
}

export type TSSProgressTrackerContext = 'swapCrypto';

interface TSSProgressTrackerProps {
  status: TSSSigningStatus;
  progress: TSSSigningProgress;
  createdBy: string;
  date: Date;
  copayers: TSSCopayer[];
  isModalVisible?: boolean;
  onModalVisibilityChange?: (visible: boolean) => void;
  wallet?: Wallet;
  onCopayersInitialized?: (copayers: TSSCopayer[]) => void;
  hideTracker?: boolean;
  context?: TSSProgressTrackerContext;
  txpCreatorId?: string;
}

const TSSProgressTracker: React.FC<TSSProgressTrackerProps> = ({
  status,
  progress,
  createdBy,
  date,
  copayers,
  isModalVisible: externalIsVisible,
  wallet,
  onCopayersInitialized,
  onModalVisibilityChange,
  hideTracker,
  context,
  txpCreatorId,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const [internalIsVisible, setInternalIsVisible] = useState(false);

  const isModalVisible = externalIsVisible ?? internalIsVisible;
  const setModalVisible = (visible: boolean) => {
    if (onModalVisibilityChange) {
      onModalVisibilityChange(visible);
    } else {
      setInternalIsVisible(visible);
    }
  };

  const [showSigningHelp, setShowSigningHelp] = useState(false);
  const signingStartedAt = useRef<number | null>(null);

  const copayerOpacities = useRef<Map<string, Animated.Value>>(
    new Map(),
  ).current;
  const [hiddenCopayerIds, setHiddenCopayerIds] = useState<Set<string>>(
    new Set(),
  );
  const fadeAnimationDone = useRef(false);

  useEffect(() => {
    copayers.forEach(c => {
      if (!copayerOpacities.has(c.id)) {
        copayerOpacities.set(c.id, new Animated.Value(1));
      }
    });
  }, [copayers, copayerOpacities]);

  useEffect(() => {
    if (status !== 'signature_generation') {
      fadeAnimationDone.current = false;
      setHiddenCopayerIds(new Set());
      copayerOpacities.forEach(opacity => opacity.setValue(1));
    }
  }, [status, copayerOpacities]);

  useEffect(() => {
    if (status !== 'signature_generation') return;
    if (fadeAnimationDone.current) return;
    const signedCount = copayers.filter(c => c.signed).length;
    const m = wallet?.tssMetadata?.m ?? copayers.length;
    if (signedCount < m) return;

    fadeAnimationDone.current = true;

    const toFade = copayers.filter(c => !c.signed);
    if (!toFade.length) return;

    const animations = toFade
      .map(c => copayerOpacities.get(c.id))
      .filter((v): v is Animated.Value => !!v)
      .map(opacity =>
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      );
    Animated.parallel(animations).start(() => {
      setHiddenCopayerIds(new Set(toFade.map(c => c.id)));
    });
  }, [status, copayers, copayerOpacities, wallet]);

  useEffect(() => {
    if (status === 'signature_generation') {
      if (signingStartedAt.current === null) {
        signingStartedAt.current = Date.now();
      }
      const timer = setTimeout(() => {
        setShowSigningHelp(true);
      }, 2 * 60 * 1000);
      return () => clearTimeout(timer);
    } else {
      signingStartedAt.current = null;
      setShowSigningHelp(false);
    }
  }, [status]);

  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (status === 'signature_generation') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [status, spinAnim]);
  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const ClockIcon = theme.dark ? ClockDarkIcon : ClockLightIcon;
  const SuccessIcon = theme.dark ? SuccessDarkIcon : SuccessLightIcon;
  const RefreshIcon = theme.dark ? RefreshDarkIcon : RefreshLightIcon;

  const getButtonText = (): string => {
    switch (status) {
      case 'initializing':
        return context === 'swapCrypto'
          ? t('TSS Waiting to initialize')
          : t('Waiting to initialize');
      case 'waiting_for_cosigners':
        return t('Waiting for co-signers');
      case 'signature_generation':
        return t('Signature Generation');
      case 'broadcasting':
        return t('Broadcast Transaction');
      case 'complete':
        return t('Complete');
      case 'error':
      default:
        return t('Waiting to initialize');
    }
  };

  const getProgressPercentage = (): number => {
    const statusProgress: Record<TSSSigningStatus, number> = {
      initializing: 0,
      waiting_for_cosigners: 25,
      signature_generation: 50,
      broadcasting: 75,
      complete: 100,
      error: 0,
    };

    if (status === 'signature_generation' && progress.totalRounds > 0) {
      const baseProgress = 50;
      const roundProgress = (progress.currentRound / progress.totalRounds) * 25;
      return baseProgress + roundProgress;
    }

    return statusProgress[status] || 0;
  };

  const getStepStatus = (step: number): 'pending' | 'active' | 'complete' => {
    const statusOrder: TSSSigningStatus[] = [
      'initializing',
      'waiting_for_cosigners',
      'signature_generation',
      'broadcasting',
      'complete',
    ];

    const currentIndex = statusOrder.indexOf(status);

    if (step < currentIndex) return 'complete';
    if (step === currentIndex) return 'active';
    return 'pending';
  };

  const creatorCopayerName = wallet?.copayers?.find(
    c => c.id === txpCreatorId,
  )?.name;

  const steps = [
    {
      title: t('Proposal Created'),
      subtitle: createdBy,
      time: date,
    },
    {
      title: t('Waiting for co-signers'),
      subtitle: wallet?.tssMetadata?.m
        ? t('{{m}} signatures required', {m: wallet.tssMetadata.m})
        : undefined,
      showCopayers: true,
    },
    {
      title: t('Signature Generation'),
    },
    {
      title: t('Broadcast Transaction'),
    },
  ];

  const handleClose = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    if (wallet && onCopayersInitialized && copayers.length === 0) {
      const initialCopayers =
        wallet.copayers?.map(copayer => ({
          id: copayer.id,
          name: copayer.name,
          signed: false,
        })) || [];

      onCopayersInitialized(initialCopayers);
    }
  }, [wallet, onCopayersInitialized, copayers.length]);

  return (
    <>
      {!hideTracker ? (
        <View style={{paddingBottom: 10}}>
          <TouchableOpacity
            activeOpacity={ActiveOpacity}
            onPress={() => setModalVisible(true)}
            style={[
              styles.progressButton,
              {borderColor: theme.dark ? SlateDark : Slate30},
              context === 'swapCrypto'
                ? styles.progressButtonMarginSwap
                : styles.progressButtonMarginDefault,
            ]}>
            <View
              style={[
                styles.progressIndicator,
                {
                  backgroundColor:
                    status === 'complete'
                      ? theme.dark
                        ? '#004D27'
                        : Success25
                      : theme.dark
                      ? '#2240C440'
                      : LightBlue,
                },
              ]}>
              {status === 'complete' ? (
                <SuccessIcon width={20} height={16} />
              ) : (
                <ClockIcon width={28} height={28} />
              )}
            </View>
            <View style={{flex: 1, marginRight: 12}}>
              <BaseText
                style={[styles.progressButtonText, {color: theme.colors.text}]}>
                {getButtonText()}
              </BaseText>
              <View
                style={[
                  styles.progressBarContainer,
                  {backgroundColor: theme.dark ? '#2A2A2A' : '#E5E5E5'},
                  {marginTop: 6},
                ]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${getProgressPercentage()}%`,
                      backgroundColor:
                        status === 'complete'
                          ? theme.dark
                            ? '#00A651'
                            : '#2FCF6E'
                          : Action,
                    },
                  ]}
                />
              </View>
            </View>
            <ChevronDownSvg width={16} height={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <></>
      )}

      <SheetModal
        isVisible={isModalVisible}
        onBackdropPress={handleClose}
        modalLibrary="bottom-sheet">
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={{width: 24}} />
            <H4 style={{color: theme.colors.text}}>
              {t('Transaction Progress')}
            </H4>
            <View style={{width: 24}} />
          </View>

          <View>
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const isActive = stepStatus === 'active';
              const isComplete = stepStatus === 'complete';
              const showCopayers = step.showCopayers;

              return (
                <View key={index}>
                  <StepRow style={{alignItems: 'stretch'}}>
                    <StepRail>
                      <StepIndicator active={isActive} completed={isComplete}>
                        {isComplete ? (
                          <SuccessIcon width={20} height={16} />
                        ) : isActive && index === 2 ? (
                          <Animated.View
                            style={{transform: [{rotate: spinInterpolate}]}}>
                            <RefreshIcon width={24} height={24} />
                          </Animated.View>
                        ) : isActive ? (
                          <ClockIcon width={28} height={28} />
                        ) : (
                          <StepNumber>{index + 1}</StepNumber>
                        )}
                      </StepIndicator>
                      {index < steps.length - 1 &&
                        !(index === 2 && showSigningHelp) && (
                          <View
                            style={[
                              styles.stepConnector,
                              {
                                backgroundColor:
                                  getStepStatus(index + 1) !== 'pending'
                                    ? theme.dark
                                      ? '#004D27'
                                      : Success25
                                    : theme.dark
                                    ? '#2A2A2A'
                                    : LightBlue,
                              },
                            ]}
                          />
                        )}
                    </StepRail>

                    <StepContent style={{paddingTop: index >= 2 ? 10 : 5}}>
                      <View
                        style={{flexDirection: 'row', alignItems: 'center'}}>
                        <BaseText
                          style={[
                            styles.stepTitle,
                            {color: theme.dark ? White : Black},
                          ]}>
                          {step.title}
                        </BaseText>
                        {index === 2 && (
                          <TouchableOpacity
                            activeOpacity={ActiveOpacity}
                            onPress={() => setShowSigningHelp(v => !v)}
                            style={styles.helpButton}>
                            <InfoIcon
                              bgColor={theme.dark ? Slate : undefined}
                            />
                          </TouchableOpacity>
                        )}
                        {step.time &&
                          status !== 'initializing' &&
                          status !== 'error' && <TimeAgo date={step.time} />}
                      </View>
                      {index === 2 && showSigningHelp && (
                        <View
                          style={[
                            styles.helpBanner,
                            {
                              backgroundColor: theme.dark
                                ? Midnight
                                : LightBlue,
                            },
                          ]}>
                          <BaseText
                            style={[
                              styles.helpBannerText,
                              {color: theme.dark ? White : BitPay},
                            ]}>
                            {t(
                              'All co-signers must have the app open and active during signing. If the session gets stuck, delete this proposal and create a new one.',
                            )}
                          </BaseText>
                        </View>
                      )}
                      {step.subtitle && (
                        <BaseText
                          style={[
                            styles.stepSubtitle,
                            {color: theme.dark ? White : SlateDark},
                          ]}>
                          {index === 0 && creatorCopayerName
                            ? `${step.subtitle} - ${t(
                                'Created by',
                              )}: ${creatorCopayerName}`
                            : step.subtitle}
                        </BaseText>
                      )}

                      {showCopayers && copayers.length > 0 && (
                        <View style={[styles.copayerList, {marginTop: 8}]}>
                          {copayers
                            .filter(c => !hiddenCopayerIds.has(c.id))
                            .map(copayer => (
                              <Animated.View
                                key={copayer.id}
                                style={{
                                  opacity:
                                    copayerOpacities.get(copayer.id) ?? 1,
                                }}>
                                <View style={styles.copayerRow}>
                                  <View
                                    style={[
                                      styles.copayerIndicator,
                                      {
                                        backgroundColor: copayer.signed
                                          ? theme.dark
                                            ? '#004D27'
                                            : Success25
                                          : 'transparent',
                                      },
                                    ]}>
                                    {copayer.signed ? (
                                      <SuccessIcon width={12} height={12} />
                                    ) : (
                                      <Loader size={16} spinning />
                                    )}
                                  </View>
                                  <BaseText
                                    style={[
                                      styles.copayerName,
                                      {
                                        color: copayer.signed
                                          ? theme.dark
                                            ? White
                                            : Black
                                          : theme.dark
                                          ? White
                                          : SlateDark,
                                      },
                                    ]}>
                                    {copayer.name}
                                  </BaseText>
                                </View>
                              </Animated.View>
                            ))}
                        </View>
                      )}
                    </StepContent>
                  </StepRow>
                </View>
              );
            })}
          </View>
        </View>
      </SheetModal>
    </>
  );
};

export default TSSProgressTracker;
