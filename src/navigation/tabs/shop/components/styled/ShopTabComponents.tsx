import {Theme} from '@react-navigation/native';
import styled, {css} from 'styled-components/native';
import BoxInput from '../../../../../components/form/BoxInput';
import {HEIGHT, WIDTH} from '../../../../../components/styled/Containers';
import {BaseText, H4, Link} from '../../../../../components/styled/Text';
import {
  Black,
  Cloud,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
} from '../../../../../styles/colors';

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

export const NavIconButtonContainer = styled.TouchableOpacity`
  align-items: center;
  justify-content: center;
  transform: scale(1.1);
  background-color: ${({theme}) => (theme.dark ? '#252525' : NeutralSlate)};
  border-radius: 50px;
  height: 40px;
  width: 40px;
  overflow: hidden;
`;

export const Terms = styled(BaseText)`
  color: ${SlateDark};
  font-size: 12px;
  line-height: 15px;
  padding: 20px 10px 50px;
  text-align: justify;
  font-weight: 300;
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
