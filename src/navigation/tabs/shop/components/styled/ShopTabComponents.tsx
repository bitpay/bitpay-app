import styled, {css} from 'styled-components/native';
import BoxInput from '../../../../../components/form/BoxInput';
import {HEIGHT, WIDTH} from '../../../../../components/styled/Containers';
import {BaseText, H4} from '../../../../../components/styled/Text';
import {
  Action,
  Cloud,
  NeutralSlate,
  SlateDark,
} from '../../../../../styles/colors';

export const horizontalPadding = 20;

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

export const SectionSpacer = styled.View`
  height: 30px;
`;

export const SectionHeaderContainer = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const SectionHeaderButton = styled(BaseText)`
  margin-top: 38px;
  margin-bottom: 16px;
  color: ${Action};
  font-weight: 500;
`;

export const SectionHeader = styled(BaseText)`
  color: ${SlateDark};
  font-size: 14px;
  text-align: left;
  margin-bottom: 16px;
  margin-top: 40px;
  flex-grow: 1;
`;

export const SectionDivider = styled.View`
  border-bottom-color: ${Cloud};
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

export const NavIconButtonContainer = styled.View`
  align-items: center;
  justify-content: center;
  background-color: ${NeutralSlate};
  border-radius: 50px;
  height: 45px;
  width: 45px;
  margin-top: 5px;
  overflow: hidden;
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
