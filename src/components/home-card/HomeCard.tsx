import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import {useTheme} from '../../contexts';
import {
  CharcoalBlack,
  LightBlack,
  Slate30,
  SlateDark,
  White,
} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {ActiveOpacity} from '../styled/Containers';
import Card from '../card/Card';
import Percentage from '../percentage/Percentage';
import {StyleSheet, View} from 'react-native';
import {BaseText, H3} from '../styled/Text';
import {shouldScale} from '../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import ArrowRightSvg from '../../navigation/tabs/home/components/ArrowRightSvg';
import ThresholdBadge from '../threshold-badge/ThresholdBadge';
import MultisigBadge from '../multisig-badge/MultisigBadge';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {StatusTag} from '../backup/BackupCards';
import {useBackupColors} from '../backup/colors';

interface BodyProps {
  title?: string;
  description?: string;
  value?: string;
  pillText?: string;
  needsBackup?: boolean;
  percentageDifference?: number | null;
  percentageSuffix?: string;
  hideKeyBalance: boolean;
  pendingTssSession?: boolean;
  tssMetadata?: {m: number; n: number};
  isMultisig?: boolean;
}

interface HomeCardProps {
  body: BodyProps;
  footer?: ReactNode;
  onCTAPress?: () => void;
  onCTAPressIn?: () => void;
  backgroundImg?: () => ReactElement;
}

const styles = StyleSheet.create({
  cardBodyHeader: {
    fontSize: 12,
    lineHeight: 15,
    marginTop: 15,
    marginBottom: 1,
  },
  cardBadges: {
    marginTop: 15,
  },
  cardBodyDesc: {
    fontWeight: '500',
    fontSize: 18,
    lineHeight: 25,
    marginTop: 15,
  },
  cardPrice: {
    lineHeight: 30,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardPill: {
    backgroundColor: '#cbf3e8',
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardPillText: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
    color: SlateDark,
  },
  cardContainer: {
    left: 12,
  },
  skeletonCard: {
    width: 170,
    height: 143,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    justifyContent: 'space-between',
  },
  needBackupText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 3,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    marginTop: 5,
  },
});

export const NeedBackupText: React.FC<
  React.ComponentProps<typeof BaseText>
> = ({style, ...rest}) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.needBackupText,
        {
          color: theme.dark ? White : SlateDark,
          borderColor: theme.dark ? SlateDark : Slate30,
        },
        style,
      ]}
      {...rest}
    />
  );
};

export const HOME_CARD_HEIGHT = 143;
export const HOME_CARD_WIDTH = 170;

const HomeCard: React.FC<HomeCardProps> = ({
  body,
  footer,
  onCTAPress,
  onCTAPressIn,
}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {
    title,
    value,
    percentageDifference,
    pillText,
    description,
    needsBackup,
    percentageSuffix,
    hideKeyBalance,
    pendingTssSession,
    tssMetadata,
    isMultisig,
  } = body;

  const BodyComp = (
    <View>
      {tssMetadata || isMultisig ? (
        <View style={styles.cardBadges}>
          {tssMetadata ? (
            <ThresholdBadge m={tssMetadata.m} n={tssMetadata.n} size={'card'} />
          ) : null}
          {isMultisig ? <MultisigBadge size={'card'} /> : null}
        </View>
      ) : null}
      {title && (
        <BaseText
          style={[
            styles.cardBodyHeader,
            {color: theme.dark ? Slate30 : SlateDark},
          ]}>
          {title}
        </BaseText>
      )}
      {needsBackup && !pendingTssSession ? (
        <StatusTag>{t('Backup Required')}</StatusTag>
      ) : !hideKeyBalance ? (
        <>
          {value && (
            <BaseText
              style={[
                styles.cardPrice,
                {
                  fontSize: shouldScale(value) ? 15 : 20,
                  color: theme.colors.text,
                },
              ]}>
              {value}
            </BaseText>
          )}
          {percentageDifference || percentageDifference === 0 ? (
            <Percentage
              percentageDifference={percentageDifference}
              suffix={percentageSuffix}
              fractionDigits={2}
            />
          ) : null}
          {pillText && (
            <View style={styles.cardPill}>
              <BaseText style={styles.cardPillText}>{pillText}</BaseText>
            </View>
          )}
        </>
      ) : (
        <H3>****</H3>
      )}
      {description && (
        <BaseText
          style={[
            styles.cardBodyDesc,
            {color: theme.dark ? White : SlateDark},
          ]}>
          {description}
        </BaseText>
      )}
    </View>
  );

  const _onPress = () => {
    if (onCTAPress) {
      Haptic('impactLight');
      onCTAPress();
    }
  };

  const DefaultFooter = <ArrowRightSvg />;

  const FooterComp = footer ?? DefaultFooter;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={ActiveOpacity}
      onPressIn={onCTAPressIn}
      onPress={_onPress}>
      <Card
        body={BodyComp}
        footer={FooterComp}
        style={{
          backgroundColor: theme.dark ? CharcoalBlack : White,
          borderColor: theme.dark ? LightBlack : Slate30,
          borderWidth: 1,
          minHeight: HOME_CARD_HEIGHT,
          width: HOME_CARD_WIDTH,
        }}
      />
    </TouchableOpacity>
  );
};

export const HomeCardSkeleton = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const colors = useBackupColors();
  const skeletonColors = {
    backgroundColor: theme.dark ? '#363636' : '#FAFAFB',
    highlightColor: theme.dark ? '#575757' : Slate30,
  };
  return (
    <View
      style={styles.cardContainer}
      accessible={true}
      accessibilityLabel={t('Loading your key')}>
      <View
        style={[
          styles.skeletonCard,
          {
            backgroundColor: colors.keyCardBg,
            borderColor: colors.borderCard,
          },
        ]}>
        <SkeletonPlaceholder {...skeletonColors}>
          <SkeletonPlaceholder.Item>
            <SkeletonPlaceholder.Item width={70} height={12} borderRadius={4} />
            <SkeletonPlaceholder.Item
              width={110}
              height={18}
              borderRadius={4}
              marginTop={10}
            />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
        <SkeletonPlaceholder {...skeletonColors}>
          <SkeletonPlaceholder.Item
            flexDirection="row"
            justifyContent="space-between">
            <SkeletonPlaceholder.Item
              width={64}
              height={30}
              borderRadius={15}
            />
            <SkeletonPlaceholder.Item
              width={30}
              height={30}
              borderRadius={15}
            />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    </View>
  );
};

export default HomeCard;
