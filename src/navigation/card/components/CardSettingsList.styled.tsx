import styled, {css} from 'styled-components/native';
import {H4} from '../../../components/styled/Text';
import {ScreenGutter} from '../../../components/styled/Containers';

export const CategoryRow = styled.View`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  min-height: 58px;
`;

export const CategoryHeading = styled(H4)`
  font-weight: 700;
  margin-top: 25px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-height: 58px;
`;

interface SettingsIconProps {
  prefix?: boolean;
  suffix?: boolean;
}

export const SettingsIconContainer = styled.View<SettingsIconProps>`
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
