import React from 'react';
import {Dimensions, Text, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import styled, {css} from 'styled-components/native';
import {TextInput} from 'react-native';
import {
  Feather,
  LightBlack,
  LightBlue,
  NeutralSlate,
  SlateDark,
  White,
  Slate,
  NotificationPrimary,
  Action,
  LuckySevens,
  Slate30,
  Black,
  Success25,
  LinkBlue,
  Midnight,
  Caution,
} from '../../styles/colors';
import {BaseText} from './Text';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
export {ActiveOpacity} from '@components/base/TouchableOpacity';

export const {height: HEIGHT, width: WIDTH} = Dimensions.get('window');
export const isNotMobile = HEIGHT / WIDTH < 1.6;
export const isNarrowHeight = HEIGHT < 700;
export const CTA_RESERVED = 104;

export const ScreenGutter = '12px';
// Nav
export const HeaderRightContainer = styled.View`
  height: 40px;
`;

export const ImageContainer = styled.View<{justifyContent?: string}>`
  margin: 10px 0;
  display: flex;
  justify-content: ${({justifyContent}) => justifyContent || 'center'};
`;

export const HeaderTitleContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
`;

export const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

export const TitleContainer = styled.View`
  width: ${WIDTH * 0.75}px;
`;

export const TextContainer = styled.View`
  margin-top: 10px;
  padding: 10px;
  width: ${WIDTH * 0.9}px;
`;

export const SubTextContainer = styled.View`
  width: ${WIDTH * 0.8}px;
  margin-top: 10px;
`;

export const CtaContainer = styled.View`
  padding: 10px ${ScreenGutter};
  align-self: stretch;
  flex-direction: column;
  margin-top: 30px;
`;

const CtaContainerAbsoluteBase = styled.View<{background?: boolean}>`
  padding: 15px;
  position: absolute;
  padding-bottom: 10px;
  bottom: 0;
  left: 0;
  right: 0;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  ${({background}) =>
    background &&
    css`
      background: ${({theme}) => theme.colors.background};
    `};
`;

export const CtaContainerAbsolute = React.forwardRef<
  React.ElementRef<typeof CtaContainerAbsoluteBase>,
  React.ComponentProps<typeof CtaContainerAbsoluteBase>
>((props, ref) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'ios' ? insets.bottom : 10;
  const {style, ...rest} = props;
  return (
    <CtaContainerAbsoluteBase
      ref={ref}
      {...rest}
      style={[{paddingBottom}, style]}
    />
  );
});

export const Br: React.FC = () => <Text />;

export const Hr = styled.View`
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : '#ebecee')};
  border-bottom-width: 1px;
`;

export const Column = styled.View`
  flex: 1;
  flex-direction: column;
`;

export const Row = styled.View`
  flex: 1;
  flex-direction: row;
`;

// LIST
export const ListContainer = styled.View`
  flex: 1;
`;

interface RowContainerProps {
  isLast?: boolean;
  noBorder?: boolean;
  isDisabled?: boolean;
}

export const RowContainer = styled(TouchableOpacity)<RowContainerProps>`
  flex-direction: row;
  align-items: center;
  padding: 10px 4px;
  margin: 0 6px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : LightBlue)};
  border-bottom-width: ${({isLast, noBorder}) =>
    isLast || noBorder ? 0 : 1}px;
  opacity: ${({isDisabled}) => (isDisabled ? 0.5 : 1)};
`;

export const RowContainerWithoutBorders = styled(
  TouchableOpacity,
)<RowContainerProps>`
  flex-direction: row;
  align-items: center;
  padding: 10px 0px;
`;

export const RowContainerWithoutFeedback = styled.View<RowContainerProps>`
  flex-direction: row;
  align-items: center;
  padding: 10px 4px;
  margin: 0 10px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? LightBlack : LightBlue)};
  border-bottom-width: ${({isLast}) => (isLast ? 0 : 1)}px;
`;

export const CurrencyColumn = styled(Column)`
  margin-left: 8px;
  gap: 2px;
`;

export const CurrencyImageContainer = styled.View`
  height: 50px;
  width: 50px;
  display: flex;
  justify-content: center;
  align-self: center;
  border-radius: 8px;
  margin-right: 3px;
