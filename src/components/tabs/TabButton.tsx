import styled from 'styled-components/native';

interface TabButtonProps {
  active?: boolean;
}

const TabButton = styled.Text<TabButtonProps>`
  border-bottom-width: 1px;
  border-color: ${({active, theme}) =>
    active ? theme.colors.link : 'transparent'};
  padding: 12px;
  color: ${({active, theme}) =>
    active ? theme.colors.link : theme.colors.text};
  font-weight: bold;
`;

export default TabButton;
