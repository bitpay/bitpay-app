import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import styled, {useTheme} from 'styled-components/native';
import {
  White,
  Black,
  SlateDark,
  Slate30,
  Success25,
  Action,
  LightBlue,
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

const ProgressButton = styled(TouchableOpacity)<{
  context?: TSSProgressTrackerContext;
}>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  margin: ${({context}) =>
    context === 'swapCrypto' ? '0 15px 5px 15px' : '0'};
`;

const ProgressIndicator = styled.View<{status: TSSSigningStatus}>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({status, theme: {dark}}) =>
    status === 'complete'
      ? dark
        ? '#004D27'
        : Success25
      : dark
      ? '#2240C440'
      : LightBlue};
  align-items: center;
  justify-content: center;
  margin-right: 12px;
`;

const ProgressButtonText = styled(BaseText)`
  font-size: 16px;
  color: ${({theme}) => theme.colors.text};
`;

const ProgressBarContainer = styled.View`
  height: 3px;
  background-color: ${({theme: {dark}}) => (dark ? '#2A2A2A' : '#E5E5E5')};
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressBarFill = styled.View<{progress: number; complete?: boolean}>`
  height: 100%;
  width: ${({progress}) => progress}%;
  background-color: ${({complete, theme: {dark}}) =>
    complete ? (dark ? '#00A651' : '#2FCF6E') : Action};
  border-radius: 2px;
`;

const DetailsLabel = styled(BaseText)`
  font-size: 14px;
  color: ${({theme}) => theme.colors.description};
  margin-bottom: 8px;
`;

const ModalContainer = styled.View`
  padding: 20px;
  padding-bottom: 40px;
`;

const Header = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Title = styled(H4)`
  color: ${({theme}) => theme.colors.text};
`;

const StepsContainer = styled.View``;

const StepConnector = styled.View<{completed?: boolean; height?: number}>`
  width: 2px;
  height: ${({height}) => height || 20}px;
  margin-top: 0px;
  background-color: ${({theme: {dark}, completed}) =>
    completed ? (dark ? '#004D27' : Success25) : dark ? '#2A2A2A' : LightBlue};
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

const StepTime = styled(BaseText)`
  color: ${({theme}) => theme.colors.description};
  font-size: 12px;
  margin-left: auto;
`;

const CopayerList = styled.View`
  margin-top: 0px;
  margin-bottom: 0px;
`;

const CopayerRow = styled.View`
  flex-direction: row;
  align-items: center;
  padding: 4px 0;
  position: relative;
`;

const CopayerIndicator = styled.View<{signed: boolean}>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({signed, theme: {dark}}) =>
    signed ? (dark ? '#004D27' : Success25) : 'transparent'};
  align-items: center;
  justify-content: center;
  margin-right: 8px;
`;

const CopayerName = styled(BaseText)<{signed: boolean}>`
  color: ${({theme: {dark}, signed}) =>
    signed ? (dark ? White : Black) : dark ? White : SlateDark};
  font-size: 14px;
`;

const CopayerRail = styled.View`
  width: 20px;
  align-items: center;
  margin-right: 8px;
  position: relative;
`;

const CopayerConnector = styled.View<{signed: boolean}>`
  width: 2px;
  height: 28px;
  position: absolute;
  top: 20px;
  left: 5px;
  background-color: ${({theme: {dark}, signed}) =>
    signed ? (dark ? '#004D27' : Success25) : dark ? '#2A2A2A' : '#F5F5F5'};
