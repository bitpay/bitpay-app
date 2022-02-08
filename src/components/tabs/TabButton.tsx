import styled from 'styled-components/native';
import {H5} from '../styled/Text';

interface TabButtonProps {
  active?: boolean;
}

const TabButton = styled(H5)<TabButtonProps>`
  border-bottom-width: 1px;
  border-color: ${({active, theme}) =>
    active ? theme.colors.link : 'transparent'};
  padding: 12px;
  color: ${({active, theme}) =>
    active ? theme.colors.link : theme.colors.text};
`;

export default TabButton;
