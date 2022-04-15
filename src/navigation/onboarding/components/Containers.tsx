import styled from 'styled-components/native';
import {HEIGHT} from '../../../components/styled/Containers';
import FastImage from 'react-native-fast-image';

export const OnboardingImage = styled(FastImage)<{
  widthPct?: number;
  heightPct?: number;
}>`
  height: ${({widthPct}) => HEIGHT * (widthPct ? widthPct : 0.3)}px;
  width: ${({heightPct}) => HEIGHT * (heightPct ? heightPct : 0.3)}px;
`;