`;

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

  const steps = [
    {
      title: t('Proposal Created'),
      subtitle: createdBy,
      time: date,
    },
    {
      title: t('Waiting for co-signers'),
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
    if (
      status !== 'complete' &&
      status !== 'broadcasting' &&
      status !== 'signature_generation'
    ) {
      setModalVisible(false);
    }
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

  useEffect(() => {
    if (!onCopayersInitialized || !txpCreatorId) return;
    if (!copayers.length) return;

    if (status === 'error') {
      const hasAnySigned = copayers.some(c => c.signed);
      if (hasAnySigned) {
        onCopayersInitialized(copayers.map(c => ({...c, signed: false})));
      }
      return;
    }

    const creatorShouldBeSigned = getStepStatus(0) === 'complete';
    if (!creatorShouldBeSigned) return;

    let changed = false;

    const nextCopayers = copayers.map(c => {
      if (c.id !== txpCreatorId) return c;
      if (c.signed) return c;

      changed = true;
      return {...c, signed: true};
    });

    if (changed) {
      onCopayersInitialized(nextCopayers);
    }
  }, [status, txpCreatorId, copayers, onCopayersInitialized]);

  return (
    <>
      {!hideTracker ? (
        <View style={{paddingBottom: 10}}>
          <ProgressButton
            activeOpacity={ActiveOpacity}
            onPress={() => setModalVisible(true)}
            context={context}>
            <ProgressIndicator status={status}>
              {status === 'complete' ? (
                <SuccessIcon width={20} height={16} />
              ) : (
                <ClockIcon width={28} height={28} />
              )}
            </ProgressIndicator>
            <View style={{flex: 1, marginRight: 12}}>
              <ProgressButtonText>{getButtonText()}</ProgressButtonText>
              <ProgressBarContainer style={{marginTop: 6}}>
                <ProgressBarFill
                  progress={getProgressPercentage()}
                  complete={status === 'complete'}
                />
              </ProgressBarContainer>
            </View>
            <ChevronDownSvg width={16} height={16} />
          </ProgressButton>
        </View>
      ) : (
        <></>
      )}

      <SheetModal
        isVisible={isModalVisible}
        onBackdropPress={handleClose}
        modalLibrary="bottom-sheet">
        <ModalContainer>
          <Header>
            <View style={{width: 24}} />
            <Title>{t('Transaction Progress')}</Title>
            <View style={{width: 24}} />
          </Header>

          <StepsContainer>
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(index);
              const isActive = stepStatus === 'active';
              const isComplete = stepStatus === 'complete';
              const showCopayers = step.showCopayers;
              const connectorHeight = showCopayers ? 35 * copayers.length : 25;

              return (
                <View key={index}>
                  <StepRow>
                    <StepRail>
                      <StepIndicator active={isActive} completed={isComplete}>
                        {isComplete ? (
                          <SuccessIcon width={20} height={16} />
                        ) : isActive && index === 2 ? (
                          <RefreshIcon width={24} height={24} />
                        ) : isActive ? (
                          <ClockIcon width={28} height={28} />
                        ) : (
                          <StepNumber>{index + 1}</StepNumber>
                        )}
                      </StepIndicator>
                      {index < steps.length - 1 && (
                        <StepConnector
                          height={connectorHeight}
                          completed={getStepStatus(index + 1) !== 'pending'}
                        />
                      )}
                    </StepRail>

                    <StepContent style={{paddingTop: index >= 2 ? 10 : 5}}>
                      <View
                        style={{flexDirection: 'row', alignItems: 'center'}}>
                        <StepTitle>{step.title}</StepTitle>
                        {step.time &&
                          status !== 'initializing' &&
                          status !== 'error' && (
                            <StepTime>
                              {GetAmTimeAgo(step.time.getTime())}
                            </StepTime>
                          )}
                      </View>
                      {step.subtitle && (
                        <StepSubtitle>{step.subtitle}</StepSubtitle>
                      )}

                      {showCopayers && (
                        <CopayerList style={{marginTop: 8}}>
                          {copayers.map((copayer, idx) => (
                            <CopayerRow key={copayer.id || idx}>
                              <CopayerIndicator signed={copayer.signed}>
                                {copayer.signed ? (
                                  <SuccessIcon width={12} height={12} />
                                ) : (
                                  <Loader size={16} spinning />
                                )}
                              </CopayerIndicator>
                              <CopayerName signed={copayer.signed}>
                                {copayer.name}
                              </CopayerName>
                            </CopayerRow>
                          ))}
                        </CopayerList>
                      )}
                    </StepContent>
                  </StepRow>
                </View>
              );
            })}
          </StepsContainer>
        </ModalContainer>
      </SheetModal>
    </>
  );
};

export default TSSProgressTracker;
