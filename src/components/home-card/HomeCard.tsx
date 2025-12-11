import * as React from 'react';
import {ReactElement, ReactNode} from 'react';
import styled, {useTheme} from 'styled-components/native';
import {LightBlack, Slate30, SlateDark, White} from '../../styles/colors';
import Haptic from '../haptic-feedback/haptic';
import {
  ActiveOpacity,
  CardGutter,
  Row,
  ScreenGutter,
} from '../styled/Containers';
import Card from '../card/Card';
import Percentage from '../percentage/Percentage';
import {View} from 'react-native';
import {BaseText, H3} from '../styled/Text';
import {shouldScale} from '../../utils/helper-methods';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import ArrowRightSvg from '../../navigation/tabs/home/components/ArrowRightSvg';

interface BodyProps {
  title?: string;
  description?: string;
  value?: string;
  pillText?: string;
  needsBackup?: boolean;
  percentageDifference?: number;
  hideKeyBalance: boolean;
}

interface HomeCardProps {
  body: BodyProps;
  footer?: ReactNode;
  onCTAPress?: () => void;
  backgroundImg?: () => ReactElement;
}

const CardBodyHeader = styled(BaseText)`
  font-size: 12px;
  line-height: 15px;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-top: ${CardGutter};
  margin-bottom: 1px;
`;

const CardBodyDesc = styled(BaseText)`
  font-weight: 500;
  font-size: 18px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin-top: ${CardGutter};
`;

const CardPrice = styled(BaseText)<{scale: boolean}>`
  font-size: ${({scale}) => (scale ? 15 : 20)}px;
  line-height: 30px;
  font-weight: bold;
  color: ${({theme}) => theme.colors.text};
  margin-bottom: 2px;
`;

const CardPill = styled.View`
  background-color: #cbf3e8;
  align-self: flex-start;
  border-radius: 7px;
  padding: 4px 8px;
`;

const CardPillText = styled(BaseText)`
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${SlateDark};
`;

const CardContainer = styled(TouchableOpacity)`
  left: ${ScreenGutter};
`;

export const NeedBackupText = styled(BaseText)`
  font-size: 12px;
  text-align: center;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  padding: 2px 4px;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  border-radius: 3px;
  position: absolute;
  margin-top: 5px;
`;

export const HOME_CARD_HEIGHT = 143;
export const HOME_CARD_WIDTH = 170;

const HomeCard: React.FC<HomeCardProps> = ({body, footer, onCTAPress}) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const {
    title,
    value,
    percentageDifference,
    pillText,
    description,
    needsBackup,
    hideKeyBalance,
  } = body;

  const BodyComp = (
    <View>
      {title && <CardBodyHeader>{title}</CardBodyHeader>}
      {needsBackup ? (
        <Row>
          <NeedBackupText>{t('Needs Backup')}</NeedBackupText>
        </Row>
      ) : !hideKeyBalance ? (
        <>
          {value && <CardPrice scale={shouldScale(value)}>{value}</CardPrice>}
          {percentageDifference ? (
            <Percentage percentageDifference={percentageDifference} />
          ) : null}
          {pillText && (
            <CardPill>
              <CardPillText>{pillText}</CardPillText>
            </CardPill>
          )}
        </>
      ) : (
        <H3>****</H3>
      )}
      {description && <CardBodyDesc>{description}</CardBodyDesc>}
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
    <CardContainer activeOpacity={ActiveOpacity} onPress={_onPress}>
      <Card
        body={BodyComp}
        footer={FooterComp}
        style={{
          backgroundColor: theme.dark ? '#111' : White,
          borderColor: theme.dark ? LightBlack : Slate30,
          borderWidth: 1,
          height: HOME_CARD_HEIGHT,
          width: HOME_CARD_WIDTH,
        }}
      />
    </CardContainer>
  );
};

export default HomeCard;
