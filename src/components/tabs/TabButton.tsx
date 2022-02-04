import styled from 'styled-components/native';
import {Action, White} from '../../styles/colors';

interface TabButtonProps {
  active?: boolean;
}

const TabButton = styled.Text<TabButtonProps>`
  border-bottom-width: 1px;
  border-color: ${({active, theme}) =>
    active ? (theme.dark ? White : Action) : 'transparent'};
  padding: 12px;
  color: ${({active, theme}) =>
    active ? (theme.dark ? White : Action) : theme.colors.text};
  font-weight: bold;
`;

export default TabButton;
