import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import Carousel, {ICarouselInstance} from 'react-native-reanimated-carousel';
import throttle from 'lodash.throttle';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import CloseModal from '../../../../assets/img/close-modal-icon.svg';
import ScheduleClockIcon from '../../../../assets/img/icon-schedule-clock.svg';
import ArchiveDownloadIcon from '../../../../assets/img/icon-archive-download.svg';
import {ActiveOpacity, WIDTH} from '../../../components/styled/Containers';
import {BaseText} from '../../../components/styled/Text';
import BaseModal from '../../../components/modal/base/BaseModal';
import {
  Action,
  LinkBlue,
  GhostWhite,
  CharcoalBlack,
  NeutralSlate,
  LightBlack,
  SlateDark,
  Slate30,
  LightBlue,
  Black,
  White,
} from '../../../styles/colors';
import {useAppDispatch} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';

export type TSSOnboardingFlow = 'create' | 'join';

interface TSSOnboardingModalProps {
  isVisible: boolean;
  flow: TSSOnboardingFlow;
  pageContext: string;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

interface TSSStep {
  titleLine1: string;
  titleLine2Prefix?: string;
  titleAccent: string;
  subheading: string;
  description?: string;
  renderExtra?: () => ReactElement;
  buttonLabel?: string;
}

const CARD_WIDTH = WIDTH - 32;
const CONTENT_WIDTH = CARD_WIDTH - 32;
const CAROUSEL_HEIGHT = 410;

const ModalBackdropContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ModalCard = styled.View`
  width: ${CARD_WIDTH}px;
  min-height: 540px;
  border-radius: 16px;
  padding: 16px;
  background-color: ${({theme: {dark}}) => (dark ? CharcoalBlack : GhostWhite)};
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: flex-end;
`;

const CloseButton = styled(TouchableOpacity)`
  width: 40px;
  height: 40px;
  border-radius: 100px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

const CardBody = styled.View`
  flex: 1;
  justify-content: space-between;
  width: 100%;
`;

const TopSection = styled.View`
  width: ${CONTENT_WIDTH}px;
`;

const TitleText = styled(BaseText)`
  font-size: 51px;
  line-height: 48px;
  font-weight: 400;
  letter-spacing: -0.34px;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 32px;
`;

const AccentText = styled(BaseText)`
  font-size: 51px;
  line-height: 48px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
`;

const Subheading = styled(BaseText)`
  font-size: 20px;
  line-height: 30px;
  font-weight: 600;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
`;

const Description = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-top: 8px;
`;

const InfoBox = styled.View`
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 16px;
  background-color: ${({theme: {dark}}) => (dark ? `${Action}40` : LightBlue)};
`;

const InfoBoxText = styled(BaseText)`
  font-size: 13px;
  line-height: 20px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const ImportantText = styled(BaseText)`
  font-size: 15px;
  line-height: 22px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const ImportantBoldSpan = styled(BaseText)`
  font-weight: 700;
  font-size: 15px;
  line-height: 22px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const NoteText = styled(InfoBoxText)``;

const NoteBoldSpan = styled(InfoBoxText)`
  font-weight: 700;
`;

const BulletRow = styled.View`
  flex-direction: row;
`;

const BulletDot = styled(InfoBoxText)`
  margin-right: 6px;
`;

const RuleRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
`;

const RuleText = styled(BaseText)`
  flex: 1;
  font-size: 16px;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const RuleBoldSpan = styled(BaseText)`
  font-weight: 700;
  font-size: 16px;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const FooterRow = styled.View`
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  margin-top: 16px;
`;

const PaginationText = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
`;

const NextButton = styled(TouchableOpacity)`
  height: 50px;
  min-width: 100px;
  padding: 0 16px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  background-color: ${Action};
`;

const NextButtonText = styled(BaseText)`
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: ${White};
  text-align: center;
`;

const TSSOnboardingModal: React.FC<TSSOnboardingModalProps> = ({
  isVisible,
  flow,
  pageContext,
  onAcknowledge,
  onDismiss,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const ruleIconColor = theme.dark ? LinkBlue : Action;
  const dispatch = useAppDispatch();
  const ref = useRef<ICarouselInstance>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const steps: TSSStep[] = useMemo(
    () => [
      {
        titleLine1: t('Meet your'),
        titleAccent: t('TSS wallet'),
        subheading: t('Shared wallet management.'),
        description: t(
          'This wallet protects your assets by dividing the private key into secure keyshares across multiple co-signers.',
        ),
        renderExtra: () => (
          <InfoBox>
            <InfoBoxText style={{marginBottom: 8}}>
              {t('Supported networks:')}
            </InfoBoxText>
            <BulletRow>
              <BulletDot>{'•'}</BulletDot>
              <InfoBoxText>{t('BTC, BCH, LTC, DOGE, XRP')}</InfoBoxText>
            </BulletRow>
            <BulletRow>
              <BulletDot>{'•'}</BulletDot>
              <InfoBoxText>{t('ETH & ERC-20 tokens')}</InfoBoxText>
            </BulletRow>
          </InfoBox>
        ),
      },
      {
        titleLine1: t('No single'),
        titleLine2Prefix: t('point of '),
        titleAccent: t('failure'),
        subheading: t('Uncompromising safety.'),
        description: t(
          'Because no single person holds a full key, there is no single point of failure. Even if one device is compromised, your funds stay incredibly safe.',
        ),
      },
      {
        titleLine1: t('Know the'),
        titleAccent: t('rules'),
        subheading: t('Timing and compatibility.'),
        renderExtra: () => (
          <>
            <RuleRow>
              <ScheduleClockIcon width={24} height={24} color={ruleIconColor} />
              <RuleText>
                <RuleBoldSpan>{t('Stay In Sync: ')}</RuleBoldSpan>
                {t(
                  'All co-signers must be online at the exact same time to create the wallet and sign transactions.',
                )}
              </RuleText>
            </RuleRow>
            <RuleRow>
              <ArchiveDownloadIcon
                width={24}
                height={24}
                color={ruleIconColor}
              />
              <RuleText>
                <RuleBoldSpan>{t('No External Imports: ')}</RuleBoldSpan>
                {t(
                  'This unique structure means this wallet cannot be imported into other crypto platforms.',
                )}
              </RuleText>
            </RuleRow>
          </>
        ),
      },
      {
        titleLine1: t('Protect your'),
        titleAccent: t('access'),
        subheading: t('You are in total control.'),
        description: t(
          'This wallet relies on a multi-approval setup (e.g., 2 of 3 co-signers). Because it is completely self-custodial, BitPay does not hold your keys or backups.',
        ),
        renderExtra: () => (
          <InfoBox>
            <ImportantText>
              <ImportantBoldSpan>{t('Important: ')}</ImportantBoldSpan>
              {t(
                'Please back up your wallet securely. If you lose your backup or your co-signers are unavailable, BitPay cannot recover your assets.',
              )}
            </ImportantText>
          </InfoBox>
        ),
      },
      {
        titleLine1: t('You’re using a'),
        titleAccent: t('beta feature'),
        subheading: t('Use with care.'),
        description: t(
          'TSS Wallet is currently in beta. You may experience bugs, unexpected behavior, or failed actions as we continue improving the feature.',
        ),
        renderExtra: () => (
          <InfoBox>
            <NoteText>
              <NoteBoldSpan>{t('Note: ')}</NoteBoldSpan>
              {t('Please report any issues you encounter.')}
            </NoteText>
          </InfoBox>
        ),
        buttonLabel: t('I understand & accept'),
      },
    ],
    [t, ruleIconColor],
  );

  useEffect(() => {
    if (isVisible) {
      setActiveSlideIndex(0);
      ref.current?.scrollTo({index: 0, animated: false});
      dispatch(
        Analytics.track('Viewed TSS Onboarding', {
          flow,
          context: pageContext,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const throttleOnActiveSlideChange = useMemo(
    () =>
      throttle((index: number) => {
        setActiveSlideIndex(Math.round(index));
      }, 300),
    [],
  );

  const handleDismiss = useCallback(() => {
    dispatch(
      Analytics.track('Dismissed TSS Onboarding', {
        flow,
        context: pageContext,
        step: activeSlideIndex + 1,
        totalSteps: steps.length,
      }),
    );
    onDismiss();
  }, [dispatch, flow, pageContext, onDismiss, activeSlideIndex, steps.length]);

  const handleAcknowledge = useCallback(() => {
    dispatch(
      Analytics.track('Acknowledged TSS Onboarding', {
        flow,
        context: pageContext,
      }),
    );
    onAcknowledge();
  }, [dispatch, flow, pageContext, onAcknowledge]);

  const isLastSlide = activeSlideIndex === steps.length - 1;
  const currentStep = steps[activeSlideIndex];

  return (
    <BaseModal
      id={'inAppMessage'}
      isVisible={isVisible}
      backdropOpacity={0.75}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      backdropTransitionOutTiming={0}
      hideModalContentWhileAnimating={true}
      useNativeDriverForBackdrop={true}
      useNativeDriver={true}
      style={{margin: 0}}
      onBackdropPress={handleDismiss}>
      <ModalBackdropContainer>
        <ModalCard>
          <HeaderRow>
            <CloseButton onPress={handleDismiss}>
              <CloseModal
                width={24}
                height={24}
                color={theme.dark ? 'white' : 'black'}
              />
            </CloseButton>
          </HeaderRow>
          <CardBody>
            <Carousel
              loop={false}
              vertical={false}
              width={CONTENT_WIDTH}
              height={CAROUSEL_HEIGHT}
              autoPlay={false}
              data={steps}
              pagingEnabled={true}
              snapEnabled={true}
              ref={ref}
              scrollAnimationDuration={600}
              onProgressChange={(_, index) => {
                if (Math.round(index) !== activeSlideIndex) {
                  throttleOnActiveSlideChange(index);
                }
              }}
              renderItem={({item}) => (
                <TopSection>
                  <TitleText>
                    {item.titleLine1}
                    {'\n'}
                    {item.titleLine2Prefix}
                    <AccentText>{item.titleAccent}</AccentText>
                  </TitleText>
                  <Subheading>{item.subheading}</Subheading>
                  {item.description ? (
                    <Description>{item.description}</Description>
                  ) : null}
                  {item.renderExtra ? item.renderExtra() : null}
                </TopSection>
              )}
            />
            <FooterRow>
              <PaginationText>
                {activeSlideIndex + 1}/{steps.length}
              </PaginationText>
              <NextButton
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  if (isLastSlide) {
                    handleAcknowledge();
                  } else {
                    ref.current?.next();
                  }
                }}>
                <NextButtonText>
                  {isLastSlide
                    ? currentStep.buttonLabel ?? t('I Understand')
                    : t('Next')}
                </NextButtonText>
              </NextButton>
            </FooterRow>
          </CardBody>
        </ModalCard>
      </ModalBackdropContainer>
    </BaseModal>
  );
};

export default TSSOnboardingModal;