`;

// Card
export const CardGutter = '15px';

export const CardContainer = styled.View`
  background: ${({theme}) => (theme.dark ? LightBlack : White)};
  border-radius: 12px;
  overflow: hidden;
`;

export interface SheetParams {
  placement?: 'top' | 'bottom';
  paddingHorizontal?: number;
}

export const SheetContainer = styled.View<SheetParams>`
  padding: 30px ${({paddingHorizontal}) =>
    paddingHorizontal === 0 ? 0 : 30}px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : White)};
  justify-content: center;
  align-content: center;
  border-${({placement}: SheetParams) =>
    placement === 'top' ? 'bottom' : 'top'}-left-radius: 17px;
  border-${({placement}: SheetParams) =>
    placement === 'top' ? 'bottom' : 'top'}-right-radius: 17px;
  max-height: ${HEIGHT - 100}px;
`;

// Settings List
export const Setting = styled(TouchableOpacity)`
  align-items: center;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 58px;
  padding-left: 15px;
  padding-right: 15px;
`;

export const SettingTitle = styled(BaseText)`
  color: ${({theme}) => theme.colors.text};
  flex-grow: 1;
  flex-shrink: 1;
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
  margin-right: 5px;
`;

export const SettingDescription = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
`;

interface SettingIconProps {
  prefix?: boolean;
  suffix?: boolean;
}

export const SettingIcon = styled.View<SettingIconProps>`
  ${({prefix = false}) =>
    prefix &&
    css`
      margin-right: ${ScreenGutter};
    `}
  ${({suffix = false}) =>
    suffix &&
    css`
      margin-left: ${ScreenGutter};
    `}
`;

export const SettingView = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 58px;
`;

export const ActionContainer = styled.View`
  margin: 5px 0;
`;

// Info
export const Info = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : '#f8f9fe')};
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
`;

export const InfoTriangle = styled.View`
  width: 12px;
  height: 12px;
  position: absolute;
  top: -12px;
  left: 20px;
  border-left-width: 12px;
  border-left-color: transparent;
  border-right-width: 12px;
  border-right-color: transparent;
  border-bottom-width: 12px;
  border-bottom-color: ${({theme: {dark}}) => (dark ? SlateDark : '#f8f9fe')};
`;

export const AdvancedOptionsContainer = styled.View`
  background-color: ${({theme}) => (theme.dark ? LightBlack : Feather)};
  border-radius: 6px;
  margin-bottom: 20px;
  margin-top: 10px;
`;

export const AdvancedOptionsButton = styled(TouchableOpacity)`
  height: 60px;
  background-color: ${({theme}) => (theme.dark ? LightBlack : Feather)};
  padding: 18px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border-radius: 6px;
`;

export const AdvancedOptionsButtonText = styled(BaseText)`
  font-size: 16px;
  line-height: 25px;
  color: ${({theme: {dark}}) => (dark ? White : NotificationPrimary)};
`;

export const AdvancedOptions = styled.View`
  border-style: solid;
  border-top-width: 1px;
  border-top-color: ${({theme}) => (theme.dark ? SlateDark : Slate30)};
`;

const Gutter = '10px';
export const ImportContainer = styled.View`
  padding: ${Gutter} 0;
`;

export const ImportTextInput = styled.TextInput`
  height: 80px;
  color: ${({theme}) => theme.colors.text};
  background: ${({theme}) => theme.colors.background};
  border: 0.75px solid ${Slate};
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  text-align-vertical: top;
  padding: 5px;
  font-size: 16px;
`;

export const InfoImageContainer = styled.View<{infoMargin: string}>`
  margin: ${({infoMargin}) => infoMargin};
`;

export const ScanContainer = styled(TouchableOpacity)`
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
`;

export const HeaderContainer = styled.View`
  padding: 20px 0px 10px 0px;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

// creation and add wallet
export const OptionContainer = styled.SafeAreaView`
  flex: 1;
`;

export const OptionListContainer = styled.View`
  flex: 1;
  padding: 0 ${ScreenGutter};
  margin-top: 30px;
