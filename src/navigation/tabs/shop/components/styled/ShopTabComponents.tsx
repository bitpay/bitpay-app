import {Theme} from '@react-navigation/native';
import styled, {css} from 'styled-components/native';
import BoxInput from '../../../../../components/form/BoxInput';
import {HEIGHT, WIDTH} from '../../../../../components/styled/Containers';
import {
  BaseText,
  H4,
  Link,
  Paragraph,
} from '../../../../../components/styled/Text';
import {
  Black,
  Cloud,
  Feather,
  LightBlack,
  NeutralSlate,
  Slate,
  Slate10,
  Slate30,
  SlateDark,
  White,
} from '../../../../../styles/colors';
import {TouchableOpacity} from 'react-native-gesture-handler';

export const horizontalPadding = 20;

export const getMastheadGradient = (theme: Theme) => {
  return theme.dark
    ? [theme.colors.background, '#151515']
    : ['rgba(245, 247, 248, 0)', '#F5F7F8'];
};

export const ListItemTouchableHighlight = styled.TouchableHighlight`
  padding-right: ${horizontalPadding}px;
`;

export const CategoryItemTouchableHighlight = styled(
  ListItemTouchableHighlight,
)`
  padding-left: ${horizontalPadding}px;
`;

export const ScreenContainer = styled.SafeAreaView`
  flex: 1;
`;

export const SectionContainer = styled.View`
  width: 100%;
  padding: 0 ${horizontalPadding}px;
`;

export const SectionSpacer = styled.View<{height?: number}>`
  height: ${({height}) => height || 30}px;
`;

export const SectionHeaderContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const SectionHeaderButton = styled(Link)`
  margin-top: 38px;
  margin-bottom: 12px;
  font-weight: 500;
`;

export const SectionHeader = styled(BaseText)`
  color: ${({theme}) => (theme.dark ? White : Black)};
  font-size: 18px;
  text-align: left;
  margin-bottom: 16px;
  margin-top: 40px;
  flex-grow: 1;
  font-weight: 500;
`;

export const SectionDivider = styled.View`
  align-self: center;
  border-bottom-color: ${({theme}) => (theme.dark ? LightBlack : Cloud)};
  border-bottom-width: 1px;
  margin: 20px ${horizontalPadding}px;
  margin-top: 40px;
  width: ${WIDTH - horizontalPadding * 2}px;
`;

export const SearchBox = styled(BoxInput)`
  width: ${WIDTH - horizontalPadding * 2}px;
  font-size: 16px;
  position: relative;
`;

export const SearchResults = styled.View`
  min-height: ${HEIGHT - 300}px;
`;

export const NoResultsImgContainer = styled.View`
  margin: 40px;
`;

export const NoResultsContainer = styled.View`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: ${HEIGHT - 300}px;
  padding-top: 20px;
`;

export const NoResultsHeader = styled(H4)`
  font-size: 17px;
`;

export const NavIconButtonContainer = styled(TouchableOpacity)`
  align-items: center;
  justify-content: center;
  background-color: ${({theme}) => (theme.dark ? '#252525' : NeutralSlate)};
  border-radius: 50px;
  height: 40px;
  width: 40px;
  overflow: hidden;
`;

export const BillOption = styled.View<{isLast?: boolean}>`
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 24px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({theme}) => (theme.dark ? SlateDark : Slate30)};
  margin-top: -30px;
  ${({isLast}) =>
    isLast
      ? 'border-bottom-width: 0; padding-bottom: 0; margin-bottom: -10px;'
      : ''}
`;

export interface HideableViewProps {
  show: boolean;
}
export const HideableView = styled.View<HideableViewProps>`
  ${({show}) =>
    css`
      display: ${show ? 'flex' : 'none'};
    `}
`;

export const Field = styled.View<{disabled?: boolean}>`
  background-color: ${({theme, disabled}) =>
    !disabled || theme.dark ? 'transparent' : Slate10};
  border-radius: 4px;
  border: 1px solid ${({theme}) => (theme.dark ? SlateDark : Slate30)};
  padding: 8px 14px;
  margin-top: 5px;
  min-height: 43px;
`;

export const FieldGroup = styled.View`
  margin-bottom: 10px;
`;

export const FieldLabel = styled(Paragraph)`
  color: ${({theme}) => (theme.dark ? Feather : LightBlack)};
  font-size: 14px;
  font-weight: 500;
  opacity: 0.75;
`;

export const FieldValue = styled(Paragraph)`
  color: ${({theme}) => (theme.dark ? Slate : SlateDark)};
`;
