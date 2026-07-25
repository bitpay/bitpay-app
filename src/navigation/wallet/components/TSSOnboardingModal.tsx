import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {StyleSheet, View} from 'react-native';
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
import {useTheme} from '../../../contexts';

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

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  modalBackdropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: CARD_WIDTH,
    minHeight: 540,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  topSection: {
    width: CONTENT_WIDTH,
  },
  titleText: {
    fontSize: 51,
    lineHeight: 48,
    fontWeight: '400',
    letterSpacing: -0.34,
    marginBottom: 32,
  },
  accentText: {
    fontSize: 51,
    lineHeight: 48,
    fontWeight: '400',
  },
  subheading: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    marginTop: 8,
  },
  infoBox: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  supportedNetworksLabel: {
    marginBottom: 8,
  },
  importantText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  importantBoldSpan: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
  },
  noteBoldSpan: {
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
  },
  bulletDot: {
    marginRight: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  ruleBoldSpan: {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  paginationText: {
    fontSize: 16,
    lineHeight: 24,
  },
  nextButton: {
    height: 50,
    minWidth: 100,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Action,
  },
  nextButtonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
    color: White,
    textAlign: 'center',
  },
});

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
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.dark ? `${Action}40` : LightBlue,
              },
            ]}>
            <BaseText
              style={[
                styles.infoBoxText,
                styles.supportedNetworksLabel,
                {color: theme.dark ? Slate30 : SlateDark},
              ]}>
              {t('Supported networks:')}
            </BaseText>
            <View style={styles.bulletRow}>
              <BaseText
                style={[
                  styles.infoBoxText,
                  styles.bulletDot,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {'•'}
              </BaseText>
              <BaseText
                style={[
                  styles.infoBoxText,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {t('BTC, BCH, LTC, DOGE, XRP')}
              </BaseText>
            </View>
            <View style={styles.bulletRow}>
              <BaseText
                style={[
                  styles.infoBoxText,
                  styles.bulletDot,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {'•'}
              </BaseText>
              <BaseText
                style={[
                  styles.infoBoxText,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {t('ETH & ERC-20 tokens')}
              </BaseText>
            </View>
          </View>
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
            <View style={styles.ruleRow}>
              <ScheduleClockIcon width={24} height={24} color={ruleIconColor} />
              <BaseText
                style={[
                  styles.ruleText,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                <BaseText
                  style={[
                    styles.ruleBoldSpan,
                    {color: theme.dark ? Slate30 : SlateDark},
                  ]}>
                  {t('Stay In Sync: ')}
                </BaseText>
                {t(
                  'All co-signers must be online at the exact same time to create the wallet and sign transactions.',
                )}
              </BaseText>
            </View>
            <View style={styles.ruleRow}>
              <ArchiveDownloadIcon
                width={24}
                height={24}
                color={ruleIconColor}
              />
              <BaseText
                style={[
                  styles.ruleText,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                <BaseText
                  style={[
                    styles.ruleBoldSpan,
                    {color: theme.dark ? Slate30 : SlateDark},
                  ]}>
                  {t('No External Imports: ')}
                </BaseText>
                {t(
                  'This unique structure means this wallet cannot be imported into other crypto platforms.',
                )}
              </BaseText>
            </View>
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
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.dark ? `${Action}40` : LightBlue,
              },
            ]}>
            <BaseText
              style={[
                styles.importantText,
                {color: theme.dark ? Slate30 : SlateDark},
              ]}>
              <BaseText
                style={[
                  styles.importantBoldSpan,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {t('Important: ')}
              </BaseText>
              {t(
                'Please back up your wallet securely. If you lose your backup or your co-signers are unavailable, BitPay cannot recover your assets.',
              )}
            </BaseText>
          </View>
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
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: theme.dark ? `${Action}40` : LightBlue,
              },
            ]}>
            <BaseText
              style={[
                styles.infoBoxText,
                {color: theme.dark ? Slate30 : SlateDark},
              ]}>
              <BaseText
                style={[
                  styles.infoBoxText,
                  styles.noteBoldSpan,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {t('Note: ')}
              </BaseText>
              {t('Please report any issues you encounter.')}
            </BaseText>
          </View>
        ),
        buttonLabel: t('I understand & accept'),
      },
    ],
    [t, ruleIconColor, theme.dark],
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
      style={styles.modal}
      onBackdropPress={handleDismiss}>
      <View style={styles.modalBackdropContainer}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.dark ? CharcoalBlack : GhostWhite,
            },
          ]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: theme.dark ? LightBlack : NeutralSlate,
                },
              ]}
              onPress={handleDismiss}>
              <CloseModal
                width={24}
                height={24}
                color={theme.dark ? 'white' : 'black'}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
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
                <View style={styles.topSection}>
                  <BaseText
                    style={[
                      styles.titleText,
                      {color: theme.dark ? White : Black},
                    ]}>
                    {item.titleLine1}
                    {'\n'}
                    {item.titleLine2Prefix}
                    <BaseText
                      style={[
                        styles.accentText,
                        {color: theme.dark ? LinkBlue : Action},
                      ]}>
                      {item.titleAccent}
                    </BaseText>
                  </BaseText>
                  <BaseText
                    style={[
                      styles.subheading,
                      {color: theme.dark ? White : Black},
                    ]}>
                    {item.subheading}
                  </BaseText>
                  {item.description ? (
                    <BaseText
                      style={[
                        styles.description,
                        {color: theme.dark ? Slate30 : SlateDark},
                      ]}>
                      {item.description}
                    </BaseText>
                  ) : null}
                  {item.renderExtra ? item.renderExtra() : null}
                </View>
              )}
            />
            <View style={styles.footerRow}>
              <BaseText
                style={[
                  styles.paginationText,
                  {color: theme.dark ? Slate30 : SlateDark},
                ]}>
                {activeSlideIndex + 1}/{steps.length}
              </BaseText>
              <TouchableOpacity
                style={styles.nextButton}
                activeOpacity={ActiveOpacity}
                onPress={() => {
                  if (isLastSlide) {
                    handleAcknowledge();
                  } else {
                    ref.current?.next();
                  }
                }}>
                <BaseText style={styles.nextButtonText}>
                  {isLastSlide
                    ? currentStep.buttonLabel ?? t('I Understand')
                    : t('Next')}
                </BaseText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </BaseModal>
  );
};

export default TSSOnboardingModal;