`;

export const OptionList = styled(TouchableOpacity)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  height: auto;
  border-radius: 12px;
  margin-bottom: ${ScreenGutter};
  flex-direction: row;
  overflow: hidden;
`;

export const OptionInfoContainer = styled.View`
  padding: 20px;
  justify-content: center;
  flex: 1;
`;

// Search

export const SearchContainer = styled.View`
  flex-direction: row;
  border: 1px solid #9ba3ae;
  align-items: center;
  border-top-right-radius: 4px;
  border-top-left-radius: 4px;
  padding: 4px 0;
  margin-bottom: 20px;
`;

export const SearchInput = styled.TextInput`
  flex: 1;
  padding: 0 10px;
  border-right-width: 1px;
  border-right-color: ${({theme: {dark}}) => (dark ? '#45484E' : LightBlue)};
  height: 32px;
  color: ${({theme}) => theme.colors.text};
  background-color: transparent;
`;

// Search Round
export const SearchRoundContainer = styled.View`
  flex-direction: row;
  display: flex;
  justify-content: space-between;
  border: 1px solid ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  border-radius: 100px;
  align-items: center;
  height: 50px;
`;

export const SearchRoundInput = styled.TextInput`
  flex: 1;
  color: ${({theme: {dark}}) => (dark ? Slate : SlateDark)};
  background-color: transparent;
  font-size: 16px;
  font-weight: 400;
`;

// Hidden label

export const HiddenContainer = styled.View`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  padding: 5px 10px;
  border-radius: 40px;
`;

// Copy to Clipboard

export const CopyToClipboardContainer = styled(TouchableOpacity)`
  border: 1px solid #9ba3ae;
  border-radius: 4px;
  padding: 0 10px;
  height: 55px;
  align-items: center;
  flex-direction: row;
`;

export const CopyImgContainer = styled.View`
  border-right-color: ${({theme: {dark}}) => (dark ? '#46494E' : LightBlue)};
  border-right-width: 1px;
  padding-right: 10px;
  height: 25px;
  justify-content: center;
`;

// Search box no result

export const NoResultsContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: ${HEIGHT - 300}px;
  padding: 20px 40px;
`;

export const NoResultsImgContainer = styled.View`
  padding-bottom: 40px;
`;

export const NoResultsDescription = styled(BaseText)`
  font-size: 16px;
`;

export const ProposalBadgeContainer = styled(TouchableOpacity)`
  background: ${Action};
  border-radius: 10px;
  height: 30px;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const BadgeContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({theme: {dark}}) => (dark ? LuckySevens : Slate30)};
  padding: 4px;
  border-radius: 2.4px;
  gap: 4px;
  height: 22px;
`;

export const BadgeContainerTouchable = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({theme: {dark}}) => (dark ? LuckySevens : Slate30)};
  padding: 4px;
  border-radius: 2.4px;
  gap: 4px;
  height: 20px;
`;

export const EmptyListContainer = styled.View`
  justify-content: space-between;
  align-items: center;
  margin-top: 50px;
`;

export const ChevronContainerTouchable = styled(TouchableOpacity)`
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? SlateDark : NeutralSlate)};
  margin-left: 2px;
  height: 20px;
  width: 20px;
`;

export const ChevronContainer = styled.View`
  border-radius: 50px;
  align-items: center;
  justify-content: center;
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  margin-left: 2px;
  height: 20px;
  width: 20px;
`;

export const AccountChainsContainer = styled(TouchableOpacity)<{
  padding?: string;
  maxWidth?: string;
}>`
  flex-direction: row;
  flex-shrink: 1;
  align-items: center;
  gap: 10px;
  border-radius: 50px;
  padding: ${({padding}) => padding ?? '5px 10px'};
  max-width: ${({maxWidth}) => (maxWidth ? `${maxWidth}` : '250px')};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
`;

interface SellTxIconProps {
  height?: number;
  width?: number;
}

export const SellTxIcon = styled.View<SellTxIconProps>`
  ${({height}) =>
    css`
      height: ${height ?? '44px'};
    `}
  ${({width}) =>
    css`
      width: ${width ?? '44px'};
    `}
  position: relative;
`;

export const SellTxIconBadge = styled.View`
  position: absolute;
  right: 0px;
  bottom: 0px;
`;

export const CloseButtonContainer = styled(TouchableOpacity)`
  margin: auto;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const ArchaxBannerContainer = styled.View<{
  inset?: any;
  isSmallScreen?: boolean;
}>`
  background: ${({theme}) => (theme.dark ? '#a25718' : '#ffedc9')};
  overflow: hidden;
  margin-top: ${({inset}) => inset?.top ?? 0}px;
  padding: ${({isSmallScreen}) => (isSmallScreen ? '8px' : '16px')};
`;

export const TSSQRSectionContainer = styled.View<{
  hideBorder?: boolean;
  fullWidth?: boolean;
}>`
  border-radius: 12px;
  border-width: ${({hideBorder}) => (hideBorder ? 0 : 1)}px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
  height: 390px;
  align-items: ${({fullWidth}) => (fullWidth ? 'stretch' : 'center')};
`;

export const TSSQRContainer = styled.View`
  align-items: center;
  justify-content: center;
  padding: 32px;
  background-color: ${White};
  border-radius: 12px;
  margin: 16px;
`;

export const TSSShareContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-top: 16px;
  padding-bottom: 16px;
  border-top-width: 1px;
  border-top-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

export const TSSShareButtonText = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? LinkBlue : Action)};
  margin-left: 8px;
`;

export const TSSStepsSection = styled.View`
  padding: 24px ${ScreenGutter};
`;

export const TSSStepsContainer = styled.View`
  padding: 16px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? SlateDark : Slate30)};
`;

export const TSSStepRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
`;

export const TSSStepRowWithButton = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

export const TSSStepContentWithButton = styled.View`
  flex: 1;
  padding-bottom: 20px;
  padding-right: 8px;
`;

export const TSSStepRail = styled.View`
  width: 40px;
  align-items: center;
  margin-right: 12px;
`;

export const TSSStepIndicator = styled.View<{
  active?: boolean;
  completed?: boolean;
}>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: ${({theme: {dark}, active, completed}) =>
    active
      ? dark
        ? '#2240C440'
        : LightBlue
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

export const TSSStepConnector = styled.View<{completed?: boolean}>`
  width: 2px;
  flex-grow: 1;
  margin-top: 0px;
  background-color: ${({theme: {dark}, completed}) =>
    completed ? (dark ? '#004D27' : Success25) : dark ? '#2A2A2A' : '#F5F5F5'};
`;

export const TSSStepContent = styled.View`
  flex: 1;
  padding-bottom: 20px;
`;

export const TSSContinuePillButton = styled.TouchableOpacity`
  padding: 8px 16px;
  border-radius: 50px;
  background-color: ${({theme: {dark}}) => (dark ? Action : Action)};
  align-self: flex-start;
  margin-top: 2px;
  gap: 8px;
`;

export const TSSContinuePillText = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: ${White};
`;

export const TSSInputWrapper = styled.View`
  flex-direction: row;
  align-items: center;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${({theme: {dark}}) => (dark ? NeutralSlate : Black)};
  padding: 12px;
  margin-bottom: 16px;
`;

export const TSSStyledInput = styled(TextInput)`
  flex: 1;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  padding: 0;
`;

export const TSSErrorText = styled(BaseText)`
  color: ${Caution};
  font-size: 14px;
  margin-bottom: 12px;
`;

export const TSSStepsSectionTitle = styled(BaseText)`
  font-size: 20px;
  font-weight: 600;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-bottom: 12px;
  line-height: 30px;
`;

export const TSSStepNumber = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  font-size: 16px;
  font-weight: 400;
`;

export const TSSStepTitle = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  line-height: 24px;
`;

export const TSSStepSubtitle = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  line-height: 20px;
`;

export const TSSStatusText = styled(BaseText)`
  font-size: 16px;
  font-weight: 500;
  color: ${({theme: {dark}}) => (dark ? White : Black)};
  margin-top: 10px;
  line-height: 24px;
`;

export const TSSStatusSubText = styled(BaseText)`
  font-size: 13px;
  font-weight: 400;
  color: ${({theme: {dark}}) => (dark ? Slate30 : SlateDark)};
  margin-top: 4px;
  line-height: 20px;
`;
